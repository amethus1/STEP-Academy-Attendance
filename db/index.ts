import Database from '@tauri-apps/plugin-sql';
import { runMigrations } from './migrations';

let dbInstance: Database | null = null;

// Write lock to serialize database write operations
let writeLockPromise: Promise<void> = Promise.resolve();
let writeLockResolve: (() => void) | null = null;

/**
 * Acquire an exclusive write lock for database operations.
 * This ensures only one write operation happens at a time.
 */
export const acquireWriteLock = async (): Promise<() => void> => {
    // Wait for any existing lock to be released
    await writeLockPromise;

    // Create a new lock
    let releaseLock: () => void;
    writeLockPromise = new Promise<void>((resolve) => {
        releaseLock = resolve;
        writeLockResolve = resolve;
    });

    // Return the release function
    return () => {
        releaseLock();
        writeLockResolve = null;
    };
};

/**
 * Check if a write lock is currently held
 */
export const isWriteLocked = (): boolean => {
    return writeLockResolve !== null;
};
// Initialization lock to prevent concurrent getDb() calls from racing
let initPromise: Promise<Database> | null = null;

export const getDb = async (): Promise<Database> => {
    // Return existing instance if available
    if (dbInstance) return dbInstance;

    // If initialization is already in progress, wait for it
    if (initPromise) return initPromise;

    // Start initialization and store the promise so concurrent calls wait
    initPromise = (async () => {
        try {
            const db = await Database.load('sqlite:step_academy.db');

            // Enable WAL mode for better concurrent access
            await db.execute("PRAGMA journal_mode = WAL");
            await db.execute("PRAGMA busy_timeout = 30000");
            // Enable foreign key enforcement for data integrity
            await db.execute("PRAGMA foreign_keys = ON");

            await runMigrations(db);

            // Only set dbInstance after successful initialization
            dbInstance = db;
            return db;
        } catch (error) {
            // Clear initPromise so next call can retry
            initPromise = null;
            console.error("Failed to load database:", error);
            throw error;
        }
    })();

    return initPromise;
};

/**
 * Execute multiple database operations within a transaction.
 * Automatically commits on success or rolls back on failure.
 * Uses a write lock to prevent concurrent transaction conflicts.
 * 
 * @param operations - Async function containing database operations
 * @returns The result of the operations function
 * @throws Re-throws any error after rolling back
 */
export const withTransaction = async <T>(
    operations: (db: Database) => Promise<T>
): Promise<T> => {
    // Acquire exclusive write lock
    const releaseLock = await acquireWriteLock();

    const db = await getDb();
    let began = false;

    try {
        await db.execute("BEGIN IMMEDIATE");
        began = true;
        const result = await operations(db);
        await db.execute("COMMIT");
        return result;
    } catch (error) {
        if (began) {
            try {
                await db.execute("ROLLBACK");
            } catch (rollbackErr) {
                // Ignore rollback errors (like if connection triggers rollback automatically)
                console.error("Rollback failed:", rollbackErr);
            }
        }
        console.error("Transaction failed, rolled back:", error);
        throw error;
    } finally {
        // Always release the lock
        releaseLock();
    }
};
