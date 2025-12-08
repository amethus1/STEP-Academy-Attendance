// Attendance-related database queries
import { getDb } from './index';
import { DBAttendance } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const getAttendanceByDate = async (date: string): Promise<DBAttendance[]> => {
    const db = await getDb();
    return await db.select("SELECT * FROM attendance WHERE date = $1", [date]);
};

export const getAttendanceByDateRange = async (startDate: string, endDate: string): Promise<DBAttendance[]> => {
    const db = await getDb();
    return await db.select("SELECT * FROM attendance WHERE date >= $1 AND date <= $2", [startDate, endDate]);
};

export const saveAttendance = async (records: DBAttendance[]) => {
    if (records.length === 0) return;

    const db = await getDb();

    // Batch upsert using SQLite's multi-row INSERT
    // Split into chunks to avoid SQLite's parameter limit (typically 999)
    const BATCH_SIZE = 150; // Each record has 6 params, so 150 * 6 = 900 params per batch

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        // Build multi-row INSERT with placeholders
        const valuePlaceholders: string[] = [];
        const params: any[] = [];

        batch.forEach((r, idx) => {
            const offset = idx * 6;
            valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
            params.push(r.id, r.student_id, r.enrollment_id, r.date, r.presence, r.comment ?? null);
        });

        const query = `
            INSERT INTO attendance (id, student_id, enrollment_id, date, presence, comment) 
            VALUES ${valuePlaceholders.join(', ')}
            ON CONFLICT(student_id, date) DO UPDATE SET 
                presence = excluded.presence,
                enrollment_id = excluded.enrollment_id,
                comment = excluded.comment
        `;

        await db.execute(query, params);
    }
};

export const deleteAttendance = async (studentId: string, date: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM attendance WHERE student_id = $1 AND date = $2", [studentId, date]);
};

export const saveAttendanceComment = async (studentId: string, date: string, comment: string | null) => {
    const db = await getDb();
    await db.execute(
        "UPDATE attendance SET comment = $1 WHERE student_id = $2 AND date = $3",
        [comment, studentId, date]
    );
};

export const getStudentAttendanceWithComments = async (studentId: string): Promise<DBAttendance[]> => {
    const db = await getDb();
    return await db.select(
        "SELECT * FROM attendance WHERE student_id = $1 AND comment IS NOT NULL AND comment != '' ORDER BY date DESC",
        [studentId]
    );
};
