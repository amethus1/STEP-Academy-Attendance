// Summer session database queries
import { getDb, withTransaction } from './index';
import { createAuditLog } from './auditQueries';
import type { DBSummerSession } from './types';

export interface SummerSession {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    /** How many students are on the session's roster. */
    studentCount: number;
}

export const getSummerSessions = async (): Promise<SummerSession[]> => {
    const db = await getDb();
    return db.select<SummerSession[]>(`
        SELECT ss.id, ss.name, ss.start_date AS startDate, ss.end_date AS endDate,
               (SELECT COUNT(*) FROM summer_session_students sss WHERE sss.session_id = ss.id) AS studentCount
        FROM summer_sessions ss
        ORDER BY ss.start_date DESC
    `);
};

export const saveSummerSession = async (session: Omit<SummerSession, 'studentCount'>): Promise<void> => {
    if (session.endDate < session.startDate) {
        throw new Error('A summer session cannot end before it starts.');
    }
    const db = await getDb();
    await db.execute(
        `INSERT INTO summer_sessions (id, name, start_date, end_date) VALUES ($1, $2, $3, $4)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, start_date = excluded.start_date, end_date = excluded.end_date`,
        [session.id, session.name, session.startDate, session.endDate]
    );
    await createAuditLog('SAVE_SUMMER_SESSION', 'SummerSession', session.id, `${session.name}: ${session.startDate} to ${session.endDate}`);
};

/** Removes the session and its roster. Attendance already taken is kept. */
export const deleteSummerSession = async (id: string): Promise<void> => {
    const db = await getDb();
    await db.execute('DELETE FROM summer_sessions WHERE id = $1', [id]);
    await createAuditLog('DELETE_SUMMER_SESSION', 'SummerSession', id, 'Deleted summer session');
};

export const getSummerSessionStudentIds = async (sessionId: string): Promise<string[]> => {
    const db = await getDb();
    const rows = await db.select<{ student_id: string }[]>(
        'SELECT student_id FROM summer_session_students WHERE session_id = $1', [sessionId]
    );
    return rows.map(r => r.student_id);
};

/** Replace a session's roster with exactly these students, in one transaction. */
export const setSummerSessionStudents = async (sessionId: string, studentIds: string[]): Promise<void> => {
    await withTransaction([
        { sql: 'DELETE FROM summer_session_students WHERE session_id = $1', params: [sessionId] },
        ...[...new Set(studentIds)].map(studentId => ({
            sql: 'INSERT INTO summer_session_students (session_id, student_id) VALUES ($1, $2)',
            params: [sessionId, studentId]
        }))
    ]);
    await createAuditLog('SET_SUMMER_SESSION_STUDENTS', 'SummerSession', sessionId, `${studentIds.length} students`);
};

export type { DBSummerSession };
