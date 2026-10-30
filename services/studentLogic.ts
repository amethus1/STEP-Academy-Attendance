import { Holiday } from '../types';
import { toISODateString } from './dateUtils';

/**
 * Calculates the number of remaining days a student needs to attend.
 */
export const calculateDaysRemaining = (daysAssigned: number, daysAttended: number, creditDays: number): number => {
    return Math.max(0, daysAssigned - daysAttended - creditDays);
};

/** A school year's span; days between one year's end and the next year's start are breaks. */
export interface SchoolSession {
    startDate: string;
    endDate: string;
}

/**
 * Whether `isoDate` falls inside the school calendar.
 *
 * Dates between two defined school years (summer break, when each year is set
 * to its real first and last day) are not. Dates after the last defined year
 * are treated as in session, so projecting past it behaves as it always has
 * until the next year is defined.
 */
export const isInSession = (isoDate: string, sessions: SchoolSession[] = []): boolean => {
    if (sessions.length === 0) return true;
    if (sessions.some(s => isoDate >= s.startDate && isoDate <= s.endDate)) return true;
    const lastEnd = sessions.reduce((max, s) => (s.endDate > max ? s.endDate : max), '');
    const firstStart = sessions.reduce((min, s) => (s.startDate < min ? s.startDate : min), sessions[0].startDate);
    return isoDate > lastEnd || isoDate < firstStart;
};

export interface ProjectionOptions {
    /**
     * Count the start date itself as the first possible day. True when the
     * start is today and today has not been marked yet: the student can still
     * attend today, and marking them present counts it as a day.
     */
    includeStartDay?: boolean;
    /** School years, so breaks between them are skipped. */
    schoolYears?: SchoolSession[];
}

/**
 * The date on which a student finishes, attending every school day from
 * `projectionStartDateStr` with `daysRemaining` days still to serve.
 */
export const calculateProjectedReleaseDate = (
    daysRemaining: number,
    holidays: Holiday[],
    projectionStartDateStr: string,
    status: string,
    options: ProjectionOptions = {}
): string => {
    if (status !== 'Active') {
        const completedOrWithdrawn = status === 'Completed' || status === 'Withdrawn';
        return completedOrWithdrawn ? status : 'N/A';
    }

    if (daysRemaining <= 0) {
        return 'Completed';
    }

    const holidayDates = new Set(holidays.map(h => h.date));
    const isSchoolDay = (iso: string, day: Date) => {
        const dow = day.getUTCDay();
        return dow !== 0 && dow !== 6 && !holidayDates.has(iso) && isInSession(iso, options.schoolYears);
    };

    // Noon UTC so stepping a day at a time is never shifted by a time zone or DST.
    const cursor = new Date(projectionStartDateStr + 'T12:00:00Z');
    if (!options.includeStartDay) cursor.setUTCDate(cursor.getUTCDate() + 1);

    // A summer gap plus a year of school days is well under this.
    const maxIterations = daysRemaining * 7 + 400;
    let counted = 0;

    for (let i = 0; i < maxIterations; i++) {
        const iso = cursor.toISOString().slice(0, 10);
        if (isSchoolDay(iso, cursor)) {
            counted++;
            if (counted === daysRemaining) return iso;
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return toISODateString(cursor);
};

export interface ProjectionContext {
    /**
     * 'today' (default): when the student will finish from here, given what
     * they have attended so far. 'entry': the release date planned at
     * placement, counting the entry day as day 1 of the assigned days.
     */
    mode?: 'today' | 'entry';
    /** School years, so breaks between them are skipped. */
    schoolYears?: SchoolSession[];
    /** Injectable for tests; defaults to the local date. */
    today?: string;
}

/**
 * The single rule for a student's projected release date, so every page shows
 * the same date.
 *
 * Today counts while it is still unmarked: the student can attend today, and
 * marking them present (or tardy) counts it as a day attended. Once today is
 * marked, it is already reflected in daysAttended and projection starts from
 * the next school day.
 */
export const projectReleaseDate = (
    student: {
        status: string;
        daysAssigned: number;
        daysAttended: number;
        creditDays: number;
        entryDate: string;
        /** Presence recorded for today, if any. */
        todayPresence?: string | null;
    },
    holidays: Holiday[],
    context: ProjectionContext = {}
): string => {
    const { mode = 'today', schoolYears, today = toISODateString(new Date()) } = context;

    if (mode === 'entry') {
        return calculateProjectedReleaseDate(
            Math.max(0, student.daysAssigned - student.creditDays),
            holidays,
            student.entryDate,
            student.status,
            { includeStartDay: true, schoolYears }
        );
    }

    return calculateProjectedReleaseDate(
        calculateDaysRemaining(student.daysAssigned, student.daysAttended, student.creditDays),
        holidays,
        today,
        student.status,
        { includeStartDay: !student.todayPresence, schoolYears }
    );
};
