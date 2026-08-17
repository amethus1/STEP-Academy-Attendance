import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStudents } from '../../hooks/useStudents';
import { useAttendanceRange, useHolidays } from '../../hooks/useAttendance';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { useSettings } from '../../hooks/useSettings';
import { useReportingAnalytics } from '../../hooks/useReportingAnalytics';
import { toISODateString, getSchoolYearFromDate } from '../../services/dateUtils';
import { generatePDF } from '../../services/pdfService';
import { DocumentArrowDownIcon, CalendarDaysIcon, ChartBarIcon } from '../icons/Icons';
import { AttendanceTrendChart } from '../common/AttendanceTrendChart';
import { StatCard } from '../common/StatCard';

export const ReportingPage: React.FC = () => {
    const { settings } = useSettings();
    const { data: schoolYears = [] } = useSchoolYears();

    // Derive school year
    const schoolYear = useMemo(() => {
        if (settings.activeSchoolYear) return settings.activeSchoolYear;
        return getSchoolYearFromDate(new Date(), schoolYears);
    }, [settings.activeSchoolYear, schoolYears]);

    // Time range
    const today = toISODateString(new Date());
    const thirtyDaysAgo = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return toISODateString(d);
    }, []);

    const { data: rawStudents = [], isLoading: studentsLoading } = useStudents(schoolYear);
    const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceRange(thirtyDaysAgo, today);
    const { data: holidays = [] } = useHolidays();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'breakdowns' | 'atRisk'>('dashboard');
    const [atRiskConfig, setAtRiskConfig] = useState({ threshold: 5, days: 30 });

    const analytics = useReportingAnalytics({
        students: rawStudents,
        attendance: attendanceRecords,
        holidays,
        dateRange: { start: thirtyDaysAgo, end: today },
        thresholds: { atRisk: atRiskConfig.threshold, atRiskDays: atRiskConfig.days }
    });

    const loading = studentsLoading || attendanceLoading;

    const handleExportAtRisk = () => {
        generatePDF({
            title: 'At-Risk Student Report',
            subtitle: `Students with ${atRiskConfig.threshold}+ absences in the last ${atRiskConfig.days} days`,
            columns: [
                { header: 'Last Name', dataKey: 'lastName' },
                { header: 'First Name', dataKey: 'firstName' },
                { header: 'Grade', dataKey: 'gradeLevel' },
                { header: 'Absences', dataKey: 'absences' }
            ],
            data: analytics.atRisk.map(item => ({
                lastName: item.student.lastName,
                firstName: item.student.firstName,
                gradeLevel: item.student.gradeLevel,
                absences: item.recentAbsences
            })),
            summary: [
                { label: 'Total At-Risk Students', value: analytics.atRisk.length },
                { label: 'Threshold', value: `${atRiskConfig.threshold} absences` }
            ]
        }, `at-risk-report-${today}`);
    };

    const handleExportBreakdown = () => {
        generatePDF({
            title: 'Attendance Breakdown Report',
            subtitle: `Generated on ${today}`,
            columns: [
                { header: 'Group', dataKey: 'name' },
                { header: 'Attendance Rate', dataKey: 'rate' },
                { header: 'Present Days', dataKey: 'present' },
                { header: 'Total Days', dataKey: 'possible' }
            ],
            data: [
                ...analytics.byCampus.map(c => ({ name: `Campus: ${c.name}`, rate: `${c.rate}%`, present: c.present, possible: c.possible })),
                ...analytics.byGrade.map(g => ({ name: `Grade: ${g.name}`, rate: `${g.rate}%`, present: g.present, possible: g.possible }))
            ],
            summary: [
                { label: 'Overall Attendance', value: `${analytics.overall}%` },
                { label: 'Total Active Students', value: analytics.totalActive }
            ]
        }, `attendance-breakdown-${today}`);
    };

    if (loading) return <div>Loading reports...</div>;

    return (
        <div className="space-y-6">
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>
                    <CalendarDaysIcon className="h-4 w-4" /> Dashboard
                </button>
                <button onClick={() => setActiveTab('breakdowns')} className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 ${activeTab === 'breakdowns' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>
                    <ChartBarIcon className="h-4 w-4" /> Breakdowns
                </button>
                <button onClick={() => setActiveTab('atRisk')} className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 ${activeTab === 'atRisk' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>
                    <DocumentArrowDownIcon className="h-4 w-4" /> At-Risk Report
                </button>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard label="Overall Attendance" value={`${analytics.overall}%`} description="For active students (last 30 days)" />
                        <StatCard label="Perfect Attendance" value={analytics.perfectCount} description="Students with zero absences" />
                        <StatCard label="Active Students" value={analytics.totalActive} description="Students currently enrolled" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance Trends</h3>
                        <AttendanceTrendChart data={analytics.chartData} />
                    </div>
                </div>
            )}

            {activeTab === 'breakdowns' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={handleExportBreakdown} className="px-3 py-2 bg-brand text-white rounded-md text-sm hover:bg-brand-dark transition-colors flex items-center gap-2">
                            <DocumentArrowDownIcon className="h-4 w-4" /> Export PDF
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">By Campus</h3>
                            <div className="space-y-4">
                                {analytics.byCampus.map(campus => (
                                    <div key={campus.name}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{campus.name}</span>
                                            <span className="font-bold text-slate-900 dark:text-slate-100">{campus.rate}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                            <div className="bg-brand h-2.5 rounded-full" style={{ width: `${campus.rate}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">By Grade Level</h3>
                            <div className="space-y-4">
                                {analytics.byGrade.map(grade => (
                                    <div key={grade.name}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{grade.name}</span>
                                            <span className="font-bold text-slate-900 dark:text-slate-100">{grade.rate}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                            <div className="bg-brand h-2.5 rounded-full" style={{ width: `${grade.rate}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'atRisk' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center gap-4 justify-between">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">&ldquo;At-Risk&rdquo; Students</h3>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                            <span className="text-sm">Threshold:</span>
                            <input type="number" value={atRiskConfig.threshold} onChange={e => setAtRiskConfig(p => ({ ...p, threshold: parseInt(e.target.value, 10) || 1 }))} className="w-16 p-1 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                            <span className="text-sm">absences in</span>
                            <input type="number" value={atRiskConfig.days} onChange={e => setAtRiskConfig(p => ({ ...p, days: parseInt(e.target.value, 10) || 1 }))} className="w-16 p-1 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                            <span className="text-sm">days</span>
                        </div>
                        <button onClick={handleExportAtRisk} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2 text-sm">
                            <DocumentArrowDownIcon className="h-4 w-4" /> Export PDF
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Student</th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Grade</th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Campus</th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Absences</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                {analytics.atRisk.map(({ student, recentAbsences }) => (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <Link to={`/student/${student.id}`} className="font-medium text-brand-dark hover:underline dark:text-brand-light">
                                                {student.lastName}, {student.firstName}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">{student.gradeLevel}</td>
                                        <td className="py-3 px-4 whitespace-nowrap">{student.campus}</td>
                                        <td className="py-3 px-4 whitespace-nowrap"><span className="font-bold text-rose-600">{recentAbsences}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {analytics.atRisk.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students meet the at-risk criteria.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
