import { AppSettings, AutoBackupFrequency } from '../types';
import { getExportData, describeImportFailure } from '../db/queries';
import type { DBStudent, DBEnrollment, DBAttendance, DBHoliday, DBSchoolYear } from '../db/types';
import type { ImportPayload } from '../db/atomicImport';
import type { LegacyImportData, LegacyStudent, LegacyAttendance, LegacyHoliday } from './legacyImportService';
import { queryClient } from '../lib/react-query';
import { getSettings, updateSettings } from './settingsService';

/** Backup files this app writes start with one of these, so pruning never touches anything else. */
export const AUTO_BACKUP_PREFIX = 'step-academy-backup-';
export const SAFETY_BACKUP_PREFIX = 'step-academy-before-import-';

/** How many automatic backups to keep in the backup folder. */
export const AUTO_BACKUP_RETENTION = 30;
/** How many pre-import safety copies to keep. */
export const SAFETY_BACKUP_RETENTION = 10;

/**
 * Where backups go when the user has not chosen a folder. Inside the app's own
 * data directory, which the app is always allowed to write, so backups work out
 * of the box instead of silently doing nothing until a folder is configured.
 */
export const getDefaultBackupFolder = async (): Promise<string> => {
    const { appDataDir, join } = await import('@tauri-apps/api/path');
    return join(await appDataDir(), 'backups');
};

export const resolveBackupFolder = async (settings: AppSettings): Promise<string> =>
    settings.backupFolderPath || getDefaultBackupFolder();

/**
 * Names of backup files to delete so that only the newest `keep` remain.
 * Filenames embed an ISO timestamp, so lexical order is chronological.
 */
export const selectBackupsToPrune = (fileNames: string[], prefix: string, keep: number): string[] => {
    const ours = fileNames
        .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
        .sort();
    return ours.slice(0, Math.max(0, ours.length - keep));
};

/**
 * Check if auto-backup should run based on frequency and last backup date
 */
export const shouldRunAutoBackup = (settings: AppSettings): boolean => {
    if (settings.autoBackupFrequency === 'off') return false;

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
export const generateBackupFilename = (prefix: string = AUTO_BACKUP_PREFIX): string => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}${timestamp}.json`;
};

export interface BackupResult {
    success: boolean;
    filePath?: string;
    error?: string;
}

/** Delete our own older backups in `folderPath` beyond the newest `keep`. Best effort. */
const pruneBackups = async (folderPath: string, prefix: string, keep: number) => {
    try {
        const { join } = await import('@tauri-apps/api/path');
        const { readDir, remove } = await import('@tauri-apps/plugin-fs');
        const entries = await readDir(folderPath);
        const names = entries.filter(e => e.isFile).map(e => e.name);
        for (const name of selectBackupsToPrune(names, prefix, keep)) {
            await remove(await join(folderPath, name));
        }
    } catch (error) {
        // A failed cleanup must not turn a successful backup into a failure.
        console.error('Failed to prune old backups:', error);
    }
};

/**
 * Write a full backup into `folderPath`, creating the folder if needed and
 * keeping only the newest `keep` files written with the same prefix.
 */
export const performBackup = async (
    folderPath: string,
    options: { prefix?: string; keep?: number; recordAsLastBackup?: boolean } = {}
): Promise<BackupResult> => {
    const { prefix = AUTO_BACKUP_PREFIX, keep = AUTO_BACKUP_RETENTION, recordAsLastBackup = true } = options;
    try {
        const { join } = await import('@tauri-apps/api/path');
        const { writeTextFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');

        if (!(await exists(folderPath))) {
            await mkdir(folderPath, { recursive: true });
        }

        const data = await getExportData();
        const content = JSON.stringify(data, null, 2);
        const filePath = await join(folderPath, generateBackupFilename(prefix));

        await writeTextFile(filePath, content);
        await pruneBackups(folderPath, prefix, keep);

        if (recordAsLastBackup) {
            // Only this key: rewriting the whole settings object clobbered changes
            // made elsewhere in the meantime.
            await updateSettings({ lastAutoBackupDate: new Date().toISOString() });
        }

        return { success: true, filePath };
    } catch (error) {
        console.error('Backup failed:', error);
        return { success: false, error: String(error) };
    }
};

/**
 * Copy the current data aside before it is replaced by an import or restore.
 * Throws if the copy cannot be written: replacing the data without one would
 * leave no way back if the imported file turns out to be the wrong one.
 */
export const writeSafetyBackup = async (): Promise<string> => {
    const { join } = await import('@tauri-apps/api/path');
    const folder = await join(await getDefaultBackupFolder(), 'before-import');
    const result = await performBackup(folder, {
        prefix: SAFETY_BACKUP_PREFIX,
        keep: SAFETY_BACKUP_RETENTION,
        recordAsLastBackup: false
    });
    if (!result.success || !result.filePath) {
        throw new Error(
            `Could not save a safety copy of your current data before importing, so nothing was changed. ${result.error ?? ''}`.trim()
        );
    }
    return result.filePath;
};

/**
 * Run auto-backup if needed based on settings. Called on app startup; the
 * caller decides how to tell the user about a failure.
 */
export const runAutoBackupIfNeeded = async (): Promise<BackupResult | null> => {
    const settings = await getSettings();
    if (!shouldRunAutoBackup(settings)) return null;

    return performBackup(await resolveBackupFolder(settings));
};

// After a burst of edits (a whole class marked in a minute), take one backup
// once things go quiet rather than one per click.
const DATA_CHANGE_BACKUP_DELAY_MS = 60 * 1000;
let dataChangeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule a backup after data changes, for the 'onDataChange' frequency.
 * Call after every successful write; repeated calls collapse into one backup.
 */
export const runBackupOnDataChange = (onFailure?: (error: string) => void): void => {
    if (dataChangeTimer) clearTimeout(dataChangeTimer);
    dataChangeTimer = setTimeout(async () => {
        dataChangeTimer = null;
        const settings = await getSettings();
        if (settings.autoBackupFrequency !== 'onDataChange') return;

        const result = await performBackup(await resolveBackupFolder(settings));
        if (!result.success) onFailure?.(result.error ?? 'Unknown error');
    }, DATA_CHANGE_BACKUP_DELAY_MS);
};

/**
 * Restore data from a backup file
 */
export const performRestore = async (filePath: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        const { importData } = await import('../db/queries'); // Ensure this is exported from db/queries index

        const content = await readTextFile(filePath);
        const data: unknown = JSON.parse(content);
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid backup file format: not a backup object');
        }
        const raw = data as Record<string, unknown>;

        const deriveSchoolYear = (isoDate?: string) => {
            if (!isoDate) return '2024-2025';
            const d = new Date(isoDate + 'T12:00:00Z');
            const startYear = d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
            return `${startYear}-${startYear + 1}`;
        };

        // Helper to convert legacy backups that only contain students/attendance(/holidays)
        const convertLegacyBackup = (legacy: LegacyImportData): ImportPayload => {
            const newStudents: DBStudent[] = [];
            const newEnrollments: DBEnrollment[] = [];
            const newAttendance: DBAttendance[] = [];
            const newHolidays: DBHoliday[] = [];

            const idMap = new Map<string, { studentUuid: string; enrollmentUuid: string }>();

            for (const s of legacy.students) {
                const studentUuid = crypto.randomUUID();
                const enrollmentUuid = crypto.randomUUID();
                const schoolYear = deriveSchoolYear(s.entryDate);

                idMap.set(s.id, { studentUuid, enrollmentUuid });

                newStudents.push({
                    id: studentUuid,
                    student_number: s.id ?? null,
                    first_name: s.firstName,
                    last_name: s.lastName,
                    // Legacy files predate these fields; carry them if present.
                    dob: s.dob ?? null,
                    gender: s.gender ?? null,
                    guardian_name: s.guardianName || null,
                    guardian_phone: s.guardianPhone || null,
                    guardian_email: s.guardianEmail ?? null,
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

            for (const a of legacy.attendance ?? []) {
                const map = idMap.get(a.studentId);
                if (map) {
                    newAttendance.push({
                        id: crypto.randomUUID(),
                        student_id: map.studentUuid,
                        enrollment_id: map.enrollmentUuid,
                        date: a.date,
                        presence: a.presence,
                        comment: (a as { comment?: string | null }).comment ?? null
                    });
                }
            }

            const holidays = Array.isArray(legacy.holidays) ? legacy.holidays : undefined;
            for (const h of holidays ?? []) {
                if (h?.date && h?.name) {
                    newHolidays.push({ date: h.date, name: h.name, school_year: deriveSchoolYear(h.date) });
                }
            }

            return {
                students: newStudents,
                enrollments: newEnrollments,
                attendance: newAttendance,
                // Missing stays missing, so the import keeps the existing holidays.
                holidays: holidays ? newHolidays : undefined,
                settings: {
                    customFieldDefinitions: Array.isArray(legacy.customFieldDefinitions) ? legacy.customFieldDefinitions : []
                }
            };
        };

        // Accept either key casing. A key that is absent stays undefined rather
        // than becoming [], because the import treats an empty holiday or school
        // year list as "replace with nothing".
        const pick = (...keys: string[]): unknown[] | undefined => {
            for (const key of keys) {
                if (Array.isArray(raw[key])) return raw[key] as unknown[];
            }
            return undefined;
        };

        const students = pick('students', 'Students') ?? [];
        const enrollments = pick('enrollments', 'Enrollments');
        const attendance = pick('attendance', 'Attendance') ?? [];
        const holidays = pick('holidays', 'Holidays');
        const schoolYears = pick('schoolYears', 'SchoolYears');

        if (students.length === 0) {
            throw new Error("Invalid backup file format: Missing required data");
        }

        // Cancel any active queries to release read locks before restore
        await queryClient.cancelQueries();

        // Shapes are checked by the import itself, which rejects a malformed
        // file before replacing anything.
        const importPayload: ImportPayload = enrollments
            ? {
                students: students as DBStudent[],
                enrollments: enrollments as DBEnrollment[],
                attendance: attendance as DBAttendance[],
                holidays: holidays as DBHoliday[] | undefined,
                schoolYears: schoolYears as DBSchoolYear[] | undefined,
                settings: (raw.settings as Record<string, unknown> | undefined) ?? {}
            }
            : convertLegacyBackup({
                students: students as LegacyStudent[],
                attendance: attendance as LegacyAttendance[],
                holidays: holidays as LegacyHoliday[] | undefined,
                customFieldDefinitions: raw.customFieldDefinitions as LegacyImportData['customFieldDefinitions']
            });

        // Retry a few times if SQLite reports the DB is locked
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await importData(importPayload);
                await queryClient.invalidateQueries();
                return { success: true };
            } catch (e) {
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
        return { success: false, error: describeImportFailure(error) };
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
