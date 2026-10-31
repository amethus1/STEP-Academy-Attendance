import type { StudentWithEnrollment, DBAttendance, DBHoliday } from '../db/types';
import { toISODateString } from './dateUtils';
import { isSchoolDayFor, type DateRange, type SummerSessionRange } from './schoolCalendar';

export interface ReportingAnalyticsInput {
    students: StudentWithEnrollment[];
    attendance: DBAttendance[];
    holidays: DBHoliday[];
    dateRange: { start: string; end: string };
    thresholds?: { atRisk: number; atRiskDays: number };
    /** School years and summer sessions, so summer days count only for session students. */
    schoolCalendar?: { schoolYears?: DateRange[]; summerSessions?: SummerSessionRange[] };
    /** Injectable for tests; defaults to now. */
    today?: Date;
}

export interface GroupRate {
    name: string;
    rate: number;
    present: number;
    possible: number;
}

export interface ReportingAnalytics {
    overall: number;
    perfectCount: number;
    totalActive: number;
    chartData: { date: string; present: number; absent: number }[];
    byCampus: GroupRate[];
    byGrade: GroupRate[];
    atRisk: {
        student: { id: string; firstName: string; lastName: string; campus: string | null; gradeLevel: string };
        recentAbsences: number;
    }[];
}

const attendanceKey = (studentId: string, date: string) => `${studentId}|${date}`;

const toRates = (stats: Record<string, { present: number; possible: number }>): GroupRate[] =>
    Object.entries(stats).map(([name, s]) => ({
        name,
        rate: s.possible > 0 ? Math.round((s.present / s.possible) * 100) : 0,
        present: s.present,
        possible: s.possible
    })).sort((a, b) => b.rate - a.rate);

/**
 * Attendance rates, trends and at-risk students for the Reporting page.
 *
 * Attendance is indexed by student and date once up front. Looking each
 * student-day up with Array.find instead scanned every record for every day of
 * every student — about two seconds of frozen UI for one class over a year.
 */
export const computeReportingAnalytics = ({
    students,
    attendance,
    holidays,
    dateRange,
    thresholds = { atRisk: 5, atRiskDays: 30 },
    schoolCalendar = {},
    today = new Date()
}: ReportingAnalyticsInput): ReportingAnalytics => {
    const activeStudents = students.filter(s => s.status === 'Active');
    if (activeStudents.length === 0) {
        return { overall: 0, perfectCount: 0, totalActive: 0, chartData: [], atRisk: [], byCampus: [], byGrade: [] };
    }

    // Unique per (student, date) in the schema; keep the first like Array.find did.
    const recordByStudentDay = new Map<string, DBAttendance>();
    for (const record of attendance) {
        const key = attendanceKey(record.student_id, record.date);
        if (!recordByStudentDay.has(key)) recordByStudentDay.set(key, record);
    }

    const holidaySet = new Set(holidays.map(h => h.date));
    const calendar = { holidayDates: holidaySet, ...schoolCalendar };
    const attendanceByDate: Record<string, { present: number; absent: number }> = {};
    const campusStats: Record<string, { present: number; possible: number }> = {};
    const gradeStats: Record<string, { present: number; possible: number }> = {};

    let totalPossible = 0;
    let totalPresent = 0;
    let perfectCount = 0;

    activeStudents.forEach(s => {
        const campus = s.campus || 'Unknown';
        const grade = s.grade_level || 'Unknown';
        if (!campusStats[campus]) campusStats[campus] = { present: 0, possible: 0 };
        if (!gradeStats[grade]) gradeStats[grade] = { present: 0, possible: 0 };
    });

    const rangeEnd = new Date(dateRange.end + 'T12:00:00Z');
    const endDate = rangeEnd > today ? today : rangeEnd;
    const rangeStart = new Date(dateRange.start + 'T12:00:00Z');

    activeStudents.forEach(student => {
        let absences = 0;
        const entryDate = new Date(student.start_date + 'T12:00:00Z');
        const currentDate = entryDate > rangeStart ? new Date(entryDate) : new Date(rangeStart);

        // Only count if enrolled before end date
        if (currentDate > endDate) return;

        const campus = student.campus || 'Unknown';
        const grade = student.grade_level || 'Unknown';
        const sessionIds = student.summer_session_ids ? student.summer_session_ids.split(',') : [];

        while (currentDate <= endDate) {
            const dateStr = toISODateString(currentDate);
            if (isSchoolDayFor(dateStr, calendar, sessionIds)) {
                totalPossible++;
                campusStats[campus].possible++;
                gradeStats[grade].possible++;

                const record = recordByStudentDay.get(attendanceKey(student.studentId, dateStr));

                if (!attendanceByDate[dateStr]) attendanceByDate[dateStr] = { present: 0, absent: 0 };

                // Tardies count as attended (the student was present), matching the
                // days_attended calculation in db/studentQueries.ts. Excused absences
                // are tracked separately and do not penalize the attendance rate.
                if (record?.presence === 'Present' || record?.presence === 'Tardy') {
                    totalPresent++;
                    campusStats[campus].present++;
                    gradeStats[grade].present++;
                    attendanceByDate[dateStr].present++;
                } else if (record?.presence === 'Absent') {
                    absences++;
                    attendanceByDate[dateStr].absent++;
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        if (absences === 0) perfectCount++;
    });

    const chartData = Object.entries(attendanceByDate)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // At-risk: absences within the lookback window, counted in one pass.
    const lookbackDate = new Date(today);
    lookbackDate.setDate(lookbackDate.getDate() - thresholds.atRiskDays);
    const lookbackDateStr = toISODateString(lookbackDate);

    const recentAbsencesByStudent = new Map<string, number>();
    for (const a of attendance) {
        if (a.presence === 'Absent' && a.date >= lookbackDateStr) {
            recentAbsencesByStudent.set(a.student_id, (recentAbsencesByStudent.get(a.student_id) ?? 0) + 1);
        }
    }

    const atRisk = activeStudents.map(student => ({
        student: {
            id: student.studentId,
            firstName: student.first_name,
            lastName: student.last_name,
            campus: student.campus,
            gradeLevel: student.grade_level
        },
        recentAbsences: recentAbsencesByStudent.get(student.studentId) ?? 0
    })).filter(item => item.recentAbsences >= thresholds.atRisk);

    return {
        overall: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0,
        perfectCount,
        totalActive: activeStudents.length,
        chartData,
        byCampus: toRates(campusStats),
        byGrade: toRates(gradeStats),
        atRisk
    };
};
