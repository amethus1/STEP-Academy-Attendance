// @vitest-environment node
// Needs the node environment so the node:sqlite builtin resolves.
import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from './migrations';
import {
    runAtomicImport,
    createStaging,
    stagePayload,
    buildSwapSql,
    ImportValidationError,
    type SqlExecutor,
    type ImportPayload
} from './atomicImport';

/** node:sqlite behind the plugin's interface; $N placeholders become positional. */
const adapter = (db: DatabaseSync): SqlExecutor => ({
    async execute(query, bindValues) {
        if (bindValues && bindValues.length > 0) {
            db.prepare(query.replace(/\$\d+/g, '?')).run(...(bindValues as never[]));
            return;
        }
        db.exec(query);
    },
    async select<T>(query: string, bindValues?: unknown[]): Promise<T> {
        return db.prepare(query.replace(/\$\d+/g, '?')).all(...((bindValues ?? []) as never[])) as T;
    }
});

const freshDb = async () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    await runMigrations(adapter(db));
    // The school's existing data, which a failed import must not touch.
    db.exec(`
        INSERT INTO students (id, first_name, last_name) VALUES ('old1','Ada','Lovelace'),('old2','Alan','Turing');
        INSERT INTO enrollments (id, student_id, school_year, start_date, grade_level, status)
            VALUES ('oe1','old1','2024-2025','2024-08-15','9','Active'),('oe2','old2','2024-2025','2024-08-15','10','Active');
        INSERT INTO attendance (id, student_id, enrollment_id, date, presence)
            VALUES ('oa1','old1','oe1','2024-09-03','Present');
        INSERT INTO holidays (date, name) VALUES ('2024-11-28','Thanksgiving');
    `);
    return db;
};

const count = (db: DatabaseSync, table: string) =>
    (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;

const snapshot = (db: DatabaseSync) => ({
    students: count(db, 'students'),
    enrollments: count(db, 'enrollments'),
    attendance: count(db, 'attendance'),
    holidays: count(db, 'holidays'),
    school_years: count(db, 'school_years')
});

const stagingTables = (db: DatabaseSync) =>
    db.prepare("SELECT name FROM sqlite_master WHERE name LIKE '\\_import\\_%' ESCAPE '\\'").all();

const student = (id: string) => ({
    id, student_number: null, first_name: 'New', last_name: id, dob: null, gender: null,
    guardian_name: null, guardian_phone: null, guardian_email: null,
    emergency_contact_name: null, emergency_contact_phone: null, photo_url: null, custom_fields: null
});

const enrollment = (id: string, studentId: string) => ({
    id, student_id: studentId, school_year: '2025-2026', start_date: '2025-08-15', end_date: null,
    grade_level: '9', campus: null, status: 'Active', sped_504: null, drg_offense: null,
    days_assigned: 45, credit_days: 0, comments: null
});

const attendance = (id: string, studentId: string, enrollmentId: string, date = '2025-09-01') => ({
    id, student_id: studentId, enrollment_id: enrollmentId, date, presence: 'Present', comment: null
});

const validPayload = (): ImportPayload => ({
    students: [student('n1'), student('n2')],
    enrollments: [enrollment('ne1', 'n1'), enrollment('ne2', 'n2')],
    attendance: [attendance('na1', 'n1', 'ne1'), attendance('na2', 'n2', 'ne2')],
    holidays: [{ date: '2025-11-27', name: 'Thanksgiving', school_year: '2025-2026' }],
    schoolYears: [{ id: 'y1', name: '2025-2026', start_date: '2025-08-01', end_date: '2026-07-31' }],
    settings: { theme: 'dark' }
});

describe('runAtomicImport', () => {
    it('replaces the data when the file is valid', async () => {
        const db = await freshDb();
        await runAtomicImport(adapter(db), validPayload());

        expect(snapshot(db)).toEqual({ students: 2, enrollments: 2, attendance: 2, holidays: 1, school_years: 1 });
        expect(db.prepare("SELECT id FROM students ORDER BY id").all().map((r: any) => r.id)).toEqual(['n1', 'n2']);
        expect(db.prepare("SELECT value FROM app_settings WHERE key='theme'").get()).toEqual({ value: '"dark"' });
        expect(stagingTables(db)).toEqual([]);
    });

    it('keeps the existing data when attendance points at a missing enrollment', async () => {
        const db = await freshDb();
        const before = snapshot(db);
        const payload = validPayload();
        payload.attendance.push(attendance('bad', 'n1', 'MISSING', '2025-09-02'));

        const error = await runAtomicImport(adapter(db), payload).catch(e => e);

        expect(error).toBeInstanceOf(ImportValidationError);
        expect((error as ImportValidationError).problems.map(p => p.message))
            .toContain('Attendance for an enrollment that is not in the file');
        expect(snapshot(db)).toEqual(before);
        expect(stagingTables(db)).toEqual([]);
    });

    it('rejects two records for the same student on the same day', async () => {
        const db = await freshDb();
        const before = snapshot(db);
        const payload = validPayload();
        payload.attendance.push(attendance('dup', 'n1', 'ne1'));

        await expect(runAtomicImport(adapter(db), payload)).rejects.toBeInstanceOf(ImportValidationError);
        expect(snapshot(db)).toEqual(before);
    });

    it('refuses a file with no students instead of erasing everyone', async () => {
        const db = await freshDb();
        const before = snapshot(db);

        await expect(runAtomicImport(adapter(db), { ...validPayload(), students: [] }))
            .rejects.toBeInstanceOf(ImportValidationError);
        expect(snapshot(db)).toEqual(before);
    });

    it('keeps existing school years and holidays when an older file omits them', async () => {
        const db = await freshDb();
        const schoolYearsBefore = count(db, 'school_years');
        const { schoolYears: _sy, holidays: _h, ...olderFormat } = validPayload();

        await runAtomicImport(adapter(db), olderFormat);

        expect(count(db, 'school_years')).toBe(schoolYearsBefore);
        expect(count(db, 'holidays')).toBe(1);
        expect(db.prepare('SELECT name FROM holidays').get()).toEqual({ name: 'Thanksgiving' });
    });

    it('stages and swaps large files across several batches', async () => {
        const db = await freshDb();
        const payload = validPayload();
        const days = 400; // 400 x 6 columns is well past one statement's worth of parameters
        payload.attendance = Array.from({ length: days }, (_, i) => {
            const d = new Date(Date.UTC(2025, 7, 1 + i));
            return attendance(`bulk${i}`, 'n1', 'ne1', d.toISOString().slice(0, 10));
        });

        await runAtomicImport(adapter(db), payload);
        expect(count(db, 'attendance')).toBe(days);
    });
});

// The checks above stop bad files before the swap. These prove the swap
// still protects the data if something gets past them.
describe('swap safety net', () => {
    const swap = buildSwapSql({ replaceHolidays: true, replaceSchoolYears: true });

    it('rolls back completely when staged rows break a reference', async () => {
        const db = await freshDb();
        const before = snapshot(db);
        await createStaging(adapter(db));
        const payload = validPayload();
        payload.attendance.push(attendance('bad', 'n1', 'MISSING', '2025-09-02'));
        await stagePayload(adapter(db), payload);

        expect(() => db.exec(swap)).toThrow(/missing students or enrollments/);
        expect(snapshot(db)).toEqual(before);
        // No transaction left open on the connection.
        expect(db.isTransaction).toBe(false);
    });

    it('rolls back completely on a duplicate key', async () => {
        const db = await freshDb();
        const before = snapshot(db);
        await createStaging(adapter(db));
        const payload = validPayload();
        payload.students.push(student('n1'));
        await stagePayload(adapter(db), payload);

        expect(() => db.exec(swap)).toThrow();
        expect(snapshot(db)).toEqual(before);
        expect(db.isTransaction).toBe(false);
    });
});
