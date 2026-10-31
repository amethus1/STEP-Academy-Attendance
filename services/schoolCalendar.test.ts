import { describe, it, expect } from 'vitest';
import { isInRegularTerm, isSchoolDayFor, isSchoolDayForAnyone, sessionsOn, placeholderYears } from './schoolCalendar';

const years = [
    { startDate: '2024-08-19', endDate: '2025-05-30' },
    { startDate: '2025-08-18', endDate: '2026-05-29' }
];
const summerSessions = [
    { id: 's1', startDate: '2025-06-09', endDate: '2025-06-27' },
    { id: 's2', startDate: '2025-07-07', endDate: '2025-07-25' }
];
const calendar = { holidayDates: new Set(['2025-06-19']), schoolYears: years, summerSessions };

describe('isInRegularTerm', () => {
    it('is in term within a school year', () => {
        expect(isInRegularTerm('2024-09-03', years)).toBe(true);
        expect(isInRegularTerm('2025-05-30', years)).toBe(true);
    });

    it('is not in term during summer between two years', () => {
        expect(isInRegularTerm('2025-06-16', years)).toBe(false);
        expect(isInRegularTerm('2025-08-15', years)).toBe(false);
    });

    it('repeats the last year past what has been entered', () => {
        expect(isInRegularTerm('2026-06-15', years)).toBe(false); // summer 2026
        expect(isInRegularTerm('2026-09-01', years)).toBe(true);  // 2026-27, same pattern
        expect(isInRegularTerm('2027-06-15', years)).toBe(false); // summer 2027
    });

    it('treats dates before the first year, or with no years, as in term', () => {
        expect(isInRegularTerm('2020-03-02', years)).toBe(true);
        expect(isInRegularTerm('2025-06-16', [])).toBe(true);
    });

    it('has no summer with back-to-back placeholder years', () => {
        const backToBack = [{ startDate: '2024-08-01', endDate: '2025-07-31' }];
        expect(isInRegularTerm('2025-06-16', backToBack)).toBe(true);
        expect(isInRegularTerm('2026-07-15', backToBack)).toBe(true);
    });
});

describe('isSchoolDayFor', () => {
    it('makes a summer session day a school day only for its students', () => {
        expect(isSchoolDayFor('2025-06-10', calendar, ['s1'])).toBe(true);
        expect(isSchoolDayFor('2025-06-10', calendar, ['s2'])).toBe(false);
        expect(isSchoolDayFor('2025-06-10', calendar, [])).toBe(false);
    });

    it('still skips weekends and holidays inside a session', () => {
        expect(isSchoolDayFor('2025-06-14', calendar, ['s1'])).toBe(false); // Saturday
        expect(isSchoolDayFor('2025-06-19', calendar, ['s1'])).toBe(false); // holiday
    });

    it('is a school day for everyone during the regular year', () => {
        expect(isSchoolDayFor('2025-03-04', calendar, [])).toBe(true);
    });
});

describe('isSchoolDayForAnyone', () => {
    it('counts a day covered by any session', () => {
        expect(isSchoolDayForAnyone('2025-06-10', calendar)).toBe(true);
        expect(isSchoolDayForAnyone('2025-06-30', calendar)).toBe(false); // between sessions
    });
});

describe('sessionsOn', () => {
    it('lists the sessions covering a date', () => {
        expect(sessionsOn('2025-07-08', summerSessions).map(s => s.id)).toEqual(['s2']);
        expect(sessionsOn('2025-08-01', summerSessions)).toEqual([]);
    });
});

describe('placeholderYears', () => {
    it('flags 1 Aug - 31 Jul years', () => {
        expect(placeholderYears([
            { startDate: '2024-08-01', endDate: '2025-07-31' },
            { startDate: '2025-08-18', endDate: '2026-05-29' }
        ])).toHaveLength(1);
    });
});
