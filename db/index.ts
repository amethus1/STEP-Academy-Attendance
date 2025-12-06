import Database from '@tauri-apps/plugin-sql';
import { runMigrations } from './migrations';

let dbInstance: Database | null = null;

export const getDb = async (): Promise<Database> => {
    if (dbInstance) return dbInstance;

    try {
        dbInstance = await Database.load('sqlite:step_academy.db');

        // Enable WAL mode for better concurrent access
        await dbInstance.execute("PRAGMA journal_mode = WAL");
        await dbInstance.execute("PRAGMA busy_timeout = 5000");

        await runMigrations(dbInstance);

        return dbInstance;
    } catch (error) {
        console.error("Failed to load database:", error);
        throw error;
    }
};
