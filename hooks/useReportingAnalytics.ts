import { useMemo } from 'react';
import { StudentWithEnrollment, DBAttendance, DBHoliday } from '../db/types';
import { toISODateString } from '../services/dateUtils';

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

    return useMemo(() => {
        const activeStudents = students.filter(s => s.status === 'Active');
        if (activeStudents.length === 0) {
            return {
                overall: 0,
                perfectCount: 0,
                totalActive: 0,
                chartData: [],
                atRisk: [],
                byCampus: [],
                byGrade: []
            };
        }

        const holidaySet = new Set(holidays.map(h => h.date));
        const attendanceByDate: Record<string, { present: number; absent: number }> = {};

        // Grouping
        const campusStats: Record<string, { present: number; possible: number }> = {};
        const gradeStats: Record<string, { present: number; possible: number }> = {};

        let totalPossible = 0;
        let totalPresent = 0;
        let perfectCount = 0;

        // Initialize groups
        activeStudents.forEach(s => {
            const campus = s.campus || 'Unknown';
            const grade = s.grade_level || 'Unknown';
            if (!campusStats[campus]) campusStats[campus] = { present: 0, possible: 0 };
            if (!gradeStats[grade]) gradeStats[grade] = { present: 0, possible: 0 };
        });

        const today = new Date();
        const endDate = new Date(dateRange.end + "T12:00:00Z") > today ? today : new Date(dateRange.end + "T12:00:00Z");

        activeStudents.forEach(student => {
            let absences = 0;
            // Use start_date from enrollment
            const entryDate = new Date(student.start_date + "T12:00:00Z");
            // Start from max(rangeStart, entryDate)
            const rangeStart = new Date(dateRange.start + "T12:00:00Z");
            const currentDate = entryDate > rangeStart ? new Date(entryDate) : new Date(rangeStart);

            // Only count if enrolled before end date
            if (currentDate > endDate) return;

            const campus = student.campus || 'Unknown';
            const grade = student.grade_level || 'Unknown';

            while (currentDate <= endDate) {
                const dateStr = toISODateString(currentDate);
                const dayOfWeek = currentDate.getUTCDay();

                // Weekend check (0=Sun, 6=Sat) & Holiday check
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
                    totalPossible++;
                    campusStats[campus].possible++;
                    gradeStats[grade].possible++;

                    // Use studentId (from StudentWithEnrollment) and student_id (from DBAttendance)
                    const record = attendance.find(a => a.student_id === student.studentId && a.date === dateStr);

                    if (!attendanceByDate[dateStr]) attendanceByDate[dateStr] = { present: 0, absent: 0 };

                    if (record?.presence === 'Present') {
                        totalPresent++;
                        campusStats[campus].present++;
                        gradeStats[grade].present++;
                        attendanceByDate[dateStr].present++;
                    } else if (record?.presence === 'Absent') {
                        absences++;
                        attendanceByDate[dateStr].absent++;
                    }
                    // 'Late' or 'Excused' logic could go here
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            if (absences === 0) perfectCount++;
        });

        // Chart Data
        const chartData = Object.entries(attendanceByDate)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Breakdowns
        const byCampus = Object.entries(campusStats).map(([name, stats]) => ({
            name,
            rate: stats.possible > 0 ? Math.round((stats.present / stats.possible) * 100) : 0,
            present: stats.present,
            possible: stats.possible
        })).sort((a, b) => b.rate - a.rate);

        const byGrade = Object.entries(gradeStats).map(([name, stats]) => ({
            name,
            rate: stats.possible > 0 ? Math.round((stats.present / stats.possible) * 100) : 0,
            present: stats.present,
            possible: stats.possible
        })).sort((a, b) => b.rate - a.rate);

        // At-Risk
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - thresholds.atRiskDays);
        const lookbackDateStr = toISODateString(lookbackDate);

        const atRisk = activeStudents.map(student => {
            const recentAbsences = attendance.filter(a =>
                a.student_id === student.studentId &&
                a.presence === 'Absent' &&
                a.date >= lookbackDateStr
            ).length;

            return {
                student: {
                    id: student.studentId,
                    firstName: student.first_name,
                    lastName: student.last_name,
                    campus: student.campus,
                    gradeLevel: student.grade_level
                },
                recentAbsences
            };
        }).filter(item => item.recentAbsences >= thresholds.atRisk);

        return {
            overall: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0,
            perfectCount,
            totalActive: activeStudents.length,
            chartData,
            byCampus,
            byGrade,
            atRisk
        };
    }, [students, attendance, holidays, dateRange.start, dateRange.end, thresholds.atRisk, thresholds.atRiskDays]);
};
