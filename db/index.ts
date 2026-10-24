import Database from '@tauri-apps/plugin-sql';
import { runMigrations } from './migrations';
import { runInTransaction, type Statement } from './transaction';

export type { Statement } from './transaction';

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

const DB_URL = 'sqlite:step_academy.db';

export const getDb = async (): Promise<Database> => {
    // Return existing instance if available
    if (dbInstance) return dbInstance;

    // If initialization is already in progress, wait for it
    if (initPromise) return initPromise;

    // Start initialization and store the promise so concurrent calls wait
    initPromise = (async () => {
        let db: Database | null = null;
        try {
            db = await Database.load(DB_URL);

            // WAL is stored in the database file, so setting it once covers every
            // pooled connection. Per-connection settings such as foreign_keys and
            // busy_timeout come from sqlx, which enables foreign keys on every
            // connection it opens.
            await db.execute("PRAGMA journal_mode = WAL");

            await runMigrations(db);

            // Only set dbInstance after successful initialization
            dbInstance = db;
            return db;
        } catch (error) {
            // A migration that fails partway can leave its transaction open, and
            // foreign keys switched off, on the connection that ran it. Closing
            // the pool rolls that back before anything else can use it.
            if (db) await db.close().catch(err => console.error('Failed to close database after error:', err));
            // Clear initPromise so next call can retry
            initPromise = null;
            console.error("Failed to load database:", error);
            throw error;
        }
    })();

    return initPromise;
};

/**
 * Close every pooled connection and forget the instance, so the next getDb()
 * opens a fresh pool. SQLite rolls back any transaction still open on a
 * connection when it closes, which is how a failed transaction script is
 * cleaned up: the connection that ran it cannot be addressed directly.
 */
export const resetConnections = async (): Promise<void> => {
    const db = dbInstance;
    dbInstance = null;
    initPromise = null;
    if (db) await db.close();
};

/**
 * Run several write statements as one all-or-nothing transaction.
 *
 * Statements are passed as data rather than run from a callback, because the
 * whole transaction has to travel as a single script to stay on one pooled
 * connection (see db/transaction.ts). Use $1, $2, ... in each statement as if
 * it stood alone; they are renumbered when the script is assembled.
 */
export const withTransaction = async (statements: Statement[]): Promise<void> => {
    const releaseLock = await acquireWriteLock();
    try {
        const db = await getDb();
        await runInTransaction(db, statements, resetConnections);
    } finally {
        releaseLock();
    }
};
