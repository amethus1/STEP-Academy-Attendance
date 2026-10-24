// Test-only stand-in for the Tauri SQL plugin's connection pool.
//
// Several real SQLite connections share one database file, and each execute or
// select goes to the next connection in turn. Code that assumes consecutive
// calls share a connection (separate BEGIN / COMMIT calls, per-connection
// PRAGMAs) misbehaves here the way it can in the app.
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// String literals, so a ';' inside one is not taken as a statement boundary.
const STRING_LITERAL = /'(?:[^']|'')*'/g;

const splitScript = (sql: string): string[] => {
    const statements: string[] = [];
    let current = '';
    let last = 0;
    const flushCode = (code: string) => {
        const pieces = code.split(';');
        current += pieces[0];
        for (const piece of pieces.slice(1)) {
            statements.push(current);
            current = piece;
        }
    };
    for (const match of sql.matchAll(STRING_LITERAL)) {
        flushCode(sql.slice(last, match.index));
        current += match[0];
        last = match.index! + match[0].length;
    }
    flushCode(sql.slice(last));
    statements.push(current);
    return statements.map(s => s.trim()).filter(Boolean);
};

/**
 * Run `sql` on one connection the way sqlx does: statement by statement, with
 * $N meaning the Nth value of the whole query, stopping at the first error.
 */
const runOnConnection = (conn: DatabaseSync, sql: string, params: unknown[] = []) => {
    if (params.length === 0) {
        conn.exec(sql); // handles any script, including trigger bodies
        return;
    }
    for (const statement of splitScript(sql)) {
        const indexes = [...statement.matchAll(/\$(\d+)/g)].map(m => Number(m[1]));
        const highest = indexes.length ? Math.max(...indexes) : 0;
        conn.prepare(statement.replace(/\$(\d+)/g, '?$1')).run(...(params.slice(0, highest) as never[]));
    }
};

export class FakePool {
    readonly dir = mkdtempSync(join(tmpdir(), 'step-academy-test-'));
    readonly file = join(this.dir, 'test.db');
    private connections: DatabaseSync[] = [];
    private next = 0;

    constructor(private readonly size = 3) {
        this.open();
    }

    private open() {
        this.connections = Array.from({ length: this.size }, () => {
            const conn = new DatabaseSync(this.file);
            // sqlx's defaults: foreign keys on for every connection. A short busy
            // timeout makes lock conflicts fail fast instead of stalling the test.
            conn.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 50;');
            return conn;
        });
        this.next = 0;
    }

    private take(): DatabaseSync {
        const conn = this.connections[this.next];
        this.next = (this.next + 1) % this.connections.length;
        return conn;
    }

    /** Direct access for assertions. */
    connection(i: number): DatabaseSync {
        return this.connections[i];
    }

    async execute(query: string, bindValues?: unknown[]): Promise<unknown> {
        runOnConnection(this.take(), query, bindValues);
        return undefined;
    }

    async select<T>(query: string, bindValues?: unknown[]): Promise<T> {
        return this.take().prepare(query.replace(/\$(\d+)/g, '?$1')).all(...((bindValues ?? []) as never[])) as T;
    }

    /** Like closing the plugin's pool and loading it again: open transactions roll back. */
    async reset(): Promise<void> {
        this.connections.forEach(c => c.close());
        this.open();
    }

    destroy() {
        this.connections.forEach(c => { try { c.close(); } catch { /* already closed */ } });
        rmSync(this.dir, { recursive: true, force: true });
    }
}
