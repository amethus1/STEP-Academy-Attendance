import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WeeklyStudentRow } from './WeeklyStudentRow';
import { StudentStatus, Presence } from '../../types';
import type { ExtendedStudent } from '../../services/mappers';

const student = {
    id: 's1', enrollmentId: 'e1', studentNumber: 'S1', firstName: 'Ada', lastName: 'Lovelace',
    campus: 'North', gradeLevel: '9', status: StudentStatus.Active,
    entryDate: '2025-09-01', registrationDate: '2025-09-01', exitDate: '',
    sped504: 'None', drgOffense: '', daysAssigned: 45, creditDays: 0, daysAttended: 0,
    daysRemaining: 45, projectedReleaseDate: '2025-11-01', comments: '', photoUrl: null,
    dob: '', gender: '', guardianName: '', guardianPhone: '', guardianEmail: '',
    emergencyContactName: '', emergencyContactPhone: '', customFields: {}
} as ExtendedStudent;

// Mon 8 Sep - Fri 12 Sep 2025
const days = [8, 9, 10, 11, 12].map(d => new Date(2025, 8, d, 12));
const columns = [{ id: 'select', label: '' }, { id: 'lastName', label: 'Last Name' }];
const noHolidays = new Set<string>();
const isHoliday = () => false;

const renderRow = (props: Partial<React.ComponentProps<typeof WeeklyStudentRow>> = {}) => {
    const all: React.ComponentProps<typeof WeeklyStudentRow> = {
        student, displayDays: days, attendanceMap: {}, fixedColumns: columns,
        onMarkAttendance: vi.fn(), isHoliday, calendar: noHolidays, todayStr: '2025-09-10',
        isSelected: false, onToggleSelection: vi.fn(), focusedDayIndex: null,
        ...props
    };
    return render(<MemoryRouter><table><tbody><WeeklyStudentRow {...all} /></tbody></table></MemoryRouter>);
};

describe('WeeklyStudentRow', () => {
    // Regression: the memo comparison ignored isSelected, so the row never
    // re-rendered and the controlled checkbox snapped back to unchecked.
    it('shows the checkbox as ticked once the row is selected', () => {
        const props = {
            student, displayDays: days, attendanceMap: {}, fixedColumns: columns,
            onMarkAttendance: vi.fn(), isHoliday, calendar: noHolidays, todayStr: '2025-09-10',
            onToggleSelection: vi.fn(), focusedDayIndex: null
        };
        const { rerender } = render(
            <MemoryRouter><table><tbody><WeeklyStudentRow {...props} isSelected={false} /></tbody></table></MemoryRouter>
        );
        const checkbox = screen.getByRole('checkbox', { name: 'Select Ada Lovelace' }) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);

        rerender(<MemoryRouter><table><tbody><WeeklyStudentRow {...props} isSelected={true} /></tbody></table></MemoryRouter>);
        expect((screen.getByRole('checkbox', { name: 'Select Ada Lovelace' }) as HTMLInputElement).checked).toBe(true);
    });

    it('offers marking only for school days up to today, from the entry date on', () => {
        renderRow();
        // Mon, Tue, Wed are markable (today is Wed); Thu and Fri are in the future.
        expect(screen.getAllByRole('button', { name: 'Mark as absent' })).toHaveLength(3);
    });

    it('marks holidays and offers no buttons for them', () => {
        renderRow({ isHoliday: d => d === '2025-09-09', calendar: new Set(['2025-09-09']) });
        expect(screen.getByText('HOLIDAY')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: 'Mark as absent' })).toHaveLength(2);
    });

    it('reports the clicked day and status', () => {
        const onMarkAttendance = vi.fn();
        renderRow({ onMarkAttendance, attendanceMap: { '2025-09-08': Presence.Present } });
        fireEvent.click(screen.getAllByRole('button', { name: 'Mark as absent' })[0]);
        expect(onMarkAttendance).toHaveBeenCalledWith('s1', '2025-09-08', Presence.Present, Presence.Absent);
    });
});
