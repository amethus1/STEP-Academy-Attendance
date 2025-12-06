import { AppSettings } from "../types";
import { getAppSettingsFromDB, saveAppSettingsToDB } from "../db/queries";

const SETTINGS_KEY = 'attendanceAppSettings';

// A more logical default order for all permanent columns.
const DEFAULT_COLUMN_ORDER = [
  'lastName', 'firstName', 'studentNumber', 'status',
  'daysRemaining', 'projectedReleaseDate',
  'daysAttended', 'daysAssigned', 'creditDays',
  'campus', 'gradeLevel', 'sped504', 'drgOffense',
  'entryDate', 'registrationDate', 'comments'
];

export const defaultSettings: AppSettings = {
  theme: 'system',
  defaultRoute: '/attendance',
  dateFormat: 'MM/DD/YYYY',
  showConfirmations: true,
  // By default, all permanent columns are now visible.
  rosterVisibleColumns: DEFAULT_COLUMN_ORDER,
  rosterColumnOrder: DEFAULT_COLUMN_ORDER,
  schoolYearStartDate: `${new Date().getFullYear()}-08-01`,
  schoolYearEndDate: `${new Date().getFullYear() + 1}-07-31`,
  activeSchoolYear: '', // Empty means auto-detect based on current date
  customFieldDefinitions: [],
  // Backup settings
  backupFolderPath: null,
  autoBackupFrequency: 'off',
  lastAutoBackupDate: null,
  rosterFilters: {
    status: 'All',
    campus: 'All',
    gradeLevel: 'All',
    sped504: 'All',
    entryDateFrom: '',
    entryDateTo: ''
  },
  weeklyFilters: {
    status: 'All',
    grade: 'All',
    sped: 'All'
  }
};

/**
 * Get settings from SQLite database.
 * Falls back to localStorage for migration from older versions.
 */
export const getSettings = async (): Promise<AppSettings> => {
  try {
    // Try SQLite first
    const dbSettings = await getAppSettingsFromDB();

    // If we have settings in DB, merge with defaults and return
    if (Object.keys(dbSettings).length > 0) {
      return { ...defaultSettings, ...dbSettings };
    }

    // Fall back to localStorage for migration
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      const merged = { ...defaultSettings, ...parsed };

      // Migrate to SQLite
      await saveSettingsToDB(merged);

      // Optionally clear localStorage after successful migration
      // localStorage.removeItem(SETTINGS_KEY);

      return merged;
    }

    return defaultSettings;
  } catch (error) {
    console.error('Failed to get settings from database:', error);

    // Ultimate fallback to localStorage
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        return { ...defaultSettings, ...JSON.parse(storedSettings) };
      }
    } catch {
      // Ignore
    }

    return defaultSettings;
  }
};

/**
 * Save settings to SQLite database (and localStorage as backup).
 */
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await saveSettingsToDB(settings);

    // Also save to localStorage as backup
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to database:', error);

    // Fallback to localStorage only
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
};

/**
 * Save partial settings update to SQLite.
 */
export const saveSettingsToDB = async (settings: Partial<AppSettings>): Promise<void> => {
  await saveAppSettingsToDB(settings as Record<string, any>);
};

/**
 * Sync getter for initial render (uses localStorage as cache).
 * This provides a synchronous way to get settings for React initial state.
 */
export const getSettingsSync = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      return { ...defaultSettings, ...JSON.parse(storedSettings) };
    }
    return defaultSettings;
  } catch {
    return defaultSettings;
  }
};