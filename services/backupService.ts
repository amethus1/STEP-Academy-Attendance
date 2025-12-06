import { AppSettings, AutoBackupFrequency } from '../types';
import { getExportData } from '../db/queries';
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

        case 'daily':
            if (!lastBackup) return true;
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            return lastBackup < oneDayAgo;

        case 'weekly':
            if (!lastBackup) return true;
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return lastBackup < oneWeekAgo;

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
        const currentSettings = getSettings();
        saveSettings({ ...currentSettings, lastAutoBackupDate: new Date().toISOString() });

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
    const settings = getSettings();

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
    const settings = getSettings();

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
