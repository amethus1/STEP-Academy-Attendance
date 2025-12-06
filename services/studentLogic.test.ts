import { describe, it, expect } from 'vitest';
import { calculateDaysRemaining, calculateProjectedReleaseDate } from './studentLogic';
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
    });
});
