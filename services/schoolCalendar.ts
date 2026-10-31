// When school is in session.
//
// Regular school years run from their first to their last day of school. The
// gap between one year's last day and the next year's first day is summer:
// not a school day, except for students on the roster of a summer session that
// covers the date. Past the last year that has been entered, the last year's
// calendar repeats, so a projection still skips the coming summer before the
// next year is set up.

export interface DateRange {
    startDate: string;
    endDate: string;
}

export interface SummerSessionRange extends DateRange {
    id: string;
}

/** Noon UTC so day arithmetic is unaffected by time zones and DST. */
const toDate = (iso: string) => new Date(iso + 'T12:00:00Z');
const toISO = (d: Date) => d.toISOString().slice(0, 10);

const shiftYears = (iso: string, years: number): string => {
    const d = toDate(iso);
    const month = d.getUTCMonth();
    d.setUTCFullYear(d.getUTCFullYear() + years);
    // 29 Feb in a non-leap year rolls into March; pin it to 28 Feb instead.
    if (d.getUTCMonth() !== month) d.setUTCDate(0);
    return toISO(d);
};

export const isWeekend = (iso: string): boolean => {
    const day = toDate(iso).getUTCDay();
    return day === 0 || day === 6;
};

/**
 * Whether `iso` falls inside a regular school year (ignoring weekends and
 * holidays). Dates before the first year entered count as in session, since
 * nothing says otherwise.
 */
export const isInRegularTerm = (iso: string, years: DateRange[] = []): boolean => {
    if (years.length === 0) return true;
    if (years.some(y => iso >= y.startDate && iso <= y.endDate)) return true;

    const firstStart = years.reduce((min, y) => (y.startDate < min ? y.startDate : min), years[0].startDate);
    if (iso < firstStart) return true;

    const last = years.reduce((latest, y) => (y.endDate > latest.endDate ? y : latest), years[0]);
    if (iso < last.endDate) return false; // a gap between two entered years

    // Beyond the last entered year: repeat its calendar year after year.
    for (let k = 1; k <= 50; k++) {
        const start = shiftYears(last.startDate, k);
        const end = shiftYears(last.endDate, k);
        if (iso < start) return false;
        if (iso <= end) return true;
    }
    return true;
};

/** Summer sessions covering `iso` that the given student is on. */
const inStudentSession = (iso: string, sessions: SummerSessionRange[], studentSessionIds: Iterable<string> = []) => {
    const ids = new Set(studentSessionIds);
    return sessions.some(s => ids.has(s.id) && iso >= s.startDate && iso <= s.endDate);
};

export interface CalendarInput {
    holidayDates: Set<string>;
    schoolYears?: DateRange[];
    summerSessions?: SummerSessionRange[];
}

/** A school day for this particular student. */
export const isSchoolDayFor = (iso: string, calendar: CalendarInput, studentSessionIds: Iterable<string> = []): boolean =>
    !isWeekend(iso) &&
    !calendar.holidayDates.has(iso) &&
    (isInRegularTerm(iso, calendar.schoolYears) ||
        inStudentSession(iso, calendar.summerSessions ?? [], studentSessionIds));

/** A school day for at least someone: regular term, or any summer session. */
export const isSchoolDayForAnyone = (iso: string, calendar: CalendarInput): boolean =>
    !isWeekend(iso) &&
    !calendar.holidayDates.has(iso) &&
    (isInRegularTerm(iso, calendar.schoolYears) ||
        (calendar.summerSessions ?? []).some(s => iso >= s.startDate && iso <= s.endDate));

/** Summer sessions covering `iso`. */
export const sessionsOn = <T extends SummerSessionRange>(iso: string, sessions: T[] = []): T[] =>
    sessions.filter(s => iso >= s.startDate && iso <= s.endDate);

/**
 * Years whose dates look like placeholders (1 Aug to 31 Jul) rather than the
 * first and last day of school. With those, there is no summer to skip.
 */
export const placeholderYears = <T extends DateRange>(years: T[]): T[] =>
    years.filter(y => y.startDate.slice(5) === '08-01' && y.endDate.slice(5) === '07-31');

export { toISO as toISODate, toDate as fromISODate };
