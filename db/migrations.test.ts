// @vitest-environment node
// Needs the node environment (not the project-wide jsdom default) so the
// node:sqlite builtin resolves.
import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations, splitStatements, MIGRATIONS, type MigrationDb } from './migrations';

/**
 * Adapter exposing node:sqlite through the same surface the Tauri SQL plugin
 * provides, so these tests drive the real runMigrations implementation rather
 * than a reimplementation of it.
 */
const adapter = (db: DatabaseSync): MigrationDb => ({
    async execute(query: string, bindValues?: unknown[]) {
        if (bindValues && bindValues.length > 0) {
            // The app uses Postgres-style $1/$2 placeholders, which the Tauri
            // plugin rewrites. node:sqlite binds positionally, so do the same here.
            db.prepare(query.replace(/\$\d+/g, '?')).run(...(bindValues as never[]));
            return;
        }
        db.exec(query);
    },
    async select<T>(query: string, bindValues?: unknown[]): Promise<T> {
        return db.prepare(query.replace(/\$\d+/g, '?')).all(...((bindValues ?? []) as never[])) as T;
    }
});

const fresh = () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    return db;
};

const tableNames = (db: DatabaseSync) =>
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all().map((r: Record<string, unknown>) => r.name as string);

const indexNames = (db: DatabaseSync) =>
    db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name")
        .all().map((r: Record<string, unknown>) => r.name as string);

const counts = (db: DatabaseSync) => ({
    students: (db.prepare('SELECT COUNT(*) c FROM students').get() as { c: number }).c,
    enrollments: (db.prepare('SELECT COUNT(*) c FROM enrollments').get() as { c: number }).c,
    attendance: (db.prepare('SELECT COUNT(*) c FROM attendance').get() as { c: number }).c,
});

/**
 * Bring a database up to `version` only, so a later runMigrations exercises the
 * real upgrade path an existing install would take.
 */
const migrateTo = (db: DatabaseSync, version: number) => {
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
    db.exec('PRAGMA foreign_keys = OFF');
    for (const m of MIGRATIONS.filter(m => m.version <= version)) {
        for (const stmt of splitStatements(m.sql)) db.exec(stmt);
        db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
            .run(m.version, m.name, '2024-01-01T00:00:00.000Z');
    }
    db.exec('PRAGMA foreign_keys = ON');
};

const seedStudents = (db: DatabaseSync) => {
    db.exec(`
        INSERT INTO students (id, first_name, last_name) VALUES ('s1','Ada','Lovelace'),('s2','Alan','Turing');
        INSERT INTO enrollments (id, student_id, school_year, start_date, grade_level, status)
            VALUES ('e1','s1','2024-2025','2024-08-15','9','Active'),
                   ('e2','s2','2024-2025','2024-08-15','10','Active');
        INSERT INTO attendance (id, student_id, enrollment_id, date, presence)
            VALUES ('a1','s1','e1','2024-09-03','Present'),
                   ('a2','s2','e2','2024-09-03','Absent');
    `);
};

describe('splitStatements', () => {
    it('splits on semicolons and drops empties', () => {
        expect(splitStatements('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
    });

    it('strips PRAGMA foreign_keys, which is a no-op inside a transaction', () => {
        expect(splitStatements('PRAGMA foreign_keys = OFF; SELECT 1;')).toEqual(['SELECT 1']);
        expect(splitStatements('pragma  foreign_keys=ON; SELECT 1;')).toEqual(['SELECT 1']);
    });
});

describe('runMigrations', () => {
    it('builds the full schema on a fresh database', async () => {
        const db = fresh();
        await runMigrations(adapter(db));

        expect(tableNames(db)).toEqual(expect.arrayContaining([
            'app_settings', 'attendance', 'audit_logs', 'enrollments',
            'holidays', 'school_years', 'schema_migrations', 'students'
        ]));
        // No leftover scaffolding from the table-rebuild migrations.
        expect(tableNames(db).filter(n => n.endsWith('_new'))).toEqual([]);
    });

    it('leaves foreign key enforcement ON when it finishes', async () => {
        const db = fresh();
        await runMigrations(adapter(db));
        expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
    });

    it('is idempotent — a second run applies nothing', async () => {
        const db = fresh();
        await runMigrations(adapter(db));
        const applied = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();

        await runMigrations(adapter(db));
        expect(db.prepare('SELECT version FROM schema_migrations ORDER BY version').all()).toEqual(applied);
    });

    it('preserves existing rows when upgrading a populated v5 database', async () => {
        const db = fresh();
        migrateTo(db, 5);
        seedStudents(db);
        const before = counts(db);

        await runMigrations(adapter(db));

        expect(counts(db)).toEqual(before);
        expect(db.prepare("SELECT first_name FROM students WHERE id='s1'").get())
            .toEqual({ first_name: 'Ada' });
    });

    it('keeps every index after the rebuild migrations', async () => {
        const db = fresh();
        await runMigrations(adapter(db));
        expect(indexNames(db)).toEqual(expect.arrayContaining([
            'idx_attendance_date', 'idx_attendance_enrollment_id', 'idx_attendance_student_id',
            'idx_enrollments_school_year', 'idx_enrollments_status', 'idx_enrollments_student_id',
            'idx_school_years_dates', 'idx_students_names'
        ]));
    });

    it('cascades deletes from students to enrollments and attendance', async () => {
        const db = fresh();
        await runMigrations(adapter(db));
        seedStudents(db);

        db.exec("DELETE FROM students WHERE id='s1'");

        expect((db.prepare("SELECT COUNT(*) c FROM enrollments WHERE student_id='s1'").get() as { c: number }).c).toBe(0);
        expect((db.prepare("SELECT COUNT(*) c FROM attendance WHERE student_id='s1'").get() as { c: number }).c).toBe(0);
        // Unrelated students are untouched.
        expect((db.prepare("SELECT COUNT(*) c FROM enrollments WHERE student_id='s2'").get() as { c: number }).c).toBe(1);
    });

    it('adds the demographic columns the printed report displays', async () => {
        const db = fresh();
        await runMigrations(adapter(db));

        const columns = db.prepare('PRAGMA table_info(students)')
            .all().map((r: Record<string, unknown>) => r.name as string);
        expect(columns).toEqual(expect.arrayContaining(['dob', 'gender', 'guardian_email']));
    });

    it('keeps a pre-existing date of birth when adding the new columns', async () => {
        const db = fresh();
        migrateTo(db, 5);
        db.exec(`INSERT INTO students (id, first_name, last_name, dob)
                 VALUES ('s9','Grace','Hopper','1906-12-09')`);

        await runMigrations(adapter(db));

        expect(db.prepare("SELECT dob, gender, guardian_email FROM students WHERE id='s9'").get())
            .toEqual({ dob: '1906-12-09', gender: null, guardian_email: null });
    });

    it('round-trips the demographic fields the report displays', async () => {
        const db = fresh();
        await runMigrations(adapter(db));
        db.exec(`INSERT INTO students (id, first_name, last_name, dob, gender, guardian_email)
                 VALUES ('s9','Grace','Hopper','1906-12-09','Female','g@example.edu')`);

        expect(db.prepare("SELECT dob, gender, guardian_email FROM students WHERE id='s9'").get())
            .toEqual({ dob: '1906-12-09', gender: 'Female', guardian_email: 'g@example.edu' });
    });

    it('enforces a unique school year name', async () => {
        const db = fresh();
        await runMigrations(adapter(db));
        const name = (db.prepare('SELECT name FROM school_years LIMIT 1').get() as { name: string }).name;

        expect(() =>
            db.exec(`INSERT INTO school_years (id,name,start_date,end_date) VALUES ('dup','${name}','a','b')`)
        ).toThrow();
    });

    // Regression: an interrupted migration used to leave half-built tables behind,
    // so every later launch died on "table enrollments_new already exists".
    it('rolls a failed migration back completely and can retry it', async () => {
        const db = fresh();
        const real = adapter(db);

        let failNext = true;
        const flaky: MigrationDb = {
            execute: async (q, b) => {
                if (failNext && /DROP TABLE enrollments\b/i.test(q)) {
                    failNext = false;
                    throw new Error('simulated crash mid-migration');
                }
                return real.execute(q, b);
            },
            select: real.select
        };

        await expect(runMigrations(flaky)).rejects.toThrow('simulated crash');

        // Nothing half-built survived the rollback.
        expect(tableNames(db).filter(n => n.endsWith('_new'))).toEqual([]);
        const versions = db.prepare('SELECT version FROM schema_migrations').all()
            .map((r: Record<string, unknown>) => r.version as number);
        expect(versions).not.toContain(7);

        // A retry on the next launch succeeds instead of failing forever.
        await expect(runMigrations(real)).resolves.toBeUndefined();
        expect(db.prepare('SELECT version FROM schema_migrations WHERE version = 7').all()).toHaveLength(1);
        expect(tableNames(db).filter(n => n.endsWith('_new'))).toEqual([]);
    });
});
