import { AppSettings } from "../types";

const SETTINGS_KEY = 'attendanceAppSettings';

// A more logical default order for all permanent columns.
const DEFAULT_COLUMN_ORDER = [
    'lastName', 'firstName', 'id', 'status', 
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
};

export const getSettings = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // Merge with defaults to ensure all keys are present
      return { ...defaultSettings, ...parsed };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Failed to parse settings from localStorage', error);
    return defaultSettings;
  }
};

export const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage', error);
  }
};