import { useMemo } from 'react';
import { StudentWithEnrollment, DBAttendance, DBHoliday } from '../db/types';
import { computeReportingAnalytics } from '../services/reportingAnalytics';

interface UseReportingAnalyticsProps {
    students: StudentWithEnrollment[];
    attendance: DBAttendance[];
    holidays: DBHoliday[];
    dateRange: { start: string; end: string };
    thresholds?: { atRisk: number; atRiskDays: number };
}

export const useReportingAnalytics = ({
    students,
    attendance,
    holidays,
    dateRange,
    thresholds = { atRisk: 5, atRiskDays: 30 }
}: UseReportingAnalyticsProps) => {
    return useMemo(
        () => computeReportingAnalytics({ students, attendance, holidays, dateRange, thresholds }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on the values, not new object identities
        [students, attendance, holidays, dateRange.start, dateRange.end, thresholds.atRisk, thresholds.atRiskDays]
    );
};
