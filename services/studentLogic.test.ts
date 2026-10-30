import { describe, it, expect } from 'vitest';
import { calculateDaysRemaining, calculateProjectedReleaseDate, isInSession, projectReleaseDate } from './studentLogic';
import { Holiday } from '../types';

describe('studentLogic', () => {
    describe('calculateDaysRemaining', () => {
        it('should calculate basic remaining days', () => {
            // 45 assigned - 10 attended - 5 credit = 30
            expect(calculateDaysRemaining(45, 10, 5)).toBe(30);
        });

        it('should return 0 if attendance exceeds assigned', () => {
            expect(calculateDaysRemaining(45, 50, 0)).toBe(0);
        });

        it('should handle 0 assigned (legacy fallback)', () => {
            expect(calculateDaysRemaining(0, 0, 0)).toBe(0);
        });
    });

    describe('calculateProjectedReleaseDate', () => {
        const holidays: Holiday[] = [
            { date: '2024-11-28', name: 'Thanksgiving' },
            { date: '2024-12-25', name: 'Christmas' }
        ];

        it('should return N/A for non-active students', () => {
            expect(calculateProjectedReleaseDate(10, [], '2024-11-01', 'Withdrawn')).toBe('Withdrawn');
            expect(calculateProjectedReleaseDate(10, [], '2024-11-01', 'Completed')).toBe('Completed');
            expect(calculateProjectedReleaseDate(10, [], '2024-11-01', 'Suspended')).toBe('N/A');
        });

        it('should return Completed if 0 days remaining', () => {
            expect(calculateProjectedReleaseDate(0, [], '2024-11-01', 'Active')).toBe('Completed');
        });

        it('should project date skipping weekends', () => {
            // Start Friday Nov 1, 2024. Needs 1 day.
            // Friday is day 1. Released on Monday Nov 4?
            // Logic: while daysAdded < remaining.
            // iter 1: date becomes Nov 2 (Sat) -> Skip
            // iter 2: date becomes Nov 3 (Sun) -> Skip
            // iter 3: date becomes Nov 4 (Mon) -> Add. daysAdded=1.
            // End loop. Returns Nov 4.
            const start = '2024-11-01';
            expect(calculateProjectedReleaseDate(1, [], start, 'Active')).toBe('2024-11-04');
        });

        it('should skip holidays', () => {
            // Start Wed Nov 27. Needs 2 days.
            // Nov 28 is Thanksgiving (Holiday).
            // iter 1: Nov 28 (Thu) -> Holiday -> Skip
            // iter 2: Nov 29 (Fri) -> Add (1)
            // iter 3: Nov 30 (Sat) -> Skip
            // iter 4: Dec 1 (Sun) -> Skip
            // iter 5: Dec 2 (Mon) -> Add (2)
            // Result: Dec 2.
            const start = '2024-11-27';
            expect(calculateProjectedReleaseDate(2, holidays, start, 'Active')).toBe('2024-12-02');
        });

        describe('when today has not been marked yet', () => {
            // Monday 2 Dec 2024.
            it('counts today, so one day left means release today', () => {
                expect(calculateProjectedReleaseDate(1, [], '2024-12-02', 'Active', { includeStartDay: true })).toBe('2024-12-02');
            });

            it('counts today as the first of several days', () => {
                expect(calculateProjectedReleaseDate(3, [], '2024-12-02', 'Active', { includeStartDay: true })).toBe('2024-12-04');
            });

            it('does not count today when today is not a school day', () => {
                // Saturday 30 Nov: the first school day is Monday.
                expect(calculateProjectedReleaseDate(1, [], '2024-11-30', 'Active', { includeStartDay: true })).toBe('2024-12-02');
                expect(calculateProjectedReleaseDate(1, holidays, '2024-11-28', 'Active', { includeStartDay: true })).toBe('2024-11-29');
            });
        });

        describe('school year breaks', () => {
            const schoolYears = [
                { startDate: '2024-08-19', endDate: '2025-05-30' },
                { startDate: '2025-08-18', endDate: '2026-05-29' }
            ];

            it('skips the summer between two defined school years', () => {
                // Thu 29 May 2025 + 3 school days: Fri 30 May, then Mon 18 and Tue 19 Aug.
                expect(calculateProjectedReleaseDate(3, [], '2025-05-29', 'Active', { schoolYears })).toBe('2025-08-19');
            });

            it('treats dates after the last defined year as school days', () => {
                // Nothing defines 2026-2027 yet, so June 2026 counts as before.
                expect(calculateProjectedReleaseDate(2, [], '2026-05-28', 'Active', { schoolYears })).toBe('2026-06-01');
            });

            it('changes nothing for back-to-back years (the default definitions)', () => {
                const backToBack = [
                    { startDate: '2024-08-01', endDate: '2025-07-31' },
                    { startDate: '2025-08-01', endDate: '2026-07-31' }
                ];
                expect(calculateProjectedReleaseDate(3, [], '2025-07-30', 'Active', { schoolYears: backToBack }))
                    .toBe(calculateProjectedReleaseDate(3, [], '2025-07-30', 'Active'));
            });
        });
    });

    describe('isInSession', () => {
        const years = [{ startDate: '2024-08-19', endDate: '2025-05-30' }, { startDate: '2025-08-18', endDate: '2026-05-29' }];
        it('is in session within a year and outside the defined range', () => {
            expect(isInSession('2024-09-01', years)).toBe(true);
            expect(isInSession('2026-07-01', years)).toBe(true);
            expect(isInSession('2024-01-01', years)).toBe(true);
        });
        it('is not in session between two years', () => {
            expect(isInSession('2025-06-15', years)).toBe(false);
        });
        it('is always in session with no years defined', () => {
            expect(isInSession('2025-06-15', [])).toBe(true);
        });
    });

    describe('projectReleaseDate', () => {
        // Friday 30 Oct 2026.
        const today = '2026-10-30';
        const student = { status: 'Active', daysAssigned: 10, daysAttended: 9, creditDays: 0, entryDate: '2026-10-19' };

        it('counts an unmarked school day today: one day left releases today', () => {
            expect(projectReleaseDate({ ...student, todayPresence: null }, [], { today })).toBe('2026-10-30');
        });

        it('once today is marked Present the day is in daysAttended and the student is done', () => {
            expect(projectReleaseDate({ ...student, daysAttended: 10, todayPresence: 'Present' }, [], { today })).toBe('Completed');
        });

        it('Tardy today counts the same as Present', () => {
            expect(projectReleaseDate({ ...student, daysAttended: 10, todayPresence: 'Tardy' }, [], { today })).toBe('Completed');
        });

        it('an absence today pushes the last day to the next school day', () => {
            expect(projectReleaseDate({ ...student, todayPresence: 'Absent' }, [], { today })).toBe('2026-11-02');
        });

        it('entry mode gives the planned date, counting the entry day as day 1', () => {
            // 10 school days from Mon 19 Oct inclusive: 19-23 and 26-30 Oct.
            const planned = projectReleaseDate({ ...student, daysAttended: 3 }, [], { today, mode: 'entry' });
            expect(planned).toBe('2026-10-30');
            // Stable as the student attends.
            expect(projectReleaseDate({ ...student, daysAttended: 9 }, [], { today, mode: 'entry' })).toBe(planned);
        });

        it('entry mode subtracts credit days', () => {
            expect(projectReleaseDate({ ...student, creditDays: 2 }, [], { today, mode: 'entry' })).toBe('2026-10-28');
        });
    });
});
