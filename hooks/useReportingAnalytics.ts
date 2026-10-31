import { useMemo } from 'react';
import { StudentWithEnrollment, DBAttendance, DBHoliday } from '../db/types';
import { computeReportingAnalytics, type ReportingAnalyticsInput } from '../services/reportingAnalytics';

interface UseReportingAnalyticsProps {
    students: StudentWithEnrollment[];
    attendance: DBAttendance[];
    holidays: DBHoliday[];
    dateRange: { start: string; end: string };
    thresholds?: { atRisk: number; atRiskDays: number };
    schoolCalendar?: ReportingAnalyticsInput['schoolCalendar'];
}

export const useReportingAnalytics = ({
    students,
    attendance,
    holidays,
    dateRange,
    thresholds = { atRisk: 5, atRiskDays: 30 },
    schoolCalendar
}: UseReportingAnalyticsProps) => {
    return useMemo(
        () => computeReportingAnalytics({ students, attendance, holidays, dateRange, thresholds, schoolCalendar }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on the values, not new object identities
        [students, attendance, holidays, dateRange.start, dateRange.end, thresholds.atRisk, thresholds.atRiskDays, schoolCalendar]
    );
};
