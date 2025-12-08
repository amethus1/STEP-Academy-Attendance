// Settings database queries
import { getDb } from './index';
import { DBAppSetting } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const getAppSettingsFromDB = async (): Promise<Record<string, any>> => {
    const db = await getDb();
    const rows = await db.select<DBAppSetting[]>("SELECT key, value FROM app_settings");

    const settings: Record<string, any> = {};
    for (const row of rows) {
        try {
            settings[row.key] = JSON.parse(row.value);
        } catch {
            settings[row.key] = row.value;
        }
    }
    return settings;
};

export const saveAppSettingsToDB = async (settings: Record<string, any>): Promise<void> => {
    const { acquireWriteLock } = await import('./index');
    const releaseLock = await acquireWriteLock();

    try {
        const { getDb } = await import('./index');
        const db = await getDb();

        for (const [key, value] of Object.entries(settings)) {
            await db.execute(
                `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ($1, $2, datetime('now'))`,
                [key, JSON.stringify(value)]
            );
        }
    } finally {
        releaseLock();
    }
};

export const getAppSettingFromDB = async (key: string): Promise<any | null> => {
    const db = await getDb();
    const rows = await db.select<DBAppSetting[]>("SELECT value FROM app_settings WHERE key = $1", [key]);

    if (rows.length === 0) return null;

    try {
        return JSON.parse(rows[0].value);
    } catch {
        return rows[0].value;
    }
};
