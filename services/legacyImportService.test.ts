import { describe, it, expect } from 'vitest';
import {
    isLegacyFormat,
    deriveSchoolYear,
    getCurrentSchoolYear,
    convertLegacyData
} from './legacyImportService';

describe('legacyImportService', () => {
    describe('isLegacyFormat', () => {
        it('should return true for legacy format (students + attendance, no enrollments)', () => {
            const data = {
                students: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
                attendance: [{ studentId: '1', date: '2024-01-15', presence: 'Present' }]
            };
            expect(isLegacyFormat(data)).toBe(true);
        });

        it('should return false for standard format (has enrollments)', () => {
            const data = {
                students: [{ id: '123e4567-e89b-12d3-a456-426614174000' }],
                enrollments: [{ id: '123e4567-e89b-12d3-a456-426614174001' }],
                attendance: [],
                holidays: []
            };
            expect(isLegacyFormat(data)).toBe(false);
        });

        it('should return false for empty/invalid data', () => {
            expect(isLegacyFormat(null)).toBe(false);
            expect(isLegacyFormat({})).toBe(false);
            expect(isLegacyFormat({ students: 'not-array' })).toBe(false);
        });
    });

    describe('deriveSchoolYear', () => {
        it('should return 2024-2025 for August 2024 date', () => {
            expect(deriveSchoolYear('2024-08-15')).toBe('2024-2025');
        });

        it('should return 2024-2025 for December 2024 date', () => {
            expect(deriveSchoolYear('2024-12-15')).toBe('2024-2025');
        });

        it('should return 2023-2024 for March 2024 date (before July)', () => {
            expect(deriveSchoolYear('2024-03-15')).toBe('2023-2024');
        });

        it('should return 2023-2024 for June 2024 date', () => {
            expect(deriveSchoolYear('2024-06-01')).toBe('2023-2024');
        });

        it('should return 2023-2024 for July 2024 date (month < 7 in JS)', () => {
            // July is month 6 in JavaScript (0-indexed), which is < 7 (August)
            expect(deriveSchoolYear('2024-07-15')).toBe('2023-2024');
        });

        it('should return current school year for undefined date', () => {
            const result = deriveSchoolYear(undefined);
            expect(result).toBe(getCurrentSchoolYear());
        });
    });

    describe('convertLegacyData', () => {
        const legacyData = {
            students: [
                {
                    id: 'STU001',
                    firstName: 'John',
                    lastName: 'Doe',
                    entryDate: '2024-08-15',
                    gradeLevel: '9',
                    campus: 'Main',
                    status: 'Active',
                    guardianName: 'Jane Doe',
                    customFields: { allergies: 'Peanuts' }
                }
            ],
            attendance: [
                { studentId: 'STU001', date: '2024-08-15', presence: 'Present' },
                { studentId: 'STU001', date: '2024-08-16', presence: 'Absent' }
            ],
            holidays: [
                { date: '2024-11-28', name: 'Thanksgiving' }
            ],
            customFieldDefinitions: [
                { id: 'allergies', name: 'Allergies', type: 'text' }
            ]
        };

        it('should convert students with new UUIDs', () => {
            const result = convertLegacyData(legacyData);

            expect(result.students).toHaveLength(1);
            expect(result.students[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            expect(result.students[0].first_name).toBe('John');
            expect(result.students[0].last_name).toBe('Doe');
        });

        it('should preserve legacy ID as student_number', () => {
            const result = convertLegacyData(legacyData);
            expect(result.students[0].student_number).toBe('STU001');
        });

        it('should create enrollments from student data', () => {
            const result = convertLegacyData(legacyData);

            expect(result.enrollments).toHaveLength(1);
            expect(result.enrollments[0].student_id).toBe(result.students[0].id);
            expect(result.enrollments[0].school_year).toBe('2024-2025');
            expect(result.enrollments[0].grade_level).toBe('9');
            expect(result.enrollments[0].campus).toBe('Main');
        });

        it('should transform attendance with new IDs', () => {
            const result = convertLegacyData(legacyData);

            expect(result.attendance).toHaveLength(2);
            expect(result.attendance[0].student_id).toBe(result.students[0].id);
            expect(result.attendance[0].enrollment_id).toBe(result.enrollments[0].id);
            expect(result.attendance[0].date).toBe('2024-08-15');
            expect(result.attendance[0].presence).toBe('Present');
        });

        it('should skip attendance for unknown student IDs', () => {
            const dataWithOrphanAttendance = {
                ...legacyData,
                attendance: [
                    ...legacyData.attendance,
                    { studentId: 'UNKNOWN', date: '2024-08-17', presence: 'Present' }
                ]
            };

            const result = convertLegacyData(dataWithOrphanAttendance);
            expect(result.attendance).toHaveLength(2); // Only 2, not 3
        });

        it('should transform holidays with derived school year', () => {
            const result = convertLegacyData(legacyData);

            expect(result.holidays).toHaveLength(1);
            expect(result.holidays[0].name).toBe('Thanksgiving');
            expect(result.holidays[0].school_year).toBe('2024-2025');
        });

        it('should include custom field definitions in settings', () => {
            const result = convertLegacyData(legacyData);

            expect(result.settings?.customFieldDefinitions).toHaveLength(1);
            expect(result.settings?.customFieldDefinitions[0].id).toBe('allergies');
        });

        it('should handle student custom fields as JSON string', () => {
            const result = convertLegacyData(legacyData);

            expect(result.students[0].custom_fields).toBe('{"allergies":"Peanuts"}');
        });

        it('should handle missing optional fields with defaults', () => {
            const minimalData = {
                students: [{ id: 'MIN1', firstName: 'Min', lastName: 'Student' }],
                attendance: []
            };

            const result = convertLegacyData(minimalData);

            expect(result.enrollments[0].campus).toBe('Main');
            expect(result.enrollments[0].grade_level).toBe('Unknown');
            expect(result.enrollments[0].status).toBe('Active');
        });
    });

    // Test with exact user schema format from their backup files
    describe('convertLegacyData - Exact User Schema', () => {
        /**
         * This test uses the EXACT schema format from user's backup file:
         * - Required fields: id, firstName, lastName, registrationDate, entryDate, etc.
         * - photoUrl can be null
         * - No enrollments array (that's what makes it legacy)
         */
        const exactUserBackup = {
            students: [
                {
                    id: "SS300002",
                    firstName: "Ariana",
                    lastName: "Gomez",
                    registrationDate: "2025-02-01",
                    entryDate: "2025-02-03",
                    campus: "Campus B",
                    gradeLevel: "10",
                    sped504: "504",
                    drgOffense: "No",
                    creditDays: 1,
                    daysAssigned: 30,
                    status: "Active",
                    comments: "New intake.",
                    customFields: {},
                    photoUrl: null,
                    guardianName: "Maria Gomez",
                    guardianPhone: "555-222-3333",
                    emergencyContactName: "Carlos Gomez",
                    emergencyContactPhone: "555-444-5555"
                }
            ],
            attendance: [
                { studentId: "SS300002", date: "2025-02-03", presence: "Present" },
                { studentId: "SS300002", date: "2025-02-04", presence: "Absent" }
            ]
        };

        it('should detect exact user schema as legacy format', () => {
            expect(isLegacyFormat(exactUserBackup)).toBe(true);
        });

        it('should convert exact user schema students correctly', () => {
            const result = convertLegacyData(exactUserBackup);

            expect(result.students).toHaveLength(1);
            expect(result.students[0].first_name).toBe('Ariana');
            expect(result.students[0].last_name).toBe('Gomez');
            expect(result.students[0].student_number).toBe('SS300002');
        });

        it('should preserve all enrollment fields from user schema', () => {
            const result = convertLegacyData(exactUserBackup);

            const enrollment = result.enrollments[0];
            expect(enrollment.start_date).toBe('2025-02-03');
            expect(enrollment.campus).toBe('Campus B');
            expect(enrollment.grade_level).toBe('10');
            expect(enrollment.sped_504).toBe('504');
            expect(enrollment.drg_offense).toBe('No');
            expect(enrollment.credit_days).toBe(1);
            expect(enrollment.days_assigned).toBe(30);
            expect(enrollment.status).toBe('Active');
            expect(enrollment.comments).toBe('New intake.');
        });

        it('should preserve guardian/emergency contact info', () => {
            const result = convertLegacyData(exactUserBackup);

            const student = result.students[0];
            expect(student.guardian_name).toBe('Maria Gomez');
            expect(student.guardian_phone).toBe('555-222-3333');
            expect(student.emergency_contact_name).toBe('Carlos Gomez');
            expect(student.emergency_contact_phone).toBe('555-444-5555');
        });

        it('should handle photoUrl: null correctly', () => {
            const result = convertLegacyData(exactUserBackup);
            expect(result.students[0].photo_url).toBeNull();
        });

        it('should derive school year for 2025 February date', () => {
            const result = convertLegacyData(exactUserBackup);
            // Feb 2025 is < August, so school year is 2024-2025
            expect(result.enrollments[0].school_year).toBe('2024-2025');
        });

        it('should convert all attendance records with correct presence values', () => {
            const result = convertLegacyData(exactUserBackup);

            expect(result.attendance).toHaveLength(2);
            expect(result.attendance[0].presence).toBe('Present');
            expect(result.attendance[1].presence).toBe('Absent');
            expect(result.attendance[0].date).toBe('2025-02-03');
            expect(result.attendance[1].date).toBe('2025-02-04');
        });

        it('should handle full backup with multiple students', () => {
            const multiStudentBackup = {
                students: [
                    {
                        id: "SS300001",
                        firstName: "Jacob",
                        lastName: "Reed",
                        registrationDate: "2025-01-10",
                        entryDate: "2025-01-13",
                        campus: "Campus A",
                        gradeLevel: "11",
                        sped504: "None",
                        drgOffense: "No",
                        creditDays: 3,
                        daysAssigned: 40,
                        status: "Active",
                        comments: "Transferred from Campus C.",
                        customFields: {},
                        photoUrl: null,
                        guardianName: "Sarah Reed",
                        guardianPhone: "555-111-2222",
                        emergencyContactName: "John Reed",
                        emergencyContactPhone: "555-333-4444"
                    },
                    ...exactUserBackup.students
                ],
                attendance: [
                    { studentId: "SS300001", date: "2025-01-13", presence: "Present" },
                    { studentId: "SS300001", date: "2025-01-14", presence: "Tardy" },
                    ...exactUserBackup.attendance
                ]
            };

            const result = convertLegacyData(multiStudentBackup);

            expect(result.students).toHaveLength(2);
            expect(result.enrollments).toHaveLength(2);
            expect(result.attendance).toHaveLength(4);

            // Verify each student's attendance links correctly
            const jacobStudent = result.students.find(s => s.first_name === 'Jacob');
            const jacobEnrollment = result.enrollments.find(e => e.student_id === jacobStudent?.id);
            const jacobAttendance = result.attendance.filter(a => a.student_id === jacobStudent?.id);

            expect(jacobAttendance).toHaveLength(2);
            expect(jacobAttendance[0].enrollment_id).toBe(jacobEnrollment?.id);
        });
    });
});
