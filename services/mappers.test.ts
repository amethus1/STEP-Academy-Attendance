import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    mapDBStudentToUI,
    mapDBHolidayToHoliday,
    mapDBHolidaysToHolidays,
    mapUniqueStudentToUI,
    mapEnrollmentToUI
} from './mappers';
import { StudentWithEnrollment, DBHoliday, UniqueStudentRow, DBEnrollment } from '../db/queries';
import { StudentStatus } from '../types';

// Mock date to ensure consistent test results
vi.mock('./dateUtils', async () => {
    const actual = await vi.importActual('./dateUtils');
    return {
        ...actual,
        toISODateString: (date: Date) => '2024-01-15'
    };
});

describe('mappers', () => {
    const mockHolidays = [
        { date: '2024-01-01', name: 'New Year' },
        { date: '2024-12-25', name: 'Christmas' }
    ];

    describe('mapDBHolidayToHoliday', () => {
        it('should convert DB holiday to UI format', () => {
            const dbHoliday: DBHoliday = {
                date: '2024-07-04',
                name: 'Independence Day',
                school_year: '2024-2025'
            };

            const result = mapDBHolidayToHoliday(dbHoliday);

            expect(result).toEqual({
                date: '2024-07-04',
                name: 'Independence Day'
            });
        });

        it('should handle null school_year', () => {
            const dbHoliday: DBHoliday = {
                date: '2024-03-15',
                name: 'Spring Break',
                school_year: null
            };

            const result = mapDBHolidayToHoliday(dbHoliday);

            expect(result.date).toBe('2024-03-15');
            expect(result.name).toBe('Spring Break');
        });
    });

    describe('mapDBHolidaysToHolidays', () => {
        it('should convert array of DB holidays', () => {
            const dbHolidays: DBHoliday[] = [
                { date: '2024-01-01', name: 'New Year', school_year: '2024-2025' },
                { date: '2024-12-25', name: 'Christmas', school_year: '2024-2025' }
            ];

            const result = mapDBHolidaysToHolidays(dbHolidays);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ date: '2024-01-01', name: 'New Year' });
            expect(result[1]).toEqual({ date: '2024-12-25', name: 'Christmas' });
        });

        it('should return empty array for empty input', () => {
            expect(mapDBHolidaysToHolidays([])).toEqual([]);
        });
    });

    describe('mapDBStudentToUI', () => {
        const mockStudent: StudentWithEnrollment = {
            id: 'student-123',
            student_id: 'student-123',
            studentId: 'student-123',
            enrollmentId: 'enrollment-456',
            gender: null,
            guardian_email: null,
            student_number: 'S001',
            first_name: 'John',
            last_name: 'Doe',
            dob: '2010-05-15',
            guardian_name: 'Jane Doe',
            guardian_phone: '555-1234',
            emergency_contact_name: 'Bob Smith',
            emergency_contact_phone: '555-5678',
            photo_url: 'https://example.com/photo.jpg',
            custom_fields: '{"homeroom":"101","track":"A"}',
            school_year: '2024-2025',
            start_date: '2024-08-15',
            end_date: null,
            grade_level: '9',
            campus: 'Main',
            status: 'Active',
            sped_504: 'SPED',
            drg_offense: 'None',
            days_assigned: 45,
            credit_days: 5,
            comments: 'Good student',
            days_attended: 20
        };

        it('should map all fields correctly', () => {
            const result = mapDBStudentToUI(mockStudent, mockHolidays);

            expect(result.id).toBe('student-123');
            expect(result.enrollmentId).toBe('enrollment-456');
            expect(result.studentNumber).toBe('S001');
            expect(result.firstName).toBe('John');
            expect(result.lastName).toBe('Doe');
            expect(result.campus).toBe('Main');
            expect(result.gradeLevel).toBe('9');
            expect(result.status).toBe('Active');
            expect(result.sped504).toBe('SPED');
            expect(result.drgOffense).toBe('None');
            expect(result.daysAssigned).toBe(45);
            expect(result.creditDays).toBe(5);
            expect(result.daysAttended).toBe(20);
        });

        it('should calculate days remaining correctly', () => {
            const result = mapDBStudentToUI(mockStudent, mockHolidays);
            // daysRemaining = daysAssigned (45) - daysAttended (20) - creditDays (5) = 20
            expect(result.daysRemaining).toBe(20);
        });

        it('should parse custom fields correctly', () => {
            const result = mapDBStudentToUI(mockStudent, mockHolidays);

            expect(result.customFields).toEqual({
                homeroom: '101',
                track: 'A'
            });
        });

        it('should handle null custom fields', () => {
            const studentWithNullCustomFields = { ...mockStudent, custom_fields: null };
            const result = mapDBStudentToUI(studentWithNullCustomFields, mockHolidays);

            expect(result.customFields).toEqual({});
        });

        it('should handle invalid JSON in custom fields', () => {
            const studentWithBadJson = { ...mockStudent, custom_fields: 'not-valid-json' };
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const result = mapDBStudentToUI(studentWithBadJson, mockHolidays);

            expect(result.customFields).toEqual({});
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should use studentId as fallback for studentNumber', () => {
            const studentNoNumber = { ...mockStudent, student_number: null };
            const result = mapDBStudentToUI(studentNoNumber, mockHolidays);

            expect(result.studentNumber).toBe('student-123');
        });

        it('should handle null optional fields', () => {
            const minimalStudent: StudentWithEnrollment = {
                ...mockStudent,
                campus: null,
                end_date: null,
                sped_504: null,
                drg_offense: null,
                comments: null,
                guardian_name: null,
                guardian_phone: null,
                emergency_contact_name: null,
                emergency_contact_phone: null,
                photo_url: null
            };

            const result = mapDBStudentToUI(minimalStudent, mockHolidays);

            expect(result.campus).toBe('');
            expect(result.exitDate).toBe('');
            expect(result.sped504).toBe('None');
            expect(result.drgOffense).toBe('');
            expect(result.comments).toBe('');
            expect(result.guardianName).toBe('');
        });
    });

    describe('mapUniqueStudentToUI', () => {
        const mockUniqueStudent: UniqueStudentRow = {
            studentId: 'student-789',
            student_number: 'S002',
            dob: null,
            gender: null,
            guardian_email: null,
            first_name: 'Jane',
            last_name: 'Smith',
            photo_url: null,
            guardian_name: 'Parent Smith',
            guardian_phone: '555-9999',
            emergency_contact_name: 'Uncle Bob',
            emergency_contact_phone: '555-8888',
            custom_fields: '{}',
            latest_enrollment_id: 'enroll-001',
            latest_school_year: '2024-2025',
            latest_grade_level: '10',
            latest_campus: 'North',
            latest_status: 'Active',
            latest_start_date: '2024-08-20',
            latest_end_date: null,
            latest_days_assigned: 60,
            latest_credit_days: 0,
            latest_sped_504: '504',
            latest_drg_offense: null,
            latest_comments: 'Transfer student',
            enrollment_count: 2,
            total_days_attended: 50,
            latest_days_attended: 30
        };

        it('should map unique student correctly', () => {
            const result = mapUniqueStudentToUI(mockUniqueStudent, mockHolidays);

            expect(result.id).toBe('student-789');
            expect(result.firstName).toBe('Jane');
            expect(result.lastName).toBe('Smith');
            expect(result.currentGrade).toBe('10');
            expect(result.currentCampus).toBe('North');
            expect(result.currentStatus).toBe('Active');
            expect(result.enrollmentCount).toBe(2);
            expect(result.totalDaysAttended).toBe(50);
        });

        it('should calculate days remaining for latest enrollment', () => {
            const result = mapUniqueStudentToUI(mockUniqueStudent, mockHolidays);
            // daysRemaining = 60 - 30 - 0 = 30
            expect(result.daysRemaining).toBe(30);
        });

        it('should use custom projection start date', () => {
            const result = mapUniqueStudentToUI(mockUniqueStudent, mockHolidays, '2024-09-01');
            // The function uses the projection start for calculating projected release
            expect(result.projectedReleaseDate).toBeDefined();
        });
    });

    describe('mapEnrollmentToUI', () => {
        const mockEnrollment: DBEnrollment & { days_attended: number } = {
            id: 'enroll-123',
            student_id: 'student-456',
            school_year: '2023-2024',
            start_date: '2023-08-15',
            end_date: '2024-01-15',
            grade_level: '8',
            campus: 'South',
            status: 'Completed',
            sped_504: null,
            drg_offense: 'Minor',
            days_assigned: 45,
            credit_days: 2,
            comments: 'Successfully completed',
            days_attended: 43
        };

        it('should map enrollment correctly', () => {
            const result = mapEnrollmentToUI(mockEnrollment, mockHolidays);

            expect(result.id).toBe('enroll-123');
            expect(result.schoolYear).toBe('2023-2024');
            expect(result.gradeLevel).toBe('8');
            expect(result.campus).toBe('South');
            expect(result.status).toBe('Completed');
            expect(result.daysAssigned).toBe(45);
            expect(result.creditDays).toBe(2);
            expect(result.daysAttended).toBe(43);
        });

        it('should calculate days remaining correctly', () => {
            const result = mapEnrollmentToUI(mockEnrollment, mockHolidays);
            // 45 - 43 - 2 = 0
            expect(result.daysRemaining).toBe(0);
        });

        it('should handle null optional fields', () => {
            const minEnrollment: DBEnrollment & { days_attended: number } = {
                ...mockEnrollment,
                campus: null,
                sped_504: null,
                drg_offense: null,
                comments: null,
                end_date: null
            };

            const result = mapEnrollmentToUI(minEnrollment, mockHolidays);

            expect(result.campus).toBe('');
            expect(result.sped504).toBe('None');
            expect(result.drgOffense).toBe('');
            expect(result.comments).toBe('');
            expect(result.endDate).toBe('');
        });
    });
});
