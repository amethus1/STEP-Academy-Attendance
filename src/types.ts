export enum StudentStatus {
  Active = 'Active',
  Completed = 'Completed',
  Withdrawn = 'Withdrawn',
}

export enum Presence {
  Present = 'Present',
  Absent = 'Absent',
}

export interface Student {
  studentId: string;
  lastName: string;
  firstName: string;
  entryDate: string | Date;        // YYYY-MM-DD or Date
  registrationDate: string | Date; // YYYY-MM-DD or Date
  campus?: string;
  gradeLevel?: string;
  sped504?: string;
  drg?: string;
  creditDays?: number;
  daysAssigned: number;
  status: StudentStatus;
  comments?: string;
  /** Additional custom fields */
  customFields?: Record<string, string>;
}

export interface AttendanceRecord {
  logId: string;
  attendanceDate: string | Date;   // YYYY-MM-DD or Date
  studentId: string;
  presence: Presence;
}

export interface EnrichedStudent extends Student {
  daysAttended: number;
  daysRemaining: number;
  projectedReleaseDate: string; // YYYY-MM-DD
}
