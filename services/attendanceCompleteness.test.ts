import { describe, it, expect } from 'vitest';
import {
    isWeekend,
    isSchoolDay,
    studentsExpectedOn,
    getDayCompleteness,
    findMissedSchoolDays,
    type CompletenessStudent
} from './attendanceCompleteness';

// 2024-09-02 is a Monday, 2024-09-07 a Saturday, 2024-09-08 a Sunday.
const MON = '2024-09-02';
const TUE = '2024-09-03';
const WED = '2024-09-04';
const SAT = '2024-09-07';
const SUN = '2024-09-08';

const student = (over: Partial<CompletenessStudent> & { id: string }): CompletenessStudent => ({
    status: 'Active',
    entryDate: '2024-08-01',
    ...over
});

const roster: CompletenessStudent[] = [
    student({ id: 'a' }),
    student({ id: 'b' }),
    student({ id: 'c' })
];

describe('isWeekend', () => {
    it('detects Saturday and Sunday', () => {
        expect(isWeekend(SAT)).toBe(true);
        expect(isWeekend(SUN)).toBe(true);
    });

    it('treats weekdays as non-weekend', () => {
        expect(isWeekend(MON)).toBe(false);
        expect(isWeekend(WED)).toBe(false);
    });
});

describe('isSchoolDay', () => {
    it('excludes weekends and holidays', () => {
        expect(isSchoolDay(MON, new Set())).toBe(true);
        expect(isSchoolDay(SAT, new Set())).toBe(false);
        expect(isSchoolDay(MON, new Set([MON]))).toBe(false);
    });
});

describe('studentsExpectedOn', () => {
    it('excludes students who are not active', () => {
        const withdrawn = [...roster, student({ id: 'd', status: 'Withdrawn' })];
        expect(studentsExpectedOn(withdrawn, MON).map(s => s.id)).toEqual(['a', 'b', 'c']);
    });

    it('excludes students who had not started yet', () => {
        const later = [...roster, student({ id: 'late', entryDate: WED })];
        expect(studentsExpectedOn(later, MON).map(s => s.id)).not.toContain('late');
        expect(studentsExpectedOn(later, WED).map(s => s.id)).toContain('late');
    });

    it('includes a student on their entry date', () => {
        expect(studentsExpectedOn([student({ id: 'x', entryDate: MON })], MON)).toHaveLength(1);
    });

    it('excludes students who exited before the date but not on it', () => {
        const exited = [student({ id: 'x', exitDate: TUE })];
        expect(studentsExpectedOn(exited, TUE)).toHaveLength(1);
        expect(studentsExpectedOn(exited, WED)).toHaveLength(0);
    });
});

describe('getDayCompleteness', () => {
    it('counts unmarked students', () => {
        const result = getDayCompleteness(roster, MON, new Set(['a']), new Set());
        expect(result).toMatchObject({ expected: 3, marked: 1, unmarked: 2, isSchoolDay: true });
    });

    it('reports a finished day', () => {
        const result = getDayCompleteness(roster, MON, new Set(['a', 'b', 'c']), new Set());
        expect(result.unmarked).toBe(0);
    });

    it('ignores marks for students not expected that day', () => {
        const result = getDayCompleteness(roster, MON, new Set(['a', 'ghost']), new Set());
        expect(result.marked).toBe(1);
    });

    it('flags weekends as non-school days', () => {
        expect(getDayCompleteness(roster, SAT, new Set(), new Set()).isSchoolDay).toBe(false);
    });

    it('surfaces the holiday name', () => {
        const result = getDayCompleteness(roster, MON, new Set(), new Set([MON]), { [MON]: 'Labor Day' });
        expect(result.isSchoolDay).toBe(false);
        expect(result.holidayName).toBe('Labor Day');
    });
});

describe('findMissedSchoolDays', () => {
    it('reports a school day with no attendance at all', () => {
        // Looking back from Wednesday: Monday recorded, Tuesday skipped.
        const missed = findMissedSchoolDays(roster, new Set([MON]), new Set(), WED, 7);
        expect(missed).toContain(TUE);
        expect(missed).not.toContain(MON);
    });

    it('never reports the current day', () => {
        const missed = findMissedSchoolDays(roster, new Set(), new Set(), WED, 7);
        expect(missed).not.toContain(WED);
    });

    it('ignores weekends and holidays', () => {
        // Look back from Monday the 9th across the preceding weekend.
        const missed = findMissedSchoolDays(roster, new Set(), new Set([WED]), '2024-09-09', 7);
        expect(missed).not.toContain(SAT);
        expect(missed).not.toContain(SUN);
        expect(missed).not.toContain(WED);
    });

    it('ignores days before anyone was enrolled', () => {
        // Window is the seven days before WED, all earlier than this student's entry.
        const newIntake = [student({ id: 'x', entryDate: WED })];
        expect(findMissedSchoolDays(newIntake, new Set(), new Set(), WED, 7)).toEqual([]);
    });

    it('starts reporting from the first day a student is enrolled', () => {
        const newIntake = [student({ id: 'x', entryDate: MON })];
        const missed = findMissedSchoolDays(newIntake, new Set(), new Set(), WED, 7);
        expect(missed).toEqual([MON, TUE]);
    });

    it('returns nothing when the lookback window is empty', () => {
        expect(findMissedSchoolDays(roster, new Set(), new Set(), WED, 0)).toEqual([]);
    });
});
