// Data import/export database queries
import { getDb } from './index';
import { createAuditLog } from './auditQueries';
import { runAtomicImport, type ImportPayload } from './atomicImport';
import {
    DBStudent,
    DBEnrollment,
    DBAttendance,
    DBHoliday,
    DBSchoolYear
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DATA TRANSFER QUERIES (Import/Export)
// ═══════════════════════════════════════════════════════════════════════════

export const getExportData = async () => {
    const db = await getDb();
    const students = await db.select<DBStudent[]>("SELECT * FROM students");
    const enrollments = await db.select<DBEnrollment[]>("SELECT * FROM enrollments");
    const attendance = await db.select<DBAttendance[]>("SELECT * FROM attendance");
    const holidays = await db.select<DBHoliday[]>("SELECT * FROM holidays");
    const schoolYears = await db.select<DBSchoolYear[]>("SELECT * FROM school_years");

    // Get settings (v3+)
    const settingsRows = await db.select<{ key: string; value: string }[]>("SELECT key, value FROM app_settings");
    const settings: Record<string, any> = {};
    for (const row of settingsRows) {
        try {
            settings[row.key] = JSON.parse(row.value);
        } catch {
            settings[row.key] = row.value;
        }
    }

    await createAuditLog('Export Data', 'System', null, `Exported ${students.length} students, ${enrollments.length} enrollments`);

    return { students, enrollments, attendance, holidays, schoolYears, settings };
};

/**
 * Replace all students, enrollments and attendance (and holidays / school
 * years when the file includes them) with the contents of an import or backup.
 *
 * All or nothing: a safety copy of the current data is written first, and the
 * replacement itself either completes or leaves the existing data exactly as it
 * was. Throws ImportValidationError, with the problems listed, when the file is
 * rejected.
 */
export const importData = async (data: ImportPayload) => {
    const { acquireWriteLock, getDb, resetConnections } = await import('./index');
    const { writeSafetyBackup } = await import('../services/backupService');

    const releaseLock = await acquireWriteLock();

    try {
        const db = await getDb();

        // Snapshot counts of what we're about to overwrite so an audit-log
        // reader can see exactly what was replaced.
        const countOf = async (table: string) =>
            (await db.select<{ count: number }[]>(`SELECT COUNT(*) as count FROM ${table}`))[0]?.count ?? 0;
        const before = {
            students: await countOf('students'),
            enrollments: await countOf('enrollments'),
            attendance: await countOf('attendance'),
            holidays: await countOf('holidays'),
            schoolYears: await countOf('school_years')
        };

        const safetyCopy = await writeSafetyBackup();

        await createAuditLog(
            'Import Started',
            'System',
            null,
            `Replacing existing data: ${before.students} students, ${before.enrollments} enrollments, ${before.attendance} attendance records, ${before.holidays} holidays, ${before.schoolYears} school years. Safety copy: ${safetyCopy}`
        );

        await runAtomicImport(db, data, resetConnections);

        await createAuditLog('Import Data', 'System', null, `Imported ${data.students.length} students, ${data.attendance.length} attendance records`);
    } finally {
        releaseLock();
    }
};
