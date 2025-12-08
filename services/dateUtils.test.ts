import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    toISODateString,
    getWeekDays,
    getStartOfWeek,
    getSchoolYearFromDate,
    addBusinessDays
} from './dateUtils';

// Mock settingsService for formatDateForDisplay tests
vi.mock('./settingsService', () => ({
    getSettings: vi.fn(() => ({ dateFormat: 'MM/DD/YYYY' })),
    getSettingsSync: vi.fn(() => ({ dateFormat: 'MM/DD/YYYY' }))
}));

describe('dateUtils', () => {
    describe('toISODateString', () => {
        it('should format date to YYYY-MM-DD', () => {
            const date = new Date(2024, 0, 15); // Jan 15, 2024
            expect(toISODateString(date)).toBe('2024-01-15');
        });

        it('should pad single digit months and days', () => {
            const date = new Date(2024, 2, 5); // Mar 5, 2024
            expect(toISODateString(date)).toBe('2024-03-05');
        });

        it('should handle December correctly', () => {
            const date = new Date(2024, 11, 25); // Dec 25, 2024
            expect(toISODateString(date)).toBe('2024-12-25');
        });
    });

    describe('getWeekDays', () => {
        it('should return 5 consecutive days starting from start date', () => {
            const startDate = new Date(2024, 0, 1); // Monday Jan 1
            const result = getWeekDays(startDate);

            expect(result).toHaveLength(5);
            expect(toISODateString(result[0])).toBe('2024-01-01');
            expect(toISODateString(result[4])).toBe('2024-01-05');
        });

        it('should work for any starting date', () => {
            const startDate = new Date(2024, 5, 15); // Saturday June 15
            const result = getWeekDays(startDate);

            expect(result).toHaveLength(5);
            expect(toISODateString(result[0])).toBe('2024-06-15');
            expect(toISODateString(result[4])).toBe('2024-06-19');
        });
    });

    describe('getStartOfWeek', () => {
        it('should return Monday for Monday start (default)', () => {
            // Tuesday, Jan 16, 2024
            const date = new Date(2024, 0, 16);
            const result = getStartOfWeek(date, 'monday');
            expect(result.getDay()).toBe(1); // Monday
            expect(toISODateString(result)).toBe('2024-01-15');
        });

        it('should return Sunday for Sunday start', () => {
            // Wednesday, Jan 17, 2024
            const date = new Date(2024, 0, 17);
            const result = getStartOfWeek(date, 'sunday');
            expect(result.getDay()).toBe(0); // Sunday
            expect(toISODateString(result)).toBe('2024-01-14');
        });

        it('should return same day if already on start of week (Monday)', () => {
            // Monday, Jan 15, 2024
            const date = new Date(2024, 0, 15);
            const result = getStartOfWeek(date, 'monday');
            expect(toISODateString(result)).toBe('2024-01-15');
        });

        it('should handle Sunday correctly for Monday start', () => {
            // Sunday, Jan 21, 2024
            const date = new Date(2024, 0, 21);
            const result = getStartOfWeek(date, 'monday');
            // Should go back to previous Monday (Jan 15)
            expect(toISODateString(result)).toBe('2024-01-15');
        });
    });

    describe('getSchoolYearFromDate', () => {
        it('should return correct year for August date (start of school year)', () => {
            const date = new Date(2024, 7, 15); // August 15, 2024
            expect(getSchoolYearFromDate(date)).toBe('2024-2025');
        });

        it('should return correct year for January date (middle of school year)', () => {
            const date = new Date(2024, 0, 15); // January 15, 2024
            expect(getSchoolYearFromDate(date)).toBe('2023-2024');
        });

        it('should return correct year for July date (end of school year)', () => {
            const date = new Date(2024, 6, 15); // July 15, 2024
            expect(getSchoolYearFromDate(date)).toBe('2023-2024');
        });

        it('should use defined years when provided', () => {
            const definedYears = [
                { name: '2024-2025', startDate: '2024-08-01', endDate: '2025-07-31' },
                { name: '2023-2024', startDate: '2023-08-01', endDate: '2024-07-31' }
            ];
            const date = new Date(2024, 8, 15); // Sept 15, 2024
            expect(getSchoolYearFromDate(date, definedYears)).toBe('2024-2025');
        });

        it('should fallback to legacy logic if date outside defined years', () => {
            const definedYears = [
                { name: '2024-2025', startDate: '2024-08-01', endDate: '2025-07-31' }
            ];
            const date = new Date(2020, 8, 15); // Sept 15, 2020 (not in defined years)
            expect(getSchoolYearFromDate(date, definedYears)).toBe('2020-2021');
        });
    });

    describe('addBusinessDays', () => {
        const holidays = new Set([
            '2024-01-15', // MLK Day
            '2024-02-19'  // Presidents Day
        ]);

        it('should return same date if 0 days added', () => {
            const date = new Date('2024-01-10T12:00:00Z');
            const result = addBusinessDays(date, 0, holidays);
            expect(toISODateString(result)).toBe('2024-01-10');
        });

        it('should skip weekends', () => {
            // Starting from Friday Jan 12, 2024
            // 1 day added should land on Monday Jan 15 (which is a holiday)
            // So it should actually be Tuesday Jan 16
            const date = new Date('2024-01-12T12:00:00Z');
            const result = addBusinessDays(date, 1, holidays);
            expect(toISODateString(result)).toBe('2024-01-16');
        });

        it('should skip holidays', () => {
            // Starting from Jan 10 (Wed), 5 school days should skip:
            // - Jan 13-14 (Sat-Sun)
            // - Jan 15 (MLK Day holiday)
            // Result should be Jan 18 (Thu)
            const date = new Date('2024-01-10T12:00:00Z');
            const result = addBusinessDays(date, 5, holidays);
            expect(toISODateString(result)).toBe('2024-01-18');
        });

        it('should calculate correctly with no holidays', () => {
            // Starting from Monday Jan 8, 5 school days:
            // Day 1: Jan 9 (Tue)
            // Day 2: Jan 10 (Wed)
            // Day 3: Jan 11 (Thu)
            // Day 4: Jan 12 (Fri)
            // Skip: Jan 13-14 (Sat-Sun)
            // Day 5: Jan 15 (Mon)
            const date = new Date('2024-01-08T12:00:00Z');
            const result = addBusinessDays(date, 5, new Set());
            expect(toISODateString(result)).toBe('2024-01-15');
        });
    });
});
