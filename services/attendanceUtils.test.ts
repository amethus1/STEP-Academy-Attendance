import { describe, it, expect } from 'vitest';
import { groupAttendanceByDate, groupAttendanceByStudent } from './attendanceUtils';
import { AttendanceRecord, Presence } from '../types';

describe('attendanceUtils', () => {
    const mockAttendance: AttendanceRecord[] = [
        { studentId: 's1', date: '2024-01-01', presence: Presence.Present },
        { studentId: 's2', date: '2024-01-01', presence: Presence.Absent },
        { studentId: 's1', date: '2024-01-02', presence: Presence.Present },
    ];

    describe('groupAttendanceByDate', () => {
        it('should group records by date string', () => {
            const map = groupAttendanceByDate(mockAttendance);
            expect(map.size).toBe(2);
            expect(map.get('2024-01-01')).toHaveLength(2);
            expect(map.get('2024-01-02')).toHaveLength(1);
        });

        it('should return empty arrays for missing dates if queried safely (though Map return undefined)', () => {
            const map = groupAttendanceByDate(mockAttendance);
            expect(map.get('2024-01-99')).toBeUndefined();
        });
    });

    describe('groupAttendanceByStudent', () => {
        it('should group records by student ID', () => {
            const map = groupAttendanceByStudent(mockAttendance);
            expect(map.size).toBe(2);
            expect(map.get('s1')).toHaveLength(2);
            expect(map.get('s2')).toHaveLength(1);
        });
    });
});
