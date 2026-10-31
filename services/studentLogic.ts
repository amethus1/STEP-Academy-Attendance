import { Holiday } from '../types';
import { toISODateString } from './dateUtils';
import { isSchoolDayFor, type DateRange, type SummerSessionRange } from './schoolCalendar';

/**
 * Calculates the number of remaining days a student needs to attend.
 */
export const calculateDaysRemaining = (daysAssigned: number, daysAttended: number, creditDays: number): number => {
    return Math.max(0, daysAssigned - daysAttended - creditDays);
};

export interface ProjectionOptions {
    /**
     * Count the start date itself as the first possible day. True when the
     * start is today and today has not been marked yet: the student can still
     * attend today, and marking them present counts it as a day.
     */
    includeStartDay?: boolean;
    /** Regular school years (first to last day of school); summer between them is skipped. */
    schoolYears?: DateRange[];
    /** Summer sessions; their days count only for students on their roster. */
    summerSessions?: SummerSessionRange[];
    /** The summer sessions this student is on. */
    studentSessionIds?: string[];
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

    const calendar = {
        holidayDates: new Set(holidays.map(h => h.date)),
        schoolYears: options.schoolYears,
        summerSessions: options.summerSessions
    };
    const studentSessionIds = options.studentSessionIds ?? [];

    // Noon UTC so stepping a day at a time is never shifted by a time zone or DST.
    const cursor = new Date(projectionStartDateStr + 'T12:00:00Z');
    if (!options.includeStartDay) cursor.setUTCDate(cursor.getUTCDate() + 1);

    // Several summers plus the school days themselves are well under this.
    const maxIterations = daysRemaining * 7 + 1200;
    let counted = 0;

    for (let i = 0; i < maxIterations; i++) {
        const iso = cursor.toISOString().slice(0, 10);
        if (isSchoolDayFor(iso, calendar, studentSessionIds)) {
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
    /** Regular school years; summer between them is skipped. */
    schoolYears?: DateRange[];
    /** Summer sessions; their days count only for students on their roster. */
    summerSessions?: SummerSessionRange[];
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
        /** Summer sessions the student is on; their days count toward the projection. */
        summerSessionIds?: string[];
    },
    holidays: Holiday[],
    context: ProjectionContext = {}
): string => {
    const { mode = 'today', schoolYears, summerSessions, today = toISODateString(new Date()) } = context;
    const calendar = { schoolYears, summerSessions, studentSessionIds: student.summerSessionIds };

    if (mode === 'entry') {
        return calculateProjectedReleaseDate(
            Math.max(0, student.daysAssigned - student.creditDays),
            holidays,
            student.entryDate,
            student.status,
            { includeStartDay: true, ...calendar }
        );
    }

    return calculateProjectedReleaseDate(
        calculateDaysRemaining(student.daysAssigned, student.daysAttended, student.creditDays),
        holidays,
        today,
        student.status,
        { includeStartDay: !student.todayPresence, ...calendar }
    );
};
