import { AppData, Student, AttendanceRecord, Holiday, CustomFieldDefinition, StudentStatus, Presence } from '../types';
import { BaseDirectory, readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { documentDir, join } from '@tauri-apps/api/path';

const APP_DATA_FILE = 'data.json';
const BACKUP_PREFIX = 'data_backup_';
const APP_DIR_NAME = 'StepAcademyAttendance';
const LOCAL_STORAGE_KEY = 'attendanceAppData';
const CONFIG_FILE = 'config.json';

interface AppConfig {
  storageLocation: string | null; // null means default (Documents/StepAcademyAttendance)
}

const generateSampleData = (): AppData => {
  const localToISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Use current school year dates
  const today = new Date();
  const currentYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1; // School year starts in Aug
  const schoolYearStart = `${currentYear}-08-15`; // Aug 15
  const registrationDate = `${currentYear}-08-10`; // Aug 10 (before school starts)
  const entryDate = `${currentYear}-08-19`; // First Monday after Aug 15

  const firstNames = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia", "James", "Amelia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Alexander", "Harper", "Michael", "Camila", "Daniel", "Gianna", "Mateo", "Abigail", "Logan", "Luna", "Jackson", "Ella"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

  const students: Student[] = [];
  for (let i = 1; i <= 30; i++) {
    const firstName = firstNames[i - 1];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    students.push({
      id: `SS${currentYear * 100 + i}`,
      firstName: firstName,
      lastName: lastName,
      registrationDate: registrationDate,
      entryDate: entryDate,
      campus: `Campus ${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      gradeLevel: `${Math.floor(Math.random() * 4) + 9}`, // 9, 10, 11, 12
      sped504: ['None', 'SPED', '504'][Math.floor(Math.random() * 3)],
      drgOffense: ['Yes', 'No'][Math.floor(Math.random() * 2)],
      creditDays: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
      daysAssigned: 45,
      status: StudentStatus.Active,
      comments: `Current school year student.`,
      customFields: {},
      photoUrl: null,
      guardianName: `${firstName}'s Guardian`,
      guardianPhone: '555-123-4567',
      emergencyContactName: `Emergency Contact`,
      emergencyContactPhone: '555-987-6543'
    });
  }

  const attendance: AttendanceRecord[] = [];
  const startDate = new Date(entryDate + 'T12:00:00Z');
  for (const student of students) {
    let currentDate = new Date(startDate);
    // Only generate attendance up to today
    while (currentDate <= today) {
      const dayOfWeek = currentDate.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays only
        const presence = Math.random() > 0.1 ? Presence.Present : Presence.Absent; // 10% absence rate
        attendance.push({
          studentId: student.id,
          date: localToISODateString(currentDate),
          presence: presence
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const holidays: Holiday[] = [
    { date: `${currentYear}-11-28`, name: 'Thanksgiving' },
    { date: `${currentYear}-11-29`, name: 'Thanksgiving Break' },
    { date: `${currentYear}-12-23`, name: 'Winter Break Start' },
    { date: `${currentYear}-12-24`, name: 'Christmas Eve' },
    { date: `${currentYear}-12-25`, name: 'Christmas Day' },
  ];

  return { students, attendance, holidays, customFieldDefinitions: [] };
};

const emptyData: AppData = {
  students: [],
  attendance: [],
  holidays: [],
  customFieldDefinitions: [],
};

// --- Config Helpers ---

const getConfig = async (): Promise<AppConfig> => {
  try {
    const existsConf = await exists(CONFIG_FILE, { baseDir: BaseDirectory.AppConfig });
    if (existsConf) {
      const content = await readTextFile(CONFIG_FILE, { baseDir: BaseDirectory.AppConfig });
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn("Failed to load config, using default", e);
  }
  return { storageLocation: null };
};

export const setStorageLocation = async (path: string): Promise<void> => {
  try {
    const config: AppConfig = { storageLocation: path };
    // Ensure config dir exists (it usually does for AppConfig but good to be safe)
    // Actually BaseDirectory.AppConfig writes usually handle creation or require it.
    // Let's assume writeTextFile handles it if we use recursive create? use writeTextFile directly.
    // Note: AppConfig dir might not exist on first run.
    await writeTextFile(CONFIG_FILE, JSON.stringify(config), { baseDir: BaseDirectory.AppConfig });
  } catch (e) {
    console.error("Failed to save config", e);
    throw e;
  }
};

export const getStorageLocation = async (): Promise<string> => {
  const config = await getConfig();
  if (config.storageLocation) {
    return config.storageLocation;
  }
  // Default
  return await getDefaultstorageLocation();
};

const getDefaultstorageLocation = async (): Promise<string> => {
  const docDir = await documentDir();
  return await join(docDir, APP_DIR_NAME);
}

// --- Storage Path Helpers ---

const getAppDirPath = async (): Promise<string> => {
  // 1. Check Config
  const config = await getConfig();
  if (config.storageLocation) {
    return config.storageLocation;
  }
  // 2. Default
  return APP_DIR_NAME; // Relative to Documents if using BaseDirectory.Document
};

// Ensure the directory exists
const ensureAppDir = async (): Promise<void> => {
  const config = await getConfig();
  if (config.storageLocation) {
    // Absolute path check
    // We can't use `exists` with BaseDirectory.Document if it's an absolute path elsewhere.
    // We must check if `config.storageLocation` exists.
    // Wait, `exists` needs a baseDir OR if we pass absolute path, can we use BaseDirectory?
    // With Tauri v2, if given absolute path, we usually don't provide BaseDirectory or explicit 'null' isn't options.
    // However, the `fs` plugin supports absolute paths if capabilities allow scopes.
    // But we can't easily check 'exists' of absolute path without knowing if it's allowed.
    // Assuming users pick a path we have access to (via dialog open), we should add that path to scope dynamically?
    // Tauri 2 store/dialog usually handles scope.

    // Actually, if user picks a path, we do NOT get permission automatically persisted across restarts unless we use `fs-scope` APIs or similar.
    // Wait, implementing "Arbitrary Location" in Tauri requires careful scope management or `fs` access to everything (not recommended) or just the folder.
    // For this task, let's assume we might face Scope issues if not carefully handled.
    // BUT for simplicity in this iteration:
    // If we use `config.storageLocation`, we treat it as an absolute path.
    // We'll try to read/write using that absolute path.
    // If it fails due to permission, we might need `fs:allow-home-read-recursive` or similar? 
    // Or we just rely on the user picking a folder inside Documents/Downloads etc which we might have generic access to.

    // Refined plan: We will TRY to just use the path. If permission error, we catch it.

    const existsDir = await exists(config.storageLocation);
    if (!existsDir) {
      await mkdir(config.storageLocation, { recursive: true });
    }
    return;
  }

  // Default behavior (Documents relative)
  const dirPath = APP_DIR_NAME;
  const dirExists = await exists(dirPath, { baseDir: BaseDirectory.Document });
  if (!dirExists) {
    await mkdir(dirPath, { baseDir: BaseDirectory.Document, recursive: true });
  }
};

const getFilePath = async (filename: string): Promise<{ path: string, options?: { baseDir: BaseDirectory } }> => {
  const config = await getConfig();
  if (config.storageLocation) {
    // Using absolute path
    // We need to join manually or use path API
    // Let's use string concat for now to avoid async path API overhead if possible, or just `/`
    // MacOS/Linux use `/`.
    const joinStr = config.storageLocation.endsWith('/') ? '' : '/';
    return { path: `${config.storageLocation}${joinStr}${filename}` };
  }

  // Default (Relative to Documents)
  return { path: `${APP_DIR_NAME}/${filename}`, options: { baseDir: BaseDirectory.Document } };
};

// --- Core Storage Functions ---

const migrateFromLocalStorage = (): AppData | null => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      console.log("Migrating data from LocalStorage...");
      const parsed = JSON.parse(data);
      if (!parsed.customFieldDefinitions) parsed.customFieldDefinitions = [];
      return parsed;
    }
  } catch (e) {
    console.error("Migration failed", e);
  }
  return null;
};

export const getAppData = async (): Promise<AppData> => {
  try {
    await ensureAppDir();
    const fileInfo = await getFilePath(APP_DATA_FILE);

    // Check existence
    // We need to spread options if they exist
    const fileExists = await exists(fileInfo.path, fileInfo.options);

    if (fileExists) {
      const content = await readTextFile(fileInfo.path, fileInfo.options);
      const parsedData = JSON.parse(content);

      // Backward compatibility / Schema correction
      if (!parsedData.customFieldDefinitions) {
        parsedData.customFieldDefinitions = [];
      }
      if (parsedData.students) {
        parsedData.students = parsedData.students.map((s: any) => ({
          ...s,
          campus: s.campus || '',
          gradeLevel: s.gradeLevel || '',
          sped504: s.sped504 || 'None',
          drgOffense: s.drgOffense || '',
          creditDays: s.creditDays || 0,
          customFields: s.customFields || {},
          photoUrl: s.photoUrl || null,
          guardianName: s.guardianName || '',
          guardianPhone: s.guardianPhone || '',
          emergencyContactName: s.emergencyContactName || '',
          emergencyContactPhone: s.emergencyContactPhone || '',
        }));
      }
      return parsedData;
    } else {
      // **Migration Step**: Check LocalStorage
      // Only check localStorage if we are in Default Mode? 
      // Or if user selected a new empty folder, maybe we shouldn't migrate from legacy localStorage?
      // Let's migrate only if it's the default path OR config is null.
      // Actually, if user picks a specific folder, they probably want to start fresh or chose a folder WITH data.
      // If folder is empty, maybe offer migration?
      // For simplicity: Always check migration if data.json is missing.

      const migratedData = migrateFromLocalStorage();
      if (migratedData) {
        await saveAppData(migratedData);
        return migratedData;
      }

      // No data anywhere, generate sample
      const sampleData = generateSampleData();
      await saveAppData(sampleData);
      return sampleData;
    }
  } catch (error) {
    console.error("Failed to load app data from filesystem", error);
    return emptyData;
  }
};

export const saveAppData = async (data: AppData, backup: boolean = true) => {
  try {
    await ensureAppDir();
    const fileInfo = await getFilePath(APP_DATA_FILE);

    // Write file
    await writeTextFile(fileInfo.path, JSON.stringify(data, null, 2), fileInfo.options);

  } catch (error) {
    console.error("Failed to save app data to filesystem", error);
    throw error;
  }
};

// Helper for Creating a specific Backup (e.g. before big changes)
export const createManualBackup = async (data: AppData): Promise<string> => {
  try {
    await ensureAppDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${BACKUP_PREFIX}${timestamp}.json`;
    const fileInfo = await getFilePath(filename);

    await writeTextFile(fileInfo.path, JSON.stringify(data, null, 2), fileInfo.options);
    return filename;
  } catch (e) {
    console.error("Backup failed", e);
    throw e;
  }
}

// Wrapper actions (Now Async)

export const saveStudents = async (students: Student[]) => {
  const data = await getAppData();
  data.students = students;
  await saveAppData(data);
};

export const saveAttendance = async (attendance: AttendanceRecord[]) => {
  const data = await getAppData();
  data.attendance = attendance;
  await saveAppData(data);
};

export const saveHolidays = async (holidays: Holiday[]) => {
  const data = await getAppData();
  data.holidays = holidays;
  await saveAppData(data);
};

export const saveCustomFieldDefinitions = async (definitions: CustomFieldDefinition[]) => {
  const data = await getAppData();
  data.customFieldDefinitions = definitions;
  await saveAppData(data);
};