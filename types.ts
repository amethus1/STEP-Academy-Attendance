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
}

export enum Presence {
  Present = "Present",
  Absent = "Absent",
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

export interface AppSettings {
  theme: Theme;
  defaultRoute: string;
  dateFormat: DateFormat;
  showConfirmations: boolean;
  rosterVisibleColumns: string[];
  rosterColumnOrder: string[];
  schoolYearStartDate: string; // ISO Date
}