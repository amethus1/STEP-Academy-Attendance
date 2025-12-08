import { describe, it, expect } from 'vitest';
import { validateImportData } from './importValidation';

describe('importValidation', () => {
    const validStudent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        dob: '2010-01-01',
        guardian_name: 'Jane Doe',
        guardian_phone: '555-1212',
        emergency_contact_name: 'Bob',
        emergency_contact_phone: '555-1313',
        photo_url: null,
        custom_fields: null
    };

    const validEnrollment = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        student_id: '123e4567-e89b-12d3-a456-426614174000',
        school_year: '2023-2024',
        start_date: '2023-08-01',
        end_date: null,
        grade_level: '9',
        campus: 'West',
        status: 'Active',
        days_assigned: 180,
        credit_days: 0
    };

    const validAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        student_id: '123e4567-e89b-12d3-a456-426614174000',
        enrollment_id: '123e4567-e89b-12d3-a456-426614174001',
        date: '2023-09-01',
        presence: 'Present',
        comment: 'On time'
    };

    const validHoliday = {
        date: '2023-12-25',
        name: 'Christmas'
    };

    const validData = {
        students: [validStudent],
        enrollments: [validEnrollment],
        attendance: [validAttendance],
        holidays: [validHoliday],
        schoolYears: [],
        settings: { theme: 'dark' }
    };

    it('should validate correct data', () => {
        const result = validateImportData(validData);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should fail on invalid UUID', () => {
        const invalidData = {
            ...validData,
            students: [{ ...validStudent, id: '123' }]
        };
        const result = validateImportData(invalidData);
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toContain('id');
    });

    it('should fail on invalid date format', () => {
        const invalidData = {
            ...validData,
            attendance: [{ ...validAttendance, date: '09-01-2023' }]
        };
        const result = validateImportData(invalidData);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Invalid date');
    });

    it('should fail on invalid presence value', () => {
        const invalidData = {
            ...validData,
            attendance: [{ ...validAttendance, presence: 'Late' as any }]
        };
        const result = validateImportData(invalidData);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Invalid option');
    });

    it('should fail on missing referential integrity', () => {
        // Attendance points to non-existent student
        const invalidData = {
            ...validData,
            attendance: [{ ...validAttendance, student_id: '123e4567-e89b-12d3-a456-426614174999' }]
        };
        const result = validateImportData(invalidData);
        // Should find error in referential check (after Zod check passes)
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('References missing student ID'))).toBe(true);
    });

    it('should validate settings object', () => {
        const result = validateImportData(validData);
        expect(result.valid).toBe(true);
    });
});
