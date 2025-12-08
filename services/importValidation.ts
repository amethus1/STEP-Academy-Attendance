// Schema validation for import data
import { z } from 'zod';

export interface ValidationError {
    field: string;
    message: string;
    row?: number;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    summary: {
        studentsCount: number;
        enrollmentsCount: number;
        attendanceCount: number;
        holidaysCount: number;
        schoolYearsCount: number;
    };
}

// Zod Schemas
const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
const optionalDateSchema = dateSchema.nullable().optional();

// Presence Enum
const PresenceSchema = z.enum(['Present', 'Absent', 'Tardy', 'Excused'] as const);

const StudentSchema = z.object({
    id: uuidSchema,
    student_number: z.string().nullable().optional(),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    dob: optionalDateSchema,
    guardian_name: z.string().nullable().optional(),
    guardian_phone: z.string().nullable().optional(),
    emergency_contact_name: z.string().nullable().optional(),
    emergency_contact_phone: z.string().nullable().optional(),
    photo_url: z.string().nullable().optional(),
    custom_fields: z.string().nullable().optional() // JSON string
});

const EnrollmentSchema = z.object({
    id: uuidSchema,
    student_id: uuidSchema,
    school_year: z.string().min(1, "School year is required"),
    start_date: dateSchema,
    end_date: optionalDateSchema,
    grade_level: z.string().min(1, "Grade level is required"),
    campus: z.string().nullable().optional(),
    status: z.string().min(1, "Status is required"),
    sped_504: z.string().nullable().optional(),
    drg_offense: z.string().nullable().optional(),
    days_assigned: z.number().int().nonnegative().default(0),
    credit_days: z.number().int().nonnegative().default(0),
    comments: z.string().nullable().optional()
});

const AttendanceSchema = z.object({
    id: uuidSchema,
    student_id: uuidSchema,
    enrollment_id: uuidSchema,
    date: dateSchema,
    presence: PresenceSchema,
    comment: z.string().nullable().optional()
});

const HolidaySchema = z.object({
    date: dateSchema,
    name: z.string().min(1, "Holiday name is required"),
    school_year: z.string().nullable().optional()
});

const SchoolYearSchema = z.object({
    id: uuidSchema.or(z.string()), // ID might not be UUID in old data? Let's check. Default to string if unsure, but schema likely UUID.
    name: z.string().min(1),
    start_date: dateSchema,
    end_date: dateSchema
});

// Full Import Schema
const ImportDataSchema = z.object({
    students: z.array(StudentSchema),
    enrollments: z.array(EnrollmentSchema),
    attendance: z.array(AttendanceSchema),
    holidays: z.array(HolidaySchema),
    schoolYears: z.array(SchoolYearSchema).optional(),
    settings: z.record(z.string(), z.any()).optional()
});

/**
 * Validates import data structure and referential integrity using Zod.
 * Returns detailed validation results with errors and warnings.
 */
export const validateImportData = (data: any): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 1. Zod Schema Validation
    const parseResult = ImportDataSchema.safeParse(data);

    if (!parseResult.success) {
        // Collect Zod errors
        parseResult.error.issues.forEach(err => {
            // Path is like ['students', 0, 'first_name']
            const path = err.path;
            const field = path.join('.');
            let row: number | undefined;

            // Try to extract row index if it's an array item
            if (path.length >= 2 && typeof path[1] === 'number') {
                row = path[1];
            }

            errors.push({
                field: field,
                message: err.message,
                row: row
            });
        });

        // Basic structural failure returns early
        if (!data || !Array.isArray(data.students)) {
            return {
                valid: false,
                errors,
                warnings,
                summary: { studentsCount: 0, enrollmentsCount: 0, attendanceCount: 0, holidaysCount: 0, schoolYearsCount: 0 }
            };
        }
    }

    // Proceed with logic validation even if schema has errors, to find referential issues?
    // Or maybe use the raw data if schema failed but arrays exist?
    // Let's rely on the inputs being arrays at least.

    // Safety check if arrays are missing despite schema check (or if we want to proceed partially)
    const students = Array.isArray(data?.students) ? data.students : [];
    const enrollments = Array.isArray(data?.enrollments) ? data.enrollments : [];
    const attendance = Array.isArray(data?.attendance) ? data.attendance : [];
    const holidays = Array.isArray(data?.holidays) ? data.holidays : [];
    const schoolYears = Array.isArray(data?.schoolYears) ? data.schoolYears : [];

    // 2. Referential Integrity
    const studentIds = new Set<string>();
    const enrollmentIds = new Set<string>();

    // Duplicate ID checks
    students.forEach((s: any, i: number) => {
        if (s.id) {
            if (studentIds.has(s.id)) {
                warnings.push({ field: `students.${i}.id`, message: `Duplicate student ID: ${s.id}` });
            }
            studentIds.add(s.id);
        }
    });

    enrollments.forEach((e: any, i: number) => {
        if (e.id) {
            if (enrollmentIds.has(e.id)) {
                warnings.push({ field: `enrollments.${i}.id`, message: `Duplicate enrollment ID: ${e.id}` });
            }
            enrollmentIds.add(e.id);
        }

        // Check student_id exists
        if (e.student_id && !studentIds.has(e.student_id)) {
            errors.push({ field: `enrollments.${i}.student_id`, message: `References missing student ID: ${e.student_id}` });
        }
    });

    // Check attendance references (batch check first 500 or all?)
    // User requested stricter validation -> check all if reasonable, or optimize. 
    // Let's check all but ensure perfs. Set lookups are fast.
    attendance.forEach((a: any, i: number) => {
        if (a.student_id && !studentIds.has(a.student_id)) {
            errors.push({ field: `attendance.${i}.student_id`, message: `References missing student ID: ${a.student_id}` });
        }
        if (a.enrollment_id && !enrollmentIds.has(a.enrollment_id)) {
            errors.push({ field: `attendance.${i}.enrollment_id`, message: `References missing enrollment ID: ${a.enrollment_id}` });
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary: {
            studentsCount: students.length,
            enrollmentsCount: enrollments.length,
            attendanceCount: attendance.length,
            holidaysCount: holidays.length,
            schoolYearsCount: schoolYears.length
        }
    };
};

/**
 * Quick check to determine if data is in standard format (vs legacy format)
 */
export const isStandardFormat = (data: any): boolean => {
    return (
        Array.isArray(data?.students) &&
        Array.isArray(data?.enrollments) &&
        Array.isArray(data?.attendance) &&
        Array.isArray(data?.holidays)
    );
};

