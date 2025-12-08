import { AppSettings, AutoBackupFrequency } from '../types';
import { getExportData } from '../db/queries';
import type { DBStudent, DBEnrollment, DBAttendance, DBHoliday } from '../db/types';
import { queryClient } from '../lib/react-query';
import { getDb } from '../db';
import { getSettings, saveSettings } from './settingsService';

/**
 * Check if auto-backup should run based on frequency and last backup date
 */
export const shouldRunAutoBackup = (settings: AppSettings): boolean => {
    if (settings.autoBackupFrequency === 'off') return false;
    if (!settings.backupFolderPath) return false;

    const now = new Date();
    const lastBackup = settings.lastAutoBackupDate ? new Date(settings.lastAutoBackupDate) : null;

    switch (settings.autoBackupFrequency) {
        case 'onAppStart':
            return true; // Always run on app start

        case 'onDataChange':
            return false; // This is triggered separately after data mutations, not on app start

        case 'daily': {
            if (!lastBackup) return true;
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            return lastBackup < oneDayAgo;
        }

        case 'weekly': {
            if (!lastBackup) return true;
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return lastBackup < oneWeekAgo;
        }

        default:
            return false;
    }
};

/**
 * Generate a timestamped backup filename
 */
export const generateBackupFilename = (): string => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `step-academy-backup-${timestamp}.json`;
};

/**
 * Perform a backup to the specified folder
 * Returns true if successful, false otherwise
 */
export const performBackup = async (folderPath: string): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    try {
        const { join } = await import('@tauri-apps/api/path');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');

        const data = await getExportData();
        const content = JSON.stringify(data, null, 2);
        const filename = generateBackupFilename();
        const filePath = await join(folderPath, filename);

        await writeTextFile(filePath, content);

        // Update last backup date in settings
        const currentSettings = await getSettings();
        await saveSettings({ ...currentSettings, lastAutoBackupDate: new Date().toISOString() });

        return { success: true, filePath };
    } catch (error) {
        console.error('Backup failed:', error);
        return { success: false, error: String(error) };
    }
};

/**
 * Run auto-backup if needed based on settings
 * Should be called on app startup
 */
export const runAutoBackupIfNeeded = async (): Promise<void> => {
    const settings = await getSettings();

    if (!shouldRunAutoBackup(settings)) {
        return;
    }

    if (!settings.backupFolderPath) {
        console.log('Auto-backup: No backup folder configured');
        return;
    }

    console.log('Running auto-backup...');
    const result = await performBackup(settings.backupFolderPath);

    if (result.success) {
        console.log('Auto-backup completed:', result.filePath);
    } else {
        console.error('Auto-backup failed:', result.error);
    }
};

/**
 * Run backup after data change (for 'onDataChange' frequency)
 */
export const runBackupOnDataChange = async (): Promise<void> => {
    const settings = await getSettings();

    if (settings.autoBackupFrequency !== 'onDataChange') {
        return;
    }

    if (!settings.backupFolderPath) {
        return;
    }

    console.log('Running backup after data change...');
    await performBackup(settings.backupFolderPath);
};

/**
 * Restore data from a backup file
 */
export const performRestore = async (filePath: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        const { importData } = await import('../db/queries'); // Ensure this is exported from db/queries index

        const db = await getDb();
        // Give SQLite more time to wait for locks during restore
        await db.execute("PRAGMA busy_timeout = 10000");

        const content = await readTextFile(filePath);
        const data = JSON.parse(content);

        const deriveSchoolYear = (isoDate?: string) => {
            if (!isoDate) return '2024-2025';
            const d = new Date(isoDate + 'T12:00:00Z');
            const startYear = d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
            return `${startYear}-${startYear + 1}`;
        };

        // Helper to convert legacy backups that only contain students/attendance(/holidays)
        const convertLegacyBackup = (legacy: any) => {
            const newStudents: DBStudent[] = [];
            const newEnrollments: DBEnrollment[] = [];
            const newAttendance: DBAttendance[] = [];
            const newHolidays: DBHoliday[] = [];

            const idMap = new Map<string, { studentUuid: string; enrollmentUuid: string }>();

            for (const s of legacy.students as any[]) {
                const studentUuid = crypto.randomUUID();
                const enrollmentUuid = crypto.randomUUID();
                const schoolYear = deriveSchoolYear(s.entryDate);

                idMap.set(s.id, { studentUuid, enrollmentUuid });

                newStudents.push({
                    id: studentUuid,
                    student_number: s.id ?? null,
                    first_name: s.firstName,
                    last_name: s.lastName,
                    dob: null,
                    guardian_name: s.guardianName || null,
                    guardian_phone: s.guardianPhone || null,
                    emergency_contact_name: s.emergencyContactName || null,
                    emergency_contact_phone: s.emergencyContactPhone || null,
                    photo_url: s.photoUrl || null,
                    custom_fields: JSON.stringify(s.customFields || {})
                });

                newEnrollments.push({
                    id: enrollmentUuid,
                    student_id: studentUuid,
                    school_year: schoolYear,
                    start_date: s.entryDate || new Date().toISOString().split('T')[0],
                    end_date: s.exitDate || null,
                    grade_level: s.gradeLevel || 'Unknown',
                    campus: s.campus || 'Main',
                    status: s.status || 'Active',
                    sped_504: s.sped504 || null,
                    drg_offense: s.drgOffense || null,
                    days_assigned: s.daysAssigned || 0,
                    credit_days: s.creditDays || 0,
                    comments: s.comments || null
                });
            }

            for (const a of legacy.attendance as any[]) {
                const map = idMap.get(a.studentId);
                if (map) {
                    newAttendance.push({
                        id: crypto.randomUUID(),
                        student_id: map.studentUuid,
                        enrollment_id: map.enrollmentUuid,
                        date: a.date,
                        presence: a.presence,
                        comment: a.comment ?? null
                    });
                }
            }

            if (Array.isArray(legacy.holidays)) {
                for (const h of legacy.holidays) {
                    if (h?.date && h?.name) {
                        newHolidays.push({
                            date: h.date,
                            name: h.name,
                            school_year: deriveSchoolYear(h.date)
                        });
                    }
                }
            }

            return {
                students: newStudents,
                enrollments: newEnrollments,
                attendance: newAttendance,
                holidays: newHolidays,
                settings: {
                    customFieldDefinitions: Array.isArray(legacy.customFieldDefinitions) ? legacy.customFieldDefinitions : []
                }
            };
        };

        // Normalize possible key names/cases
        const students = Array.isArray(data.students)
            ? data.students
            : Array.isArray((data as any).Students)
                ? (data as any).Students
                : [];
        const enrollments = Array.isArray(data.enrollments)
            ? data.enrollments
            : Array.isArray((data as any).Enrollments)
                ? (data as any).Enrollments
                : null;
        const attendance = Array.isArray(data.attendance)
            ? data.attendance
            : Array.isArray((data as any).Attendance)
                ? (data as any).Attendance
                : [];
        const holidays = Array.isArray(data.holidays)
            ? data.holidays
            : Array.isArray((data as any).Holidays)
                ? (data as any).Holidays
                : [];
        const schoolYears = Array.isArray(data.schoolYears)
            ? data.schoolYears
            : Array.isArray((data as any).SchoolYears)
                ? (data as any).SchoolYears
                : [];

        if (students.length === 0) {
            throw new Error("Invalid backup file format: Missing required data");
        }

        // Cancel any active queries to release read locks before restore
        await queryClient.cancelQueries();

        const importPayload = enrollments
            ? {
                ...data,
                students,
                enrollments,
                attendance,
                holidays,
                schoolYears,
                settings: data.settings ?? {}
            }
            : convertLegacyBackup({
                students,
                attendance,
                holidays,
                customFieldDefinitions: data.customFieldDefinitions
            });

        // Retry a few times if SQLite reports the DB is locked
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await importData(importPayload);
                await queryClient.invalidateQueries();
                return { success: true };
            } catch (e: any) {
                const locked = String(e).toLowerCase().includes('database is locked');
                if (locked && attempt < maxAttempts) {
                    await new Promise(res => setTimeout(res, 300 * attempt));
                    continue;
                }
                throw e;
            }
        }

        throw new Error("Restore failed after retries");
    } catch (error) {
        console.error('Restore failed:', error);
        return { success: false, error: String(error) };
    }
};

/**
 * Get human-readable label for backup frequency
 */
export const getFrequencyLabel = (frequency: AutoBackupFrequency): string => {
    switch (frequency) {
        case 'off': return 'Off';
        case 'daily': return 'Daily';
        case 'weekly': return 'Weekly';
        case 'onAppStart': return 'Every App Start';
        case 'onDataChange': return 'On Data Change';
        default: return 'Unknown';
    }
};
