// Audit logging database queries
import { getDb } from './index';
import { DBAuditLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const createAuditLog = async (action: string, entityType: string, entityId: string | null, details: string | null) => {
    const db = await getDb();
    try {
        await db.execute(
            `INSERT INTO audit_logs (id, action, entity_type, entity_id, details, user_id, timestamp) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [crypto.randomUUID(), action, entityType, entityId, details, 'system', new Date().toISOString()]
        );
    } catch (e) {
        console.error("Failed to write audit log:", e);
        // Don't throw - failing to log shouldn't crash the app action
    }
};

export type AuditLogEntry = DBAuditLog;

export interface GetAuditLogsOptions {
    limit?: number;
    offset?: number;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
}

export const getAuditLogs = async (options: GetAuditLogsOptions = {}): Promise<{ logs: AuditLogEntry[]; total: number }> => {
    const db = await getDb();
    const { limit = 50, offset = 0, entityType, action, startDate, endDate } = options;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (entityType) {
        conditions.push(`entity_type = $${paramIndex}`);
        params.push(entityType);
        paramIndex++;
    }

    if (action) {
        conditions.push(`action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
    }

    if (startDate) {
        conditions.push(`timestamp >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
    }

    if (endDate) {
        conditions.push(`timestamp <= $${paramIndex}`);
        params.push(endDate + 'T23:59:59.999Z');
        paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.select<{ count: number }[]>(
        `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
        params
    );
    const total = countResult[0]?.count || 0;

    // Get paginated results
    const logs = await db.select<AuditLogEntry[]>(
        `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
    );

    return { logs, total };
};

export const getDistinctAuditActions = async (): Promise<string[]> => {
    const db = await getDb();
    const result = await db.select<{ action: string }[]>(
        "SELECT DISTINCT action FROM audit_logs ORDER BY action"
    );
    return result.map(r => r.action);
};

export const getDistinctAuditEntityTypes = async (): Promise<string[]> => {
    const db = await getDb();
    const result = await db.select<{ entity_type: string }[]>(
        "SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type"
    );
    return result.map(r => r.entity_type);
};
