import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStudents } from '../../hooks/useStudents';
import { useAttendanceRange, useHolidays } from '../../hooks/useAttendance';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { useSettings } from '../../hooks/useSettings';
import { StudentStatus, Presence } from '../../types';
import { toISODateString, getSchoolYearFromDate } from '../../services/dateUtils';
import { exportToCsv } from '../../services/csvService';
import { DocumentArrowDownIcon } from '../icons/Icons';
import { StatCardSkeleton } from '../common/SkeletonLoader';
import { AttendanceTrendChart } from '../common/AttendanceTrendChart';
import { StatCard } from '../common/StatCard';

export const ReportingPage: React.FC = () => {
    const { settings } = useSettings();
    const { data: schoolYears = [] } = useSchoolYears();

    // Derive school year - prefer manual selection, else auto-detect
    const schoolYear = useMemo(() => {
        if (settings.activeSchoolYear) {
            return settings.activeSchoolYear;
        }
        return getSchoolYearFromDate(new Date(), schoolYears);
    }, [settings.activeSchoolYear, schoolYears]);

    // Time range for data
    const today = toISODateString(new Date());
    const thirtyDaysAgo = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return toISODateString(d);
    }, []);

    const { data: rawStudents = [], isLoading: studentsLoading } = useStudents(schoolYear);
    const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceRange(thirtyDaysAgo, today);
    const { data: holidays = [] } = useHolidays();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'atRisk'>('dashboard');
    const [atRiskConfig, setAtRiskConfig] = useState({ threshold: 5, days: 30 });

    const loading = studentsLoading || attendanceLoading;

    const analyticsData = useMemo(() => {
        const activeStudents = rawStudents.filter(s => s.status === 'Active');
        if (loading || activeStudents.length === 0) {
            return {
                overallAttendance: 0,
                perfectAttendanceCount: 0,
                chartData: [],
                atRiskStudents: [],
            };
        }

        const holidaySet = new Set(holidays.map(h => h.date));
        const attendanceByDate: Record<string, { present: number; absent: number }> = {};

        let totalPossibleDays = 0;
        let totalPresentDays = 0;
        let perfectAttendanceCount = 0;

        activeStudents.forEach(student => {
            let absences = 0;
            const entryDate = new Date(student.start_date + "T12:00:00Z");
            let currentDate = new Date(entryDate);
            const todayDate = new Date();

            while (currentDate <= todayDate) {
                const dateStr = toISODateString(currentDate);
                const dayOfWeek = currentDate.getUTCDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
                    totalPossibleDays++;
                    const record = attendanceRecords.find(a => a.student_id === student.studentId && a.date === dateStr);

                    if (!attendanceByDate[dateStr]) attendanceByDate[dateStr] = { present: 0, absent: 0 };

                    if (record?.presence === 'Present') {
                        totalPresentDays++;
                        attendanceByDate[dateStr].present++;
                    } else if (record?.presence === 'Absent') {
                        absences++;
                        attendanceByDate[dateStr].absent++;
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            if (absences === 0) perfectAttendanceCount++;
        });

        const chartData = Object.entries(attendanceByDate)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30);

        // At-risk calculation using config
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - atRiskConfig.days);
        const lookbackDateStr = toISODateString(lookbackDate);

        const atRiskStudents = activeStudents.map(student => {
            const recentAbsences = attendanceRecords.filter(a =>
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
        }).filter(item => item.recentAbsences >= atRiskConfig.threshold);

        return {
            overallAttendance: totalPossibleDays > 0 ? Math.round((totalPresentDays / totalPossibleDays) * 100) : 0,
            perfectAttendanceCount,
            chartData,
            atRiskStudents
        };
    }, [rawStudents, attendanceRecords, holidays, loading, atRiskConfig]);

    const handleExportAtRisk = () => {
        const dataToExport = analyticsData.atRiskStudents.map(({ student, recentAbsences }) => ({
            id: student.id,
            lastName: student.lastName,
            firstName: student.firstName,
            campus: student.campus,
            gradeLevel: student.gradeLevel,
            absences: recentAbsences
        }));
        const headers = [
            { key: 'id', label: 'Student ID' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'firstName', label: 'First Name' },
            { key: 'campus', label: 'Campus' },
            { key: 'gradeLevel', label: 'Grade Level' },
            { key: 'absences', label: `Absences in Last ${atRiskConfig.days} Days` },
        ];
        exportToCsv(`at-risk-students-${toISODateString(new Date())}`, dataToExport, headers);
    };

    if (loading) return <div>Loading reports...</div>;

    const activeStudentsCount = rawStudents.filter(s => s.status === 'Active').length;

    return (
        <div className="space-y-6">
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'dashboard' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>Dashboard</button>
                <button onClick={() => setActiveTab('atRisk')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'atRisk' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>At-Risk Report</button>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard label="Overall Attendance" value={`${analyticsData.overallAttendance}%`} description="For all active students" />
                        <StatCard label="Perfect Attendance" value={analyticsData.perfectAttendanceCount} description="Students with zero absences" />
                        <StatCard label="Active Students" value={activeStudentsCount} description="Students currently enrolled" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance Trends (Last 30 Days)</h3>
                        <AttendanceTrendChart data={analyticsData.chartData} />
                    </div>
                </div>
            )}

            {activeTab === 'atRisk' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm space-y-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">"At-Risk" Students</h3>
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                        <span className="font-medium">Show students with at least</span>
                        <input type="number" value={atRiskConfig.threshold} onChange={e => setAtRiskConfig(p => ({ ...p, threshold: parseInt(e.target.value, 10) || 1 }))} className="w-20 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                        <span className="font-medium">absences in the last</span>
                        <input type="number" value={atRiskConfig.days} onChange={e => setAtRiskConfig(p => ({ ...p, days: parseInt(e.target.value, 10) || 1 }))} className="w-20 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                        <span className="font-medium">days.</span>
                        <button onClick={handleExportAtRisk} className="ml-auto px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 whitespace-nowrap flex items-center gap-2">
                            <DocumentArrowDownIcon className="h-5 w-5" /> Export CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Last Name</th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">First Name</th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Absences</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                {analyticsData.atRiskStudents.map(({ student, recentAbsences }) => (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <td className="py-3 px-4 whitespace-nowrap"><Link to={`/student/${student.id}`} className="font-medium text-brand-dark hover:underline dark:text-brand-light">{student.lastName}</Link></td>
                                        <td className="py-3 px-4 whitespace-nowrap">{student.firstName}</td>
                                        <td className="py-3 px-4 whitespace-nowrap"><span className="font-bold text-rose-600">{recentAbsences}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {analyticsData.atRiskStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students meet the at-risk criteria.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
