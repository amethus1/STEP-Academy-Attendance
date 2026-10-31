import { getDateRange, toISODateString } from './dateUtils';
import { isSchoolDayFor, isSchoolDayForAnyone, type CalendarInput } from './schoolCalendar';

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
    /** Summer sessions the student is on; their days are school days for them. */
    summerSessionIds?: string[];
}

/** The school calendar, or (simplest case) just the holiday dates. */
export type CalendarLike = CalendarInput | Set<string>;
const asCalendar = (c: CalendarLike): CalendarInput => (c instanceof Set ? { holidayDates: c } : c);

export interface DayCompleteness {
    /** Active students enrolled on this date. */
    expected: number;
    /** How many of them have a presence recorded. */
    marked: number;
    /** expected - marked. */
    unmarked: number;
    /** False on weekends, holidays and summer days with no session, when no attendance is due. */
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

/** A school day for anyone: regular term or a summer session. */
export const isSchoolDay = (isoDate: string, calendar: CalendarLike): boolean =>
    isSchoolDayForAnyone(isoDate, asCalendar(calendar));

/**
 * Students who should have attendance recorded on `isoDate`: active, started,
 * not exited, and it is a school day for them (on a summer day, only students
 * on a session covering it).
 */
export const studentsExpectedOn = <T extends CompletenessStudent>(
    roster: T[],
    isoDate: string,
    calendar?: CalendarLike
): T[] =>
    roster.filter(s =>
        s.status === ACTIVE &&
        s.entryDate <= isoDate &&
        !(s.exitDate && s.exitDate < isoDate) &&
        (!calendar || isSchoolDayFor(isoDate, asCalendar(calendar), s.summerSessionIds))
    );

export const getDayCompleteness = (
    roster: CompletenessStudent[],
    isoDate: string,
    markedStudentIds: Set<string>,
    calendar: CalendarLike,
    holidayNamesByDate: Record<string, string> = {}
): DayCompleteness => {
    const schoolDay = isSchoolDay(isoDate, calendar);
    const expectedStudents = schoolDay ? studentsExpectedOn(roster, isoDate, calendar) : [];
    const marked = expectedStudents.filter(s => markedStudentIds.has(s.id)).length;

    return {
        expected: expectedStudents.length,
        marked,
        unmarked: expectedStudents.length - marked,
        isSchoolDay: schoolDay,
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
    calendar: CalendarLike,
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
        isSchoolDay(date, calendar) &&
        !datesWithAttendance.has(date) &&
        studentsExpectedOn(roster, date, calendar).length > 0
    );
};

/**
 * Whether a student's attendance can be recorded for `isoDate` from a grid
 * cell: an active student who had started by then, on a day that is a school
 * day for them (summer days only through a session they are on), not in the
 * future.
 */
export const canRecordAttendance = (
    student: CompletenessStudent,
    isoDate: string,
    today: string,
    calendar: CalendarLike
): boolean =>
    student.status === ACTIVE &&
    student.entryDate <= isoDate &&
    isoDate <= today &&
    isSchoolDayFor(isoDate, asCalendar(calendar), student.summerSessionIds);
