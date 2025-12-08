export enum StudentStatus {
  Active = "Active",
  Completed = "Completed",
  Withdrawn = "Withdrawn",
}

export interface CustomFieldDefinition {
  id: string; // e.g., 'homeroom'
  name: string; // e.g., 'Homeroom'
  type: 'text' | 'number' | 'date';
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  registrationDate: string; // ISO string YYYY-MM-DD
  entryDate: string; // ISO string YYYY-MM-DD
  campus: string;
  gradeLevel: string;
  sped504: string; // 'None', 'SPED', '504'
  drgOffense: string;
  creditDays: number;
  daysAssigned: number;
  status: StudentStatus;
  comments: string;
  customFields: Record<string, string | number>;
  // New fields for enhanced profile
  photoUrl: string | null;
  guardianName: string;
  guardianPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  masterId?: string; // Links multiple enrollment records for the same student
  studentNumber?: string; // The permanent/school-assigned ID (visible to user)
  exitDate?: string; // Date of withdrawal or completion
}

export enum Presence {
  Present = "Present",
  Absent = "Absent",
  Tardy = "Tardy",
  Excused = "Excused",
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // ISO string YYYY-MM-DD
  presence: Presence;
}

export interface Holiday {
  date: string; // ISO string YYYY-MM-DD
  name: string;
}

export interface AppData {
  students: Student[];
  attendance: AttendanceRecord[];
  holidays: Holiday[];
  customFieldDefinitions: CustomFieldDefinition[];
}

// --- App Settings ---
export type Theme = 'light' | 'dark' | 'system';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type AutoBackupFrequency = 'off' | 'daily' | 'weekly' | 'onAppStart' | 'onDataChange';

export interface AppSettings {
  theme: Theme;
  defaultRoute: string;
  dateFormat: DateFormat;
  showConfirmations: boolean;
  rosterVisibleColumns: string[];
  rosterColumnOrder: string[];
  schoolYearStartDate: string; // ISO Date (legacy, kept for fallback)
  schoolYearEndDate: string; // ISO Date (legacy, kept for fallback)
  activeSchoolYear: string; // Selected active school year name, e.g. "2024-2025"
  customFieldDefinitions: CustomFieldDefinition[];
  // Backup settings
  backupFolderPath: string | null;
  autoBackupFrequency: AutoBackupFrequency;
  lastAutoBackupDate: string | null;

  // Persistent Filters
  rosterFilters: {
    status: string;
    campus: string;
    gradeLevel: string;
    sped504: string;
    entryDateFrom: string;
    entryDateTo: string;
  };
  weeklyFilters: {
    status: string;
    grade: string;
    sped: string;
  };
}

export interface SchoolYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}