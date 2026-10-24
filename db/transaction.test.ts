// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { renumberPlaceholders, buildTransactionScript, runInTransaction } from './transaction';
import { FakePool } from './sqlitePool.testutil';

describe('renumberPlaceholders', () => {
    it('shifts each placeholder by the offset', () => {
        expect(renumberPlaceholders('UPDATE t SET a = $1 WHERE id = $2', 3)).toBe('UPDATE t SET a = $4 WHERE id = $5');
    });

    it('leaves dollar signs inside string literals alone', () => {
        expect(renumberPlaceholders("SELECT '$1 fee', $1, 'it''s $2'", 10)).toBe("SELECT '$1 fee', $11, 'it''s $2'");
    });

    it('handles multi-digit placeholders', () => {
        expect(renumberPlaceholders('VALUES ($9, $10, $13)', 13)).toBe('VALUES ($22, $23, $26)');
    });
});

describe('buildTransactionScript', () => {
    it('wraps statements and flattens their parameters in order', () => {
        const { sql, params } = buildTransactionScript([
            { sql: 'INSERT INTO a (x, y) VALUES ($1, $2)', params: [1, 2] },
            { sql: 'DELETE FROM b WHERE id = $1;', params: ['z'] }
        ]);
        expect(sql).toBe('BEGIN IMMEDIATE\n;\nINSERT INTO a (x, y) VALUES ($1, $2)\n;\nDELETE FROM b WHERE id = $3\n;\nCOMMIT\n;');
        expect(params).toEqual([1, 2, 'z']);
    });

    it('refuses an entry that hides a second statement', () => {
        expect(() => buildTransactionScript([{ sql: 'DELETE FROM a; DELETE FROM b' }])).toThrow(/one SQL statement/);
    });

    it('keeps a statement that ends in a comment separate from the next', async () => {
        const local = new FakePool();
        try {
            await local.execute('CREATE TABLE t (x INTEGER)');
            await runInTransaction(local, [
                { sql: 'INSERT INTO t VALUES ($1) -- first', params: [1] },
                { sql: 'INSERT INTO t VALUES ($1)', params: [2] }
            ], () => local.reset());
            expect((await local.select<{ c: number }[]>('SELECT COUNT(*) AS c FROM t'))[0].c).toBe(2);
        } finally {
            local.destroy();
        }
    });

    it('allows semicolons inside string literals', () => {
        expect(() => buildTransactionScript([{ sql: "UPDATE t SET note = 'a; b' WHERE id = $1", params: [1] }])).not.toThrow();
    });
});

describe('transactions on a connection pool', () => {
    let pool: FakePool;
    afterEach(() => pool?.destroy());

    const setup = async () => {
        pool = new FakePool();
        await pool.execute(`CREATE TABLE parents (id TEXT PRIMARY KEY);
                            CREATE TABLE children (id TEXT PRIMARY KEY, parent_id TEXT NOT NULL REFERENCES parents(id))`);
        await pool.execute(`INSERT INTO parents VALUES ('existing')`);
    };

    const count = async (table: string) =>
        (await pool.select<{ c: number }[]>(`SELECT COUNT(*) AS c FROM ${table}`))[0].c;

    // Why the old withTransaction could not work: its BEGIN, statements and
    // COMMIT were separate calls, and a pool does not keep them together.
    it('demonstrates that separate BEGIN and COMMIT calls do not form a transaction on a pool', async () => {
        await setup();
        await pool.execute('BEGIN IMMEDIATE'); // lands on one connection and takes the write lock
        await expect(pool.execute(`INSERT INTO parents VALUES ('p1')`)) // lands on another
            .rejects.toThrow(/locked/);
    });

    it('commits every statement together', async () => {
        await setup();
        await runInTransaction(pool, [
            { sql: 'INSERT INTO parents (id) VALUES ($1)', params: ['p1'] },
            { sql: 'INSERT INTO children (id, parent_id) VALUES ($1, $2)', params: ['c1', 'p1'] }
        ], () => pool.reset());

        expect(await count('parents')).toBe(2);
        expect(await count('children')).toBe(1);
    });

    it('rolls back the earlier statements when a later one fails, and leaves no lock behind', async () => {
        await setup();
        let discarded = false;

        await expect(runInTransaction(pool, [
            { sql: 'INSERT INTO parents (id) VALUES ($1)', params: ['p1'] },
            // Breaks the foreign key, failing after the first insert already ran.
            { sql: 'INSERT INTO children (id, parent_id) VALUES ($1, $2)', params: ['c1', 'missing'] }
        ], async () => { discarded = true; await pool.reset(); })).rejects.toThrow(/FOREIGN KEY/);

        expect(discarded).toBe(true);
        expect(await count('parents')).toBe(1); // the first insert did not survive
        // Every connection can write again: nothing is holding an open transaction.
        for (let i = 0; i < 3; i++) {
            await pool.execute(`INSERT INTO parents VALUES ('after${i}')`);
        }
        expect(await count('parents')).toBe(4);
    });

    it('does nothing for an empty list', async () => {
        await setup();
        await runInTransaction(pool, [], () => pool.reset());
        expect(await count('parents')).toBe(1);
    });
});
