import Database from '@tauri-apps/plugin-sql';
import schema from './schema.sql?raw';

let dbInstance: Database | null = null;

export const getDb = async (): Promise<Database> => {
    if (dbInstance) return dbInstance;

    try {
        dbInstance = await Database.load('sqlite:step_academy.db');

        // Enable WAL mode for better concurrent access
        await dbInstance.execute("PRAGMA journal_mode = WAL");
        await dbInstance.execute("PRAGMA busy_timeout = 5000");

        await initSchema(dbInstance);

        // Create school_years table if not exists (in case schema.sql wasn't fully applied or for robustness)
        await dbInstance.execute(`
            CREATE TABLE IF NOT EXISTS school_years (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_school_years_dates ON school_years(start_date, end_date);
        `);

        return dbInstance;
    } catch (error) {
        console.error("Failed to load database:", error);
        throw error;
    }
};

const initSchema = async (db: Database) => {
    // Split schema by semi-colon to execute multiple statements
    // simplistic parsing, assumes no semi-colons in strings/comments for now
    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const statement of statements) {
        await db.execute(statement);
    }
};
