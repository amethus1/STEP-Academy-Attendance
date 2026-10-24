// Transactions that hold up under the SQL plugin's connection pool.
//
// The plugin runs each `execute` call on whichever pooled connection is free,
// so BEGIN, the statements and COMMIT sent as separate calls can land on
// different connections: the "transaction" then protects nothing, and a
// connection left holding an open BEGIN blocks every other writer with
// "database is locked". A single `execute` always runs on one connection, so a
// transaction here is one script.
//
// If the script fails partway, the transaction is left open on whichever
// connection ran it, and there is no way to address that connection again.
// The caller-supplied `discardConnections` must then close the pool: SQLite
// rolls back an open transaction when its connection closes.

export interface Statement {
    sql: string;
    params?: unknown[];
}

export interface ScriptExecutor {
    execute(query: string, bindValues?: unknown[]): Promise<unknown>;
}

// Single-quoted SQL string literals, including '' escapes.
const STRING_LITERAL = /'(?:[^']|'')*'/g;

/**
 * Shift every $N placeholder in `sql` by `offset`, leaving string literals
 * alone. Within one multi-statement query, $N refers to the Nth value of the
 * whole query, so each statement's placeholders must be renumbered.
 */
export const renumberPlaceholders = (sql: string, offset: number): string => {
    if (offset === 0) return sql;
    const shift = (code: string) => code.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + offset}`);

    let result = '';
    let last = 0;
    for (const match of sql.matchAll(STRING_LITERAL)) {
        result += shift(sql.slice(last, match.index)) + match[0];
        last = match.index! + match[0].length;
    }
    return result + shift(sql.slice(last));
};

/** Combine statements into one BEGIN IMMEDIATE ... COMMIT script with a flat parameter list. */
export const buildTransactionScript = (statements: Statement[]): { sql: string; params: unknown[] } => {
    const parts: string[] = ['BEGIN IMMEDIATE'];
    const params: unknown[] = [];

    for (const { sql, params: own = [] } of statements) {
        const body = sql.trim().replace(/;+\s*$/, '');
        if (body.includes(';')) {
            // A stray separator would split one statement into two and misalign
            // the parameters that follow; callers pass one statement per entry.
            const withoutLiterals = body.replace(STRING_LITERAL, '');
            if (withoutLiterals.includes(';')) {
                throw new Error(`Pass one SQL statement per entry: ${body.slice(0, 80)}`);
            }
        }
        parts.push(renumberPlaceholders(body, params.length));
        params.push(...own);
    }

    parts.push('COMMIT');
    // Separators go on their own line: a statement ending in a -- comment would
    // otherwise swallow the following ';' and run into the next statement.
    return { sql: parts.join('\n;\n') + '\n;', params };
};

/**
 * Run `statements` atomically. On any failure the pool is discarded so no
 * connection is left inside the half-finished transaction, then the error is
 * rethrown.
 */
export const runInTransaction = async (
    db: ScriptExecutor,
    statements: Statement[],
    discardConnections: () => Promise<void>
): Promise<void> => {
    if (statements.length === 0) return;

    const { sql, params } = buildTransactionScript(statements);
    try {
        await db.execute(sql, params.length > 0 ? params : undefined);
    } catch (error) {
        try {
            await discardConnections();
        } catch (discardError) {
            console.error('Failed to reset database connections after a failed transaction:', discardError);
        }
        throw error;
    }
};
