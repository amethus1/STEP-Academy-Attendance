// Database types shared across all query modules
// Re-export SchoolYear from root types for convenience
export type { SchoolYear } from '../types';

// --- Core DB Schema Types ---

export interface DBStudent {
    id: string;
    student_number: string | null;
    first_name: string;
    last_name: string;
    dob: string | null;
    gender: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_email: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    photo_url: string | null;
    custom_fields: string | null;
}

export interface DBEnrollment {
    id: string;
    student_id: string;
    school_year: string;
    start_date: string;
    end_date: string | null;
    grade_level: string;
    campus: string | null;
    status: string;
    sped_504: string | null;
    drg_offense: string | null;
    days_assigned: number;
    credit_days: number;
    comments: string | null;
}

export interface DBAttendance {
    id: string;
    student_id: string;
    enrollment_id: string;
    date: string;
    presence: string;
    comment: string | null;
}

export interface DBHoliday {
    date: string;
    name: string;
    school_year: string | null;
}

export interface DBAuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: string | null;
    user_id: string | null;
    timestamp: string;
}

export interface DBAppSetting {
    key: string;
    value: string;
    updated_at: string;
}

export interface DBSchoolYear {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
}

// --- Composite Types for UI ---

export interface StudentWithEnrollment extends DBStudent, DBEnrollment {
    studentId: string;
    enrollmentId: string;
    days_attended: number;
}

export interface StudentSearchOptions {
    schoolYear: string;
    searchTerm?: string;
    status?: string;
    campus?: string;
    gradeLevel?: string;
    sped504?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export interface UniqueStudentRow {
    studentId: string;
    student_number: string | null;
    first_name: string;
    last_name: string;
    dob: string | null;
    gender: string | null;
    photo_url: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_email: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    custom_fields: string | null;
    latest_enrollment_id: string;
    latest_school_year: string;
    latest_grade_level: string;
    latest_campus: string | null;
    latest_status: string;
    latest_start_date: string;
    latest_end_date: string | null;
    latest_days_assigned: number;
    latest_credit_days: number;
    latest_sped_504: string | null;
    latest_drg_offense: string | null;
    latest_comments: string | null;
    enrollment_count: number;
    total_days_attended: number;
    latest_days_attended: number;
}

export interface UniqueStudentSearchOptions {
    schoolYear?: string;
    status?: string;
    campus?: string;
    gradeLevel?: string;
    sped504?: string;
    searchTerm?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
}

export interface SchoolYearDefinition {
    name: string;
    start_date: string;
    end_date: string;
}

