import { getDateRange, toISODateString } from './dateUtils';

/**
 * Answers "is this day finished, and did I skip one?"
 *
 * A day that is silently never marked under-counts every student's served
 * days, which moves their exit date, so the gap has to be visible rather than
 * inferred from an empty table.
 */

/** The minimum a student record needs for completeness to be decidable. */
export interface CompletenessStudent {
    id: string;
    status: string;
    entryDate: string;
    exitDate?: string;
}

export interface DayCompleteness {
    /** Active students enrolled on this date. */
    expected: number;
    /** How many of them have a presence recorded. */
    marked: number;
    /** expected - marked. */
    unmarked: number;
    /** False on weekends and holidays, when no attendance is due. */
    isSchoolDay: boolean;
    /** Set when the date falls on a named holiday. */
    holidayName?: string;
}

const ACTIVE = 'Active';

/** Parsed at noon UTC so a local timezone cannot shift the calendar day. */
const atNoonUTC = (isoDate: string) => new Date(isoDate + 'T12:00:00Z');

export const isWeekend = (isoDate: string): boolean => {
    const day = atNoonUTC(isoDate).getUTCDay();
    return day === 0 || day === 6;
};

export const isSchoolDay = (isoDate: string, holidayDates: Set<string>): boolean =>
    !isWeekend(isoDate) && !holidayDates.has(isoDate);

/** Students who should have attendance recorded on `isoDate`. */
export const studentsExpectedOn = <T extends CompletenessStudent>(
    roster: T[],
    isoDate: string
): T[] =>
    roster.filter(s =>
        s.status === ACTIVE &&
        s.entryDate <= isoDate &&
        !(s.exitDate && s.exitDate < isoDate)
    );

export const getDayCompleteness = (
    roster: CompletenessStudent[],
    isoDate: string,
    markedStudentIds: Set<string>,
    holidayDates: Set<string>,
    holidayNamesByDate: Record<string, string> = {}
): DayCompleteness => {
    const expectedStudents = studentsExpectedOn(roster, isoDate);
    const marked = expectedStudents.filter(s => markedStudentIds.has(s.id)).length;

    return {
        expected: expectedStudents.length,
        marked,
        unmarked: expectedStudents.length - marked,
        isSchoolDay: isSchoolDay(isoDate, holidayDates),
        holidayName: holidayNamesByDate[isoDate]
    };
};

/**
 * School days in the lookback window with no attendance recorded at all.
 *
 * `upTo` is excluded: the current day is reported separately and is not
 * "missed" while the user is still working on it. Days on which nobody was
 * enrolled are skipped, so a new install does not report every prior weekday.
 */
export const findMissedSchoolDays = (
    roster: CompletenessStudent[],
    datesWithAttendance: Set<string>,
    holidayDates: Set<string>,
    upTo: string,
    lookbackDays: number
): string[] => {
    if (lookbackDays <= 0) return [];

    const start = atNoonUTC(upTo);
    start.setDate(start.getDate() - lookbackDays);

    const end = atNoonUTC(upTo);
    end.setDate(end.getDate() - 1);

    if (end < start) return [];

    return getDateRange(toISODateString(start), toISODateString(end)).filter(date =>
        isSchoolDay(date, holidayDates) &&
        !datesWithAttendance.has(date) &&
        studentsExpectedOn(roster, date).length > 0
    );
};
