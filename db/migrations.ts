export interface Migration {
    version: number;
    name: string;
    sql: string;
}

export const MIGRATIONS: Migration[] = [
    {
        version: 1,
        name: 'Initial Schema',
        sql: `
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            student_number TEXT, 
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            dob TEXT,
            guardian_name TEXT,
            guardian_phone TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            photo_url TEXT,
            custom_fields TEXT
        );

        CREATE TABLE IF NOT EXISTS enrollments (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            school_year TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            grade_level TEXT NOT NULL,
            campus TEXT,
            status TEXT NOT NULL,
            sped_504 TEXT,
            drg_offense TEXT,
            days_assigned INTEGER NOT NULL DEFAULT 45,
            credit_days INTEGER NOT NULL DEFAULT 0,
            comments TEXT,
            FOREIGN KEY(student_id) REFERENCES students(id)
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            enrollment_id TEXT NOT NULL,
            date TEXT NOT NULL,
            presence TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(enrollment_id) REFERENCES enrollments(id)
        );
        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_students_names ON students(last_name, first_name);
        CREATE INDEX IF NOT EXISTS idx_enrollments_year ON enrollments(school_year);
        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
        CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON attendance(student_id, date);

        CREATE TABLE IF NOT EXISTS holidays (
            date TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            school_year TEXT
        );

        CREATE TABLE IF NOT EXISTS school_years (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_school_years_dates ON school_years(start_date, end_date);
        `
    },
    {
        version: 2,
        name: 'Create Audit Logs',
        sql: `
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details TEXT,
            user_id TEXT, -- Optional if we add multi-user later
            timestamp TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
        `
    },
    {
        version: 3,
        name: 'Create App Settings',
        sql: `
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        -- Insert default settings
        INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES 
            ('theme', '"system"', datetime('now')),
            ('autoBackupEnabled', 'false', datetime('now')),
            ('backupFrequency', '"weekly"', datetime('now')),
            ('lastBackupDate', 'null', datetime('now')),
            ('backupPath', '""', datetime('now')),
            ('rosterVisibleColumns', '["lastName","firstName","status","projectedReleaseDate"]', datetime('now')),
            ('rosterColumnOrder', '["studentNumber","lastName","firstName","campus","gradeLevel","sped504","drgOffense","creditDays","status","registrationDate","entryDate","exitDate","daysAssigned","daysAttended","daysRemaining","projectedReleaseDate","comments"]', datetime('now')),
            ('weeklyViewFilters', '{}', datetime('now')),
            ('rosterFilters', '{}', datetime('now')),
            ('customFieldDefinitions', '[]', datetime('now'));
        `
    },
    {
        version: 4,
        name: 'Add Attendance Comments',
        sql: `
        ALTER TABLE attendance ADD COLUMN comment TEXT;
        `
    },
    {
        version: 5,
        name: 'Seed Default School Years',
        sql: `
        -- Insert default school years (current + 2 years back)
        -- Uses INSERT OR IGNORE to avoid duplicates if already exists
        INSERT OR IGNORE INTO school_years (id, name, start_date, end_date) VALUES
            (lower(hex(randomblob(16))), '2023-2024', '2023-08-01', '2024-07-31'),
            (lower(hex(randomblob(16))), '2024-2025', '2024-08-01', '2025-07-31'),
            (lower(hex(randomblob(16))), '2025-2026', '2025-08-01', '2026-07-31');
        `
    },
    {
        version: 6,
        name: 'Add UNIQUE constraint to school_years.name',
        sql: `
        -- Recreate school_years table with UNIQUE(name) constraint
        CREATE TABLE school_years_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL
        );

        INSERT INTO school_years_new SELECT * FROM school_years;
        DROP TABLE school_years;
        ALTER TABLE school_years_new RENAME TO school_years;

        CREATE INDEX idx_school_years_dates ON school_years(start_date, end_date);
        `
    },
    {
        version: 7,
        name: 'Enable Foreign Key Constraints with Cascading Deletes',
        sql: `
        -- Foreign-key enforcement is disabled by runMigrations for the duration
        -- of the migration run, which is required for this rebuild pattern
        -- (create new -> copy -> drop old -> rename) and cannot be done here:
        -- PRAGMA foreign_keys is a no-op inside the migration's transaction.

        -- Recreate enrollments table with ON DELETE CASCADE
        CREATE TABLE enrollments_new (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            school_year TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            grade_level TEXT NOT NULL,
            campus TEXT,
            status TEXT NOT NULL,
            sped_504 TEXT,
            drg_offense TEXT,
            days_assigned INTEGER NOT NULL DEFAULT 45,
            credit_days INTEGER NOT NULL DEFAULT 0,
            comments TEXT,
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
        );

        INSERT INTO enrollments_new SELECT * FROM enrollments;
        DROP TABLE enrollments;
        ALTER TABLE enrollments_new RENAME TO enrollments;

        CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
        CREATE INDEX idx_enrollments_school_year ON enrollments(school_year);
        CREATE INDEX idx_enrollments_status ON enrollments(status);

        -- Recreate attendance table with ON DELETE CASCADE
        CREATE TABLE attendance_new (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            enrollment_id TEXT NOT NULL,
            date TEXT NOT NULL,
            presence TEXT NOT NULL,
            comment TEXT,
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY(enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
            UNIQUE(student_id, date)
        );

        INSERT INTO attendance_new SELECT * FROM attendance;
        DROP TABLE attendance;
        ALTER TABLE attendance_new RENAME TO attendance;

        CREATE INDEX idx_attendance_enrollment_id ON attendance(enrollment_id);
        CREATE INDEX idx_attendance_student_id ON attendance(student_id);
        CREATE INDEX idx_attendance_date ON attendance(date);
        `
    },
    {
        version: 8,
        name: 'Add Student Demographics and Guardian Email',
        sql: `
        -- The printed progress report already displays Gender and guardian
        -- Email, but no column ever backed them, so those rows always rendered
        -- blank. Date of birth already had a column and just needed surfacing.
        ALTER TABLE students ADD COLUMN gender TEXT;
        ALTER TABLE students ADD COLUMN guardian_email TEXT;
        `
    }
];

/**
 * Minimal database surface the migration runner needs. The Tauri SQL plugin's
 * `Database` satisfies this structurally; tests supply an equivalent adapter so
 * they can exercise this exact runner against a real SQLite instance.
 */
export interface MigrationDb {
    execute(query: string, bindValues?: unknown[]): Promise<unknown>;
    select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}

/**
 * Split a migration's SQL into individual statements.
 *
 * `PRAGMA foreign_keys` is stripped deliberately: the pragma is a silent no-op
 * inside a transaction, and the runner owns foreign-key state for the whole
 * migration run (see runMigrations).
 */
export const splitStatements = (sql: string): string[] =>
    sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .filter(s => !/^PRAGMA\s+foreign_keys/i.test(s));

export const runMigrations = async (db: MigrationDb) => {
    // 1. Create migrations table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );
    `);

    // 2. Get current version
    const result = await db.select<{ version: number }[]>("SELECT MAX(version) as version FROM schema_migrations");
    const currentVersion = result[0]?.version || 0;

    console.log(`Current DB Version: ${currentVersion}`);

    const pending = MIGRATIONS.filter(m => m.version > currentVersion);
    if (pending.length === 0) return;

    // Foreign keys must be disabled OUTSIDE a transaction for the table-rebuild
    // pattern (create new -> copy -> drop old -> rename) that migrations use to
    // change constraints. SQLite ignores this pragma inside a transaction.
    await db.execute("PRAGMA foreign_keys = OFF");

    try {
        // 3. Apply pending migrations, each atomically.
        //
        // Every migration runs inside its own transaction together with the
        // schema_migrations bookkeeping row, so a crash or error mid-migration
        // rolls back completely. Without this, an interrupted multi-statement
        // migration leaves half-built tables behind and every subsequent launch
        // fails on "table X already exists" — an unrecoverable state for the user.
        for (const migration of pending) {
            console.log(`Applying migration ${migration.version}: ${migration.name}`);

            await db.execute("BEGIN");
            try {
                for (const stmt of splitStatements(migration.sql)) {
                    await db.execute(stmt);
                }

                // Reject the migration if it left dangling references behind.
                const violations = await db.select<unknown[]>("PRAGMA foreign_key_check");
                if (Array.isArray(violations) && violations.length > 0) {
                    throw new Error(
                        `Migration ${migration.version} produced ${violations.length} foreign key violation(s)`
                    );
                }

                await db.execute(
                    "INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, $3)",
                    [migration.version, migration.name, new Date().toISOString()]
                );
                await db.execute("COMMIT");
            } catch (e) {
                try {
                    await db.execute("ROLLBACK");
                } catch (rollbackErr) {
                    console.error("Migration rollback failed:", rollbackErr);
                }
                console.error(`Migration ${migration.version} failed:`, e);
                throw e; // Stop migration process
            }
        }
    } finally {
        // Restore enforcement regardless of outcome.
        await db.execute("PRAGMA foreign_keys = ON");
    }
};
