import { StudentWithEnrollment } from '../db/queries';
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
