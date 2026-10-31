import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentForm } from './useStudentForm';
import { uniqueStudentToStudent, type UniqueStudentUI } from '../services/mappers';
import { StudentStatus, type Student } from '../types';

const rosterRow: UniqueStudentUI = {
    id: 'stu-1', studentNumber: 'S100', firstName: 'Grace', lastName: 'Hopper', photoUrl: null,
    dob: '2009-12-09', gender: 'Female', guardianName: 'Mary', guardianPhone: '555', guardianEmail: 'm@example.edu',
    emergencyContactName: 'Ann', emergencyContactPhone: '556', customFields: { homeroom: '12B' },
    summerSessionIds: [], latestEnrollmentId: 'enr-1', currentGrade: '10', currentCampus: 'North', currentStatus: StudentStatus.Completed,
    entryDate: '2024-08-15', exitDate: '2024-11-01', daysAssigned: 45, creditDays: 2, daysAttended: 43,
    daysRemaining: 0, projectedReleaseDate: 'Completed', sped504: '504', drgOffense: 'X', comments: '',
    enrollmentCount: 1, totalDaysAttended: 43
};

describe('uniqueStudentToStudent', () => {
    it('maps the roster names for the latest enrollment onto Student fields', () => {
        const student = uniqueStudentToStudent(rosterRow);
        expect(student).toMatchObject({
            id: 'stu-1', campus: 'North', gradeLevel: '10', status: StudentStatus.Completed,
            dob: '2009-12-09', gender: 'Female', guardianEmail: 'm@example.edu'
        });
    });
});

describe('useStudentForm re-enrolling a returning student', () => {
    const typeName = (result: { current: ReturnType<typeof useStudentForm> }) => {
        act(() => {
            result.current.handleChange({ target: { name: 'firstName', value: 'Grace' } } as React.ChangeEvent<HTMLInputElement>);
        });
        act(() => {
            result.current.handleChange({ target: { name: 'lastName', value: 'Hopper' } } as React.ChangeEvent<HTMLInputElement>);
        });
    };

    it('finds the match and re-enrolls under the same student id', () => {
        const existing: Student[] = [uniqueStudentToStudent(rosterRow)];
        const { result } = renderHook(() => useStudentForm(null, existing, true));
        typeName(result);

        expect(result.current.potentialMatch?.id).toBe('stu-1');
        act(() => result.current.handleReEnroll());

        // Regression: re-enroll assigned a new random id, creating a duplicate student.
        expect(result.current.formData.id).toBe('stu-1');
    });

    it('carries over campus, grade and profile details', () => {
        const { result } = renderHook(() => useStudentForm(null, [uniqueStudentToStudent(rosterRow)], true));
        typeName(result);
        act(() => result.current.handleReEnroll());

        // Regression: from the roster, campus and grade came through blank.
        expect(result.current.formData).toMatchObject({
            campus: 'North', gradeLevel: '10', sped504: '504',
            dob: '2009-12-09', gender: 'Female', guardianEmail: 'm@example.edu',
            customFields: { homeroom: '12B' }
        });
    });
});
