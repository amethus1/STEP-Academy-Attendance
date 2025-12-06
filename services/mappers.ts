import { StudentWithEnrollment, DBHoliday, UniqueStudentRow, DBEnrollment } from '../db/queries';
import { Student, StudentStatus, Holiday } from '../types';
import { calculateDaysRemaining, calculateProjectedReleaseDate } from './studentLogic';
import { toISODateString } from './dateUtils';

export interface ExtendedStudent extends Student {
    enrollmentId: string; // Enforce enrollmentId presence
    daysAttended: number;
    daysRemaining: number;
    projectedReleaseDate: string;
}

export const mapDBStudentToUI = (data: StudentWithEnrollment, holidays: Holiday[], projectionStartOverride?: string): ExtendedStudent => {
    // Parse custom fields
    let customFields = {};
    try {
        customFields = data.custom_fields ? JSON.parse(data.custom_fields) : {};
    } catch (e) {
        console.error(`Failed to parse custom fields for student ${data.id}`, e);
    }

    const daysAttended = data.days_attended || 0;
    const creditDays = data.credit_days || 0;
    const daysAssigned = data.days_assigned || 45;
    const daysRemaining = calculateDaysRemaining(daysAssigned, daysAttended, creditDays);

    // Use override if provided, otherwise default to today
    const projectionStart = projectionStartOverride || toISODateString(new Date());


    const projectedReleaseDate = calculateProjectedReleaseDate(
        daysRemaining,
        holidays,
        projectionStart,
        data.status
    );

    return {
        id: data.studentId, // Note: DB query aliases 'id' as studentId for clarity in join
        enrollmentId: data.enrollmentId,
        studentNumber: data.student_number || data.studentId, // Fallback
        firstName: data.first_name,
        lastName: data.last_name,
        campus: data.campus || '',
        gradeLevel: data.grade_level,
        status: data.status as StudentStatus,
        entryDate: data.start_date,
        registrationDate: data.start_date, // Approximate if not distinct
        exitDate: data.end_date || '',
        sped504: data.sped_504 || 'None',
        drgOffense: data.drg_offense || '',
        daysAssigned,
        creditDays,
        daysAttended,
        daysRemaining,
        projectedReleaseDate,
        comments: data.comments || '',
        photoUrl: data.photo_url,
        guardianName: data.guardian_name || '',
        guardianPhone: data.guardian_phone || '',
        emergencyContactName: data.emergency_contact_name || '',
        emergencyContactPhone: data.emergency_contact_phone || '',
        customFields,
        masterId: data.studentId
    };
};

/**
 * Converts a single DB holiday to UI Holiday format.
 */
export const mapDBHolidayToHoliday = (dbHoliday: DBHoliday): Holiday => ({
    date: dbHoliday.date,
    name: dbHoliday.name
});

/**
 * Batch convert DB holidays to UI format.
 * Use this instead of inline mapping in pages.
 */
export const mapDBHolidaysToHolidays = (dbHolidays: DBHoliday[]): Holiday[] =>
    dbHolidays.map(mapDBHolidayToHoliday);

// --- NEW: Unified Student Types (one row per student) ---

/**
 * UI representation of a unique student (for roster).
 * Shows data from latest enrollment plus aggregates.
 */
export interface UniqueStudentUI {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    guardianName: string;
    guardianPhone: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    customFields: Record<string, string | number>;

    // Latest enrollment info
    latestEnrollmentId: string;
    currentGrade: string;
    currentCampus: string;
    currentStatus: StudentStatus;
    entryDate: string;
    exitDate: string;
    daysAssigned: number;
    creditDays: number;
    daysAttended: number;
    daysRemaining: number;
    projectedReleaseDate: string;
    sped504: string;
    drgOffense: string;
    comments: string;

    // Aggregates across ALL enrollments
    enrollmentCount: number;
    totalDaysAttended: number;
}

/**
 * Maps a UniqueStudentRow from DB to UI format.
 */
export const mapUniqueStudentToUI = (
    row: UniqueStudentRow,
    holidays: Holiday[],
    projectionStartDate?: string
): UniqueStudentUI => {
    let customFields = {};
    try {
        customFields = row.custom_fields ? JSON.parse(row.custom_fields) : {};
    } catch (e) {
        console.error(`Failed to parse custom fields for student ${row.studentId}`, e);
    }

    const daysAttended = row.latest_days_attended || 0;
    const creditDays = row.latest_credit_days || 0;
    const daysAssigned = row.latest_days_assigned || 45;
    const daysRemaining = calculateDaysRemaining(daysAssigned, daysAttended, creditDays);

    const projectionStart = projectionStartDate || toISODateString(new Date());
    const projectedReleaseDate = calculateProjectedReleaseDate(
        daysRemaining,
        holidays,
        projectionStart,
        row.latest_status
    );

    return {
        id: row.studentId,
        studentNumber: row.student_number || row.studentId,
        firstName: row.first_name,
        lastName: row.last_name,
        photoUrl: row.photo_url,
        guardianName: row.guardian_name || '',
        guardianPhone: row.guardian_phone || '',
        emergencyContactName: row.emergency_contact_name || '',
        emergencyContactPhone: row.emergency_contact_phone || '',
        customFields,

        latestEnrollmentId: row.latest_enrollment_id,
        currentGrade: row.latest_grade_level,
        currentCampus: row.latest_campus || '',
        currentStatus: row.latest_status as StudentStatus,
        entryDate: row.latest_start_date,
        exitDate: row.latest_end_date || '',
        daysAssigned,
        creditDays,
        daysAttended,
        daysRemaining,
        projectedReleaseDate,
        sped504: row.latest_sped_504 || 'None',
        drgOffense: row.latest_drg_offense || '',
        comments: row.latest_comments || '',

        enrollmentCount: row.enrollment_count,
        totalDaysAttended: row.total_days_attended
    };
};

/**
 * UI representation of an enrollment (for student detail history).
 */
export interface EnrollmentUI {
    id: string;
    schoolYear: string;
    gradeLevel: string;
    campus: string;
    status: StudentStatus;
    startDate: string;
    endDate: string;
    daysAssigned: number;
    creditDays: number;
    daysAttended: number;
    daysRemaining: number;
    projectedReleaseDate: string;
    sped504: string;
    drgOffense: string;
    comments: string;
}

/**
 * Maps a DB enrollment (with days_attended) to UI format.
 */
export const mapEnrollmentToUI = (
    enrollment: DBEnrollment & { days_attended: number },
    holidays: Holiday[],
    projectionStartDate?: string
): EnrollmentUI => {
    const daysAttended = enrollment.days_attended || 0;
    const creditDays = enrollment.credit_days || 0;
    const daysAssigned = enrollment.days_assigned || 45;
    const daysRemaining = calculateDaysRemaining(daysAssigned, daysAttended, creditDays);

    const projectionStart = projectionStartDate || toISODateString(new Date());
    const projectedReleaseDate = calculateProjectedReleaseDate(
        daysRemaining,
        holidays,
        projectionStart,
        enrollment.status
    );

    return {
        id: enrollment.id,
        schoolYear: enrollment.school_year,
        gradeLevel: enrollment.grade_level,
        campus: enrollment.campus || '',
        status: enrollment.status as StudentStatus,
        startDate: enrollment.start_date,
        endDate: enrollment.end_date || '',
        daysAssigned,
        creditDays,
        daysAttended,
        daysRemaining,
        projectedReleaseDate,
        sped504: enrollment.sped_504 || 'None',
        drgOffense: enrollment.drg_offense || '',
        comments: enrollment.comments || ''
    };
};
