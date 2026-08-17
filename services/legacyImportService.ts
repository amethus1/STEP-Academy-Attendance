// Legacy data format import service
// Handles conversion from old backup format (no enrollments) to current schema

import {
    DBStudent,
    DBEnrollment,
    DBAttendance,
    DBHoliday,
    DBSchoolYear
} from '../db/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Legacy student format (pre-enrollment schema) */
export interface LegacyStudent {
    id: string;
    firstName: string;
    lastName: string;
    registrationDate?: string; // Legacy field - date student was registered
    entryDate?: string;        // Date student started attending
    exitDate?: string;
    gradeLevel?: string;
    campus?: string;
    status?: string;
    sped504?: string;
    drgOffense?: string;
    daysAssigned?: number;
    creditDays?: number;
    comments?: string;
    customFields?: Record<string, any>;
    photoUrl?: string | null;
    guardianName?: string;
    guardianPhone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}

/** Legacy attendance format */
export interface LegacyAttendance {
    studentId: string;
    date: string;
    presence: string;
}

/** Legacy holiday format */
export interface LegacyHoliday {
    date: string;
    name: string;
}

/** Legacy backup data structure */
export interface LegacyImportData {
    students: LegacyStudent[];
    attendance: LegacyAttendance[];
    holidays?: LegacyHoliday[];
    customFieldDefinitions?: any[];
}

/** Converted data ready for import */
export interface ConvertedImportData {
    students: DBStudent[];
    enrollments: DBEnrollment[];
    attendance: DBAttendance[];
    holidays: DBHoliday[];
    schoolYears: DBSchoolYear[];
    settings?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Checks if data is in legacy format (has students but no enrollments)
 * Attendance array may or may not be present
 */
export const isLegacyFormat = (data: any): data is LegacyImportData => {
    return (
        Array.isArray(data?.students) &&
        !Array.isArray(data?.enrollments)
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derives school year from an ISO date string.
 * Uses July 15 as the school year boundary (Aug 1 - July 14 = same school year)
 * @param isoDate - Date in YYYY-MM-DD format
 * @returns School year string like "2024-2025"
 */
export const deriveSchoolYear = (isoDate?: string): string => {
    if (!isoDate) return getCurrentSchoolYear();

    const d = new Date(isoDate + 'T12:00:00Z');
    const startYear = d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
};

/**
 * Gets current school year based on today's date
 */
export const getCurrentSchoolYear = (): string => {
    const today = new Date();
    const startYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CONVERSION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converts legacy backup data to current schema format.
 * - Creates UUID for each student
 * - Creates enrollment record for each student
 * - Maps legacy student ID to student_number field
 * - Links attendance records to new student/enrollment UUIDs
 * 
 * @param data - Legacy format backup data
 * @returns Converted data ready for importData()
 */
export const convertLegacyData = (data: LegacyImportData): ConvertedImportData => {
    const newStudents: DBStudent[] = [];
    const newEnrollments: DBEnrollment[] = [];
    const newAttendance: DBAttendance[] = [];
    const newHolidays: DBHoliday[] = [];

    // Map legacy student ID -> { studentUuid, enrollmentUuid }
    const idMap = new Map<string, { studentUuid: string; enrollmentUuid: string }>();

    // Process students
    for (const s of data.students) {
        const studentUuid = crypto.randomUUID();
        const enrollmentUuid = crypto.randomUUID();
        const schoolYear = deriveSchoolYear(s.entryDate);

        idMap.set(s.id, { studentUuid, enrollmentUuid });

        // Create student profile
        newStudents.push({
            id: studentUuid,
            student_number: s.id, // Legacy ID becomes student number
            first_name: s.firstName,
            last_name: s.lastName,
            // The legacy format has no date of birth, gender, or guardian email.
            dob: null,
            gender: null,
            guardian_name: s.guardianName || null,
            guardian_phone: s.guardianPhone || null,
            guardian_email: null,
            emergency_contact_name: s.emergencyContactName || null,
            emergency_contact_phone: s.emergencyContactPhone || null,
            photo_url: s.photoUrl || null,
            custom_fields: JSON.stringify(s.customFields || {})
        });

        // Create enrollment
        newEnrollments.push({
            id: enrollmentUuid,
            student_id: studentUuid,
            school_year: schoolYear,
            start_date: s.entryDate || new Date().toISOString().split('T')[0],
            end_date: s.exitDate || null,
            grade_level: s.gradeLevel || 'Unknown',
            campus: s.campus || 'Main',
            status: s.status || 'Active',
            sped_504: s.sped504 || null,
            drg_offense: s.drgOffense || null,
            days_assigned: s.daysAssigned || 0,
            credit_days: s.creditDays || 0,
            comments: s.comments || null
        });
    }

    // Process attendance (handle missing array gracefully)
    if (Array.isArray(data.attendance)) {
        for (const a of data.attendance) {
            const map = idMap.get(a.studentId);
            if (map) {
                newAttendance.push({
                    id: crypto.randomUUID(),
                    student_id: map.studentUuid,
                    enrollment_id: map.enrollmentUuid,
                    date: a.date,
                    presence: a.presence as any,
                    comment: null
                });
            }
        }
    }

    // Process holidays
    if (Array.isArray(data.holidays)) {
        for (const h of data.holidays) {
            if (h?.date && h?.name) {
                newHolidays.push({
                    date: h.date,
                    name: h.name,
                    school_year: deriveSchoolYear(h.date)
                });
            }
        }
    }

    // Collect unique school years from enrollments and create entries
    const uniqueYears = new Set<string>();
    for (const e of newEnrollments) {
        uniqueYears.add(e.school_year);
    }

    const newSchoolYears: DBSchoolYear[] = [];
    for (const yearName of uniqueYears) {
        // Parse year name like "2024-2025" to get start/end dates
        const [startYear, endYear] = yearName.split('-').map(Number);
        if (startYear && endYear) {
            newSchoolYears.push({
                id: crypto.randomUUID(),
                name: yearName,
                start_date: `${startYear}-08-01`,
                end_date: `${endYear}-07-31`
            });
        }
    }

    return {
        students: newStudents,
        enrollments: newEnrollments,
        attendance: newAttendance,
        holidays: newHolidays,
        schoolYears: newSchoolYears,
        settings: {
            customFieldDefinitions: Array.isArray(data.customFieldDefinitions)
                ? data.customFieldDefinitions
                : []
        }
    };
};
