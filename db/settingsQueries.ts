// Settings database queries
import { getDb } from './index';
import { DBAppSetting } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const getAppSettingsFromDB = async (): Promise<Record<string, unknown>> => {
    const db = await getDb();
    const rows = await db.select<DBAppSetting[]>("SELECT key, value FROM app_settings");

    const settings: Record<string, unknown> = {};
    for (const row of rows) {
        try {
            settings[row.key] = JSON.parse(row.value);
        } catch {
            settings[row.key] = row.value;
        }
    }
    return settings;
};

export const saveAppSettingsToDB = async (settings: Record<string, unknown>): Promise<void> => {
    const { withTransaction } = await import('./index');
    // All keys or none, so a failure cannot leave a half-applied settings change.
    await withTransaction(Object.entries(settings).map(([key, value]) => ({
        sql: `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ($1, $2, datetime('now'))`,
        params: [key, JSON.stringify(value)]
    })));
};

export const getAppSettingFromDB = async (key: string): Promise<unknown> => {
    const db = await getDb();
    const rows = await db.select<DBAppSetting[]>("SELECT value FROM app_settings WHERE key = $1", [key]);

    if (rows.length === 0) return null;

    try {
        return JSON.parse(rows[0].value);
    } catch {
        return rows[0].value;
    }
};
