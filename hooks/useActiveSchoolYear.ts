import { useMemo } from 'react';
import { useSettings } from './useSettings';
import { useSchoolYears } from './useSchoolYears';
import { getSchoolYearFromDate } from '../services/dateUtils';

/**
 * Hook to determine the active school year.
 * Priority:
 * 1. Global Settings "Active School Year" override.
 * 2. Calculated school year based on the Reference Date (default: today).
 * 
 * @param referenceDate - The date to use for auto-calculation if no override is set. Defaults to specific date if provided.
 */
export const useActiveSchoolYear = (referenceDate?: Date | string) => {
    const { settings } = useSettings();
    const { data: schoolYears = [] } = useSchoolYears();

    // Ensure we have a valid Date object
    const dateObj = useMemo(() => {
        if (!referenceDate) return new Date();
        if (typeof referenceDate === 'string') return new Date(referenceDate + "T12:00:00Z"); // Append time to avoid timezone shift on plain dates
        return referenceDate;
    }, [referenceDate]);

    const activeSchoolYear = useMemo(() => {
        // 1. Check settings override
        if (settings.activeSchoolYear) {
            return settings.activeSchoolYear;
        }

        // 2. Auto-detect from date
        return getSchoolYearFromDate(dateObj, schoolYears);
    }, [settings.activeSchoolYear, dateObj, schoolYears]);

    return activeSchoolYear;
};
