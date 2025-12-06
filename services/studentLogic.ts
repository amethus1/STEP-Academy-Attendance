import { Holiday } from '../types';
import { toISODateString } from './dateUtils';

/**
 * Calculates the number of remaining days a student needs to attend.
 */
export const calculateDaysRemaining = (daysAssigned: number, daysAttended: number, creditDays: number): number => {
    return Math.max(0, daysAssigned - daysAttended - creditDays);
};

/**
 * Projects the release date based on remaining days and holidays.
 */
export const calculateProjectedReleaseDate = (
    daysRemaining: number,
    holidays: Holiday[],
    projectionStartDateStr: string,
    status: string
): string => {
    if (status !== 'Active') {
        const completedOrWithdrawn = status === 'Completed' || status === 'Withdrawn';
        return completedOrWithdrawn ? status : 'N/A';
    }

    if (daysRemaining <= 0) {
        return 'Completed';
    }

    let projectedDate = new Date(projectionStartDateStr + 'T12:00:00Z'); // Use UTC
    let daysAdded = 0;
    const holidayDates = new Set(holidays.map(h => h.date));

    // Safety break after 2 years
    const maxIterations = 365 * 2;
    let iterations = 0;

    while (daysAdded < daysRemaining && iterations < maxIterations) {
        projectedDate.setDate(projectedDate.getDate() + 1);
        const dayOfWeek = projectedDate.getUTCDay();
        const dateStr = toISODateString(projectedDate);

        // Skip weekends (0=Sun, 6=Sat) and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
            daysAdded++;
        }
        iterations++;
    }

    return toISODateString(projectedDate);
};
