// Data import/export database queries
import { getDb, withTransaction } from './index';
import { createAuditLog } from './auditQueries';
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

export const importData = async (data: {
    students: DBStudent[],
    enrollments: DBEnrollment[],
    attendance: DBAttendance[],
    holidays: DBHoliday[],
    schoolYears?: DBSchoolYear[],
    settings?: Record<string, any>
}) => {
    const { acquireWriteLock, getDb } = await import('./index');

    // Acquire write lock but don't use BEGIN/COMMIT to avoid lock contention
    const releaseLock = await acquireWriteLock();

    try {
        const db = await getDb();

        // Snapshot counts of what we're about to overwrite so an audit-log
        // reader can see exactly what was replaced (useful for recovery if
        // the import was unintentional).
        const [
            [{ count: studentsBefore }],
            [{ count: enrollmentsBefore }],
            [{ count: attendanceBefore }],
            [{ count: holidaysBefore }],
            [{ count: schoolYearsBefore }]
        ] = await Promise.all([
            db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM students"),
            db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM enrollments"),
            db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM attendance"),
            db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM holidays"),
            db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM school_years")
        ]);

        await createAuditLog(
            'Import Started',
            'System',
            null,
            `Replacing existing data: ${studentsBefore} students, ${enrollmentsBefore} enrollments, ${attendanceBefore} attendance records, ${holidaysBefore} holidays, ${schoolYearsBefore} school years`
        );

        // Clear existing data (order matters due to foreign keys)
        await db.execute("DELETE FROM attendance");
        await db.execute("DELETE FROM enrollments");
        await db.execute("DELETE FROM students");
        await db.execute("DELETE FROM holidays");
        await db.execute("DELETE FROM school_years");

        // Insert new data
        for (const s of data.students) {
            await db.execute(
                `INSERT INTO students (id, student_number, first_name, last_name, dob, gender, guardian_name, guardian_phone, guardian_email, emergency_contact_name, emergency_contact_phone, photo_url, custom_fields)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                // Older export files predate gender/guardian_email, so default them.
                [s.id, s.student_number, s.first_name, s.last_name, s.dob, s.gender ?? null, s.guardian_name, s.guardian_phone, s.guardian_email ?? null, s.emergency_contact_name, s.emergency_contact_phone, s.photo_url, s.custom_fields]
            );
        }

        for (const e of data.enrollments) {
            await db.execute(
                `INSERT INTO enrollments (id, student_id, school_year, start_date, end_date, grade_level, campus, status, sped_504, drg_offense, days_assigned, credit_days, comments)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [e.id, e.student_id, e.school_year, e.start_date, e.end_date, e.grade_level, e.campus, e.status, e.sped_504, e.drg_offense, e.days_assigned, e.credit_days, e.comments]
            );
        }

        for (const a of data.attendance) {
            await db.execute(
                `INSERT INTO attendance (id, student_id, enrollment_id, date, presence, comment) VALUES ($1, $2, $3, $4, $5, $6)`,
                [a.id, a.student_id, a.enrollment_id, a.date, a.presence, a.comment ?? null]
            );
        }

        for (const h of data.holidays) {
            await db.execute(
                `INSERT INTO holidays (date, name, school_year) VALUES ($1, $2, $3)`,
                [h.date, h.name, h.school_year]
            );
        }

        if (data.schoolYears && data.schoolYears.length > 0) {
            for (const sy of data.schoolYears) {
                await db.execute(
                    `INSERT INTO school_years (id, name, start_date, end_date) VALUES ($1, $2, $3, $4)`,
                    [sy.id, sy.name, sy.start_date, sy.end_date]
                );
            }
        }

        if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
                await db.execute(
                    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ($1, $2, datetime('now'))`,
                    [key, JSON.stringify(value)]
                );
            }
        }

        await createAuditLog('Import Data', 'System', null, `Imported ${data.students.length} students, ${data.attendance.length} attendance records`);
    } finally {
        releaseLock();
    }
};
