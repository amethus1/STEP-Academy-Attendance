import { Holiday } from '../types';
import { toISODateString, addBusinessDays } from './dateUtils';

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

    const startDate = new Date(projectionStartDateStr + 'T12:00:00Z');
    const holidayDates = new Set(holidays.map(h => h.date));

    const projectedDate = addBusinessDays(startDate, daysRemaining, holidayDates);
    return toISODateString(projectedDate);
};
