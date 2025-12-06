import Database from '@tauri-apps/plugin-sql';

export interface Migration {
    version: number;
    name: string;
    sql: string;
}

const MIGRATIONS: Migration[] = [
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
    }
];

export const runMigrations = async (db: Database) => {
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

    // 3. Apply pending migrations
    for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
            console.log(`Applying migration ${migration.version}: ${migration.name}`);
            try {
                // Split statements if needed, or execute as one block if plugin supports it.
                // Tauri SQL plugin execute returns Promise<QueryResult>.
                // For safety, split by semi-colon if the plugin doesn't support multi-statement (it usually does but standard sqlite3 sometimes picky).
                // Let's assume multi-statement works for CREATEs.
                // BUT, to be safer, we can split.
                const statements = migration.sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
                for (const stmt of statements) {
                    await db.execute(stmt);
                }

                // Record migration
                await db.execute(
                    "INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, $3)",
                    [migration.version, migration.name, new Date().toISOString()]
                );
            } catch (e) {
                console.error(`Migration ${migration.version} failed:`, e);
                throw e; // Stop migration process
            }
        }
    }
};
