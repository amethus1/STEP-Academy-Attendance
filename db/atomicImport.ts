// All-or-nothing replacement of the school's data from an import or backup.
//
// Why this is shaped the way it is: the Tauri SQL plugin hands every
// `execute` call to whichever connection in its pool is free, so a
// transaction sent as separate BEGIN / ... / COMMIT calls is not guaranteed to
// run on one connection. A single `execute` always does. The import therefore
// happens in three phases:
//
//   1. Stage  — rows go into `_import_*` copies of the live tables. Failures
//               here touch nothing the user can see.
//   2. Check  — the staged data is validated, so the common problems are
//               reported in plain language before anything is replaced.
//   3. Swap   — one multi-statement `execute` deletes the live rows and copies
//               the staged ones in. Every failure path inside it rolls the
//               whole transaction back by itself (INSERT OR ROLLBACK, and a
//               trigger that raises ROLLBACK on broken references), so a failed
//               swap never leaves a half-empty database or a dangling
//               transaction on a pooled connection.

import type { DBStudent, DBEnrollment, DBAttendance, DBHoliday, DBSchoolYear, DBSummerSession, DBSummerSessionStudent } from './types';

/** The query surface needed; the plugin's Database satisfies it structurally. */
export interface SqlExecutor {
    execute(query: string, bindValues?: unknown[]): Promise<unknown>;
    select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}

export interface ImportPayload {
    students: DBStudent[];
    enrollments: DBEnrollment[];
    attendance: DBAttendance[];
    /** Omitted by some older export files; existing holidays are then kept. */
    holidays?: DBHoliday[];
    /** Omitted by older export files; existing school years are then kept. */
    schoolYears?: DBSchoolYear[];
    /**
     * Omitted by files from before summer sessions existed; existing sessions
     * are then kept, and students who are in the file stay on them.
     */
    summerSessions?: DBSummerSession[];
    summerSessionStudents?: DBSummerSessionStudent[];
    settings?: Record<string, unknown>;
}

export interface ImportProblem {
    message: string;
    count: number;
}

/** Thrown when the staged data fails validation. Live data is untouched. */
export class ImportValidationError extends Error {
    constructor(public readonly problems: ImportProblem[]) {
        super(
            'The file was not imported, and your existing data has not been changed. ' +
            problems.map(p => `${p.message} (${p.count})`).join('; ') + '.'
        );
        this.name = 'ImportValidationError';
    }
}

/**
 * A user-facing sentence for a failed import or restore. Because the import is
 * all-or-nothing, every failure leaves the existing data as it was, and the
 * message says so.
 */
export const describeImportFailure = (error: unknown): string => {
    if (error instanceof ImportValidationError) return error.message;

    const detail = error instanceof Error ? error.message : String(error);
    const unchanged = 'Your existing data has not been changed.';

    if (/database is locked|code: 5/i.test(detail)) {
        return `Import failed because the database was busy. ${unchanged} Close and reopen the app, then try again.`;
    }
    if (error instanceof SyntaxError || /JSON/.test(detail)) {
        return `Import failed: the file is not a valid backup or export (it could not be read as JSON). ${unchanged}`;
    }
    if (/safety copy/i.test(detail)) return detail;
    return `Import failed: ${detail}. ${unchanged}`;
};

// Kept under SQLite's historical 999-variable limit.
const MAX_PARAMS_PER_STATEMENT = 900;

const TABLES = [
    'students', 'enrollments', 'attendance', 'holidays', 'school_years',
    'summer_sessions', 'summer_session_students', 'app_settings'
] as const;
type Table = typeof TABLES[number];

const staged = (table: Table) => `_import_${table}`;

const GUARD_TABLE = '_import_guard';

/** Column order matches the live tables, which the swap relies on. */
const COLUMNS: Record<Table, string[]> = {
    students: [
        'id', 'student_number', 'first_name', 'last_name', 'dob', 'gender',
        'guardian_name', 'guardian_phone', 'guardian_email',
        'emergency_contact_name', 'emergency_contact_phone', 'photo_url', 'custom_fields'
    ],
    enrollments: [
        'id', 'student_id', 'school_year', 'start_date', 'end_date', 'grade_level', 'campus',
        'status', 'sped_504', 'drg_offense', 'days_assigned', 'credit_days', 'comments'
    ],
    attendance: ['id', 'student_id', 'enrollment_id', 'date', 'presence', 'comment'],
    holidays: ['date', 'name', 'school_year'],
    school_years: ['id', 'name', 'start_date', 'end_date'],
    summer_sessions: ['id', 'name', 'start_date', 'end_date'],
    summer_session_students: ['session_id', 'student_id'],
    app_settings: ['key', 'value', 'updated_at']
};

const rowValues = (table: Table, payload: ImportPayload, now: string): unknown[][] => {
    switch (table) {
        case 'students':
            return payload.students.map(s => [
                s.id, s.student_number ?? null, s.first_name, s.last_name, s.dob ?? null, s.gender ?? null,
                s.guardian_name ?? null, s.guardian_phone ?? null, s.guardian_email ?? null,
                s.emergency_contact_name ?? null, s.emergency_contact_phone ?? null,
                s.photo_url ?? null, s.custom_fields ?? null
            ]);
        case 'enrollments':
            return payload.enrollments.map(e => [
                e.id, e.student_id, e.school_year, e.start_date, e.end_date ?? null, e.grade_level,
                e.campus ?? null, e.status, e.sped_504 ?? null, e.drg_offense ?? null,
                e.days_assigned ?? 45, e.credit_days ?? 0, e.comments ?? null
            ]);
        case 'attendance':
            return payload.attendance.map(a => [
                a.id, a.student_id, a.enrollment_id, a.date, a.presence, a.comment ?? null
            ]);
        case 'holidays':
            return (payload.holidays ?? []).map(h => [h.date, h.name, h.school_year ?? null]);
        case 'school_years':
            return (payload.schoolYears ?? []).map(y => [y.id, y.name, y.start_date, y.end_date]);
        case 'summer_sessions':
            return (payload.summerSessions ?? []).map(s => [s.id, s.name, s.start_date, s.end_date]);
        case 'summer_session_students':
            return (payload.summerSessionStudents ?? []).map(m => [m.session_id, m.student_id]);
        case 'app_settings':
            return Object.entries(payload.settings ?? {}).map(([key, value]) => [key, JSON.stringify(value), now]);
    }
};

const insertStaged = async (db: SqlExecutor, table: Table, rows: unknown[][]) => {
    const columns = COLUMNS[table];
    const rowsPerBatch = Math.max(1, Math.floor(MAX_PARAMS_PER_STATEMENT / columns.length));

    for (let i = 0; i < rows.length; i += rowsPerBatch) {
        const batch = rows.slice(i, i + rowsPerBatch);
        const placeholders = batch.map((_, r) =>
            `(${columns.map((_, c) => `$${r * columns.length + c + 1}`).join(', ')})`
        );
        await db.execute(
            `INSERT INTO ${staged(table)} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
            batch.flat()
        );
    }
};

export const dropStaging = async (db: SqlExecutor) => {
    // Dropping the guard table also drops its trigger.
    for (const name of [...TABLES.map(staged), GUARD_TABLE]) {
        await db.execute(`DROP TABLE IF EXISTS ${name}`);
    }
};

export const createStaging = async (db: SqlExecutor) => {
    await dropStaging(db);
    for (const table of TABLES) {
        // Copies the column list without constraints, so staging accepts the
        // file as-is and the checks below can describe what is wrong with it.
        await db.execute(`CREATE TABLE ${staged(table)} AS SELECT * FROM ${table} WHERE 0`);
    }
    await db.execute(`CREATE TABLE ${GUARD_TABLE} (x INTEGER)`);
    await db.execute(`
        CREATE TRIGGER ${GUARD_TABLE}_check BEFORE INSERT ON ${GUARD_TABLE}
        WHEN EXISTS (SELECT 1 FROM pragma_foreign_key_check)
        BEGIN
            SELECT RAISE(ROLLBACK, 'Import would leave records pointing at missing students or enrollments');
        END
    `);
};

export const stagePayload = async (db: SqlExecutor, payload: ImportPayload) => {
    const now = new Date().toISOString();
    for (const table of TABLES) {
        await insertStaged(db, table, rowValues(table, payload, now));
    }
};

/** Each check counts offending staged rows; a non-zero count is a problem. */
const CHECKS: { message: string; sql: string }[] = [
    { message: 'Students missing an ID, first name or last name',
      sql: `SELECT COUNT(*) AS n FROM _import_students WHERE id IS NULL OR first_name IS NULL OR last_name IS NULL` },
    { message: 'Duplicate student IDs',
      sql: `SELECT COUNT(*) AS n FROM (SELECT id FROM _import_students GROUP BY id HAVING COUNT(*) > 1)` },
    { message: 'Enrollments missing required fields',
      sql: `SELECT COUNT(*) AS n FROM _import_enrollments WHERE id IS NULL OR student_id IS NULL OR school_year IS NULL
              OR start_date IS NULL OR grade_level IS NULL OR status IS NULL` },
    { message: 'Duplicate enrollment IDs',
      sql: `SELECT COUNT(*) AS n FROM (SELECT id FROM _import_enrollments GROUP BY id HAVING COUNT(*) > 1)` },
    { message: 'Enrollments for a student who is not in the file',
      sql: `SELECT COUNT(*) AS n FROM _import_enrollments e WHERE NOT EXISTS (SELECT 1 FROM _import_students s WHERE s.id = e.student_id)` },
    { message: 'Attendance records missing required fields',
      sql: `SELECT COUNT(*) AS n FROM _import_attendance WHERE id IS NULL OR student_id IS NULL OR enrollment_id IS NULL
              OR date IS NULL OR presence IS NULL` },
    { message: 'Duplicate attendance IDs',
      sql: `SELECT COUNT(*) AS n FROM (SELECT id FROM _import_attendance GROUP BY id HAVING COUNT(*) > 1)` },
    { message: 'More than one attendance record for the same student on the same day',
      sql: `SELECT COUNT(*) AS n FROM (SELECT 1 FROM _import_attendance GROUP BY student_id, date HAVING COUNT(*) > 1)` },
    { message: 'Attendance for a student who is not in the file',
      sql: `SELECT COUNT(*) AS n FROM _import_attendance a WHERE NOT EXISTS (SELECT 1 FROM _import_students s WHERE s.id = a.student_id)` },
    { message: 'Attendance for an enrollment that is not in the file',
      sql: `SELECT COUNT(*) AS n FROM _import_attendance a WHERE NOT EXISTS (SELECT 1 FROM _import_enrollments e WHERE e.id = a.enrollment_id)` },
    { message: 'Holidays missing a date or name',
      sql: `SELECT COUNT(*) AS n FROM _import_holidays WHERE date IS NULL OR name IS NULL` },
    { message: 'Duplicate holiday dates',
      sql: `SELECT COUNT(*) AS n FROM (SELECT date FROM _import_holidays GROUP BY date HAVING COUNT(*) > 1)` },
    { message: 'School years missing required fields',
      sql: `SELECT COUNT(*) AS n FROM _import_school_years WHERE id IS NULL OR name IS NULL OR start_date IS NULL OR end_date IS NULL` },
    { message: 'Duplicate school year IDs or names',
      sql: `SELECT COUNT(*) AS n FROM (
              SELECT id FROM _import_school_years GROUP BY id HAVING COUNT(*) > 1
              UNION ALL SELECT name FROM _import_school_years GROUP BY name HAVING COUNT(*) > 1)` },
    { message: 'Summer sessions missing required fields',
      sql: `SELECT COUNT(*) AS n FROM _import_summer_sessions WHERE id IS NULL OR name IS NULL OR start_date IS NULL OR end_date IS NULL` },
    { message: 'Summer sessions that end before they start',
      sql: `SELECT COUNT(*) AS n FROM _import_summer_sessions WHERE end_date < start_date` },
    { message: 'Duplicate summer session IDs or names',
      sql: `SELECT COUNT(*) AS n FROM (
              SELECT id FROM _import_summer_sessions GROUP BY id HAVING COUNT(*) > 1
              UNION ALL SELECT name FROM _import_summer_sessions GROUP BY name HAVING COUNT(*) > 1)` },
    { message: 'Summer session students for a session or student that is not in the file',
      sql: `SELECT COUNT(*) AS n FROM _import_summer_session_students m
              WHERE NOT EXISTS (SELECT 1 FROM _import_summer_sessions s WHERE s.id = m.session_id)
                 OR NOT EXISTS (SELECT 1 FROM _import_students s WHERE s.id = m.student_id)` },
    { message: 'A student listed twice on the same summer session',
      sql: `SELECT COUNT(*) AS n FROM (SELECT 1 FROM _import_summer_session_students GROUP BY session_id, student_id HAVING COUNT(*) > 1)` }
];

export const validateStaging = async (db: SqlExecutor): Promise<ImportProblem[]> => {
    const problems: ImportProblem[] = [];
    for (const check of CHECKS) {
        const rows = await db.select<{ n: number }[]>(check.sql);
        const count = Number(rows[0]?.n ?? 0);
        if (count > 0) problems.push({ message: check.message, count });
    }
    return problems;
};

/**
 * The swap, as one script so it runs on a single connection. Holidays, school
 * years and summer sessions are only replaced when the file actually carries
 * them; older exports without them used to erase the existing ones.
 */
export const buildSwapSql = (opts: { replaceHolidays: boolean; replaceSchoolYears: boolean; replaceSummerSessions?: boolean }) => {
    const lines = [
        'BEGIN IMMEDIATE',
        // Session memberships cascade away with the students below. When the
        // file has no sessions, keep the existing ones for students it still has.
        ...(opts.replaceSummerSessions ? [] : [
            `INSERT INTO _import_summer_session_students SELECT * FROM summer_session_students
                WHERE student_id IN (SELECT id FROM _import_students)`
        ]),
        // References are checked once, by the guard below, after every table is
        // in place — rather than mid-way, where a violation would abort a single
        // statement and leave the transaction open.
        'PRAGMA defer_foreign_keys = ON',
        'DELETE FROM attendance',
        'DELETE FROM enrollments',
        'DELETE FROM students',
        ...(opts.replaceHolidays ? ['DELETE FROM holidays'] : []),
        ...(opts.replaceSchoolYears ? ['DELETE FROM school_years'] : []),
        ...(opts.replaceSummerSessions ? ['DELETE FROM summer_sessions'] : []),
        // OR ROLLBACK: a duplicate or missing required value ends the whole
        // transaction instead of only the failing statement.
        'INSERT OR ROLLBACK INTO students SELECT * FROM _import_students',
        'INSERT OR ROLLBACK INTO enrollments SELECT * FROM _import_enrollments',
        'INSERT OR ROLLBACK INTO attendance SELECT * FROM _import_attendance',
        ...(opts.replaceHolidays ? ['INSERT OR ROLLBACK INTO holidays SELECT * FROM _import_holidays'] : []),
        ...(opts.replaceSchoolYears ? ['INSERT OR ROLLBACK INTO school_years SELECT * FROM _import_school_years'] : []),
        ...(opts.replaceSummerSessions ? ['INSERT OR ROLLBACK INTO summer_sessions SELECT * FROM _import_summer_sessions'] : []),
        'INSERT OR ROLLBACK INTO summer_session_students SELECT * FROM _import_summer_session_students',
        'INSERT OR REPLACE INTO app_settings SELECT * FROM _import_app_settings',
        `INSERT INTO ${GUARD_TABLE} VALUES (1)`,
        'COMMIT'
    ];
    return lines.join(';\n') + ';';
};

/** Stage, check, and swap. Throws ImportValidationError when the file is rejected. */
export const runAtomicImport = async (
    db: SqlExecutor,
    payload: ImportPayload,
    /** Closes the pool; used if the swap fails in a way that may leave its transaction open. */
    discardConnections?: () => Promise<void>
): Promise<void> => {
    if (!Array.isArray(payload.students) || payload.students.length === 0) {
        // Importing an empty file would erase every student.
        throw new ImportValidationError([{ message: 'The file contains no students', count: 0 }]);
    }

    try {
        await createStaging(db);
        await stagePayload(db, payload);

        const problems = await validateStaging(db);
        if (problems.length > 0) throw new ImportValidationError(problems);

        try {
            await db.execute(buildSwapSql({
                replaceHolidays: Array.isArray(payload.holidays),
                replaceSchoolYears: Array.isArray(payload.schoolYears) && payload.schoolYears.length > 0,
                replaceSummerSessions: Array.isArray(payload.summerSessions)
            }));
        } catch (error) {
            // Every anticipated failure has already rolled itself back. For
            // anything else (disk full, I/O) the transaction may still be open on
            // the connection that ran the swap; closing the pool rolls it back.
            if (discardConnections) {
                await discardConnections().catch(err => console.error('Failed to reset connections after import:', err));
            }
            throw error;
        }
    } finally {
        await dropStaging(db).catch(err => console.error('Failed to remove import staging tables:', err));
    }
};
