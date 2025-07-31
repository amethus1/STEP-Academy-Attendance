import React, { useState, useMemo, useEffect } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Student, StudentStatus, Presence } from '../../types';
import { toISODateString } from '../../services/dateUtils';
import { exportToCsv } from '../../services/csvService';
import { DocumentArrowDownIcon } from '../icons/Icons';
import { Link } from 'react-router-dom';

// Since chart.js is loaded via CDN, we need to declare it to TypeScript
declare const Chart: any;

const StatCard: React.FC<{ label: string; value: string | number; description?: string }> = ({ label, value, description }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg text-center shadow-sm">
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
      {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>}
    </div>
);

const AttendanceTrendChart: React.FC<{data: {date: string; present: number; absent: number}[]}> = ({ data }) => {
    const chartRef = React.useRef<HTMLCanvasElement>(null);
    const chartInstance = React.useRef<any>(null);

    useEffect(() => {
        if (chartRef.current && data.length > 0) {
            const ctx = chartRef.current.getContext('2d');
            if(chartInstance.current) {
                chartInstance.current.destroy();
            }
            chartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.date),
                    datasets: [
                        {
                            label: 'Present',
                            data: data.map(d => d.present),
                            backgroundColor: 'rgba(16, 185, 129, 0.6)',
                            borderColor: 'rgba(16, 185, 129, 1)',
                            borderWidth: 1,
                        },
                        {
                            label: 'Absent',
                            data: data.map(d => d.absent),
                            backgroundColor: 'rgba(244, 63, 94, 0.6)',
                            borderColor: 'rgba(244, 63, 94, 1)',
                            borderWidth: 1,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                tooltipFormat: 'MMM d, yyyy',
                            },
                            stacked: true,
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true
                        },
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    }
                },
            });
        }

        return () => {
            if(chartInstance.current) {
                chartInstance.current.destroy();
            }
        }
    }, [data]);

    return <div className="h-96"><canvas ref={chartRef}></canvas></div>;
};


export const ReportingPage: React.FC = () => {
    const { students, attendance, holidays, loading } = useAppData();
    const { settings } = useSettings();

    const studentsInYear = useMemo(
        () => students.filter(s =>
            s.registrationDate >= settings.schoolYearStartDate &&
            s.registrationDate <= settings.schoolYearEndDate
        ),
        [students, settings.schoolYearStartDate, settings.schoolYearEndDate]
    );
    const [activeTab, setActiveTab] = useState<'dashboard' | 'atRisk'>('dashboard');

    const [atRiskConfig, setAtRiskConfig] = useState({ threshold: 5, days: 30 });

    const analyticsData = useMemo(() => {
        const activeStudents = studentsInYear.filter(s => s.status === StudentStatus.Active);
        if (loading || activeStudents.length === 0) {
            return {
                overallAttendance: 0,
                perfectAttendanceCount: 0,
                chartData: [],
                atRiskStudents: [],
            };
        }

        const today = new Date();
        let totalPossibleDays = 0;
        let totalPresentDays = 0;
        let perfectAttendanceCount = 0;
        const holidaySet = new Set(holidays.map(h => h.date));
        const attendanceByDate: Record<string, {present: number, absent: number}> = {};

        activeStudents.forEach(student => {
            let absences = 0;
            const entryDate = new Date(student.entryDate + "T12:00:00Z");
            let currentDate = new Date(entryDate);

            while(currentDate <= today) {
                const dateStr = toISODateString(currentDate);
                const dayOfWeek = currentDate.getUTCDay();
                if(dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
                    totalPossibleDays++;
                    const record = attendance.find(a => a.studentId === student.id && a.date === dateStr);
                    
                    if(!attendanceByDate[dateStr]) attendanceByDate[dateStr] = {present: 0, absent: 0};
                    
                    if (record?.presence === Presence.Present) {
                        totalPresentDays++;
                        attendanceByDate[dateStr].present++;
                    } else if (record?.presence === Presence.Absent) {
                        absences++;
                        attendanceByDate[dateStr].absent++;
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            if(absences === 0) perfectAttendanceCount++;
        });
        
        const chartData = Object.entries(attendanceByDate)
            .map(([date, counts]) => ({date, ...counts}))
            .sort((a,b) => a.date.localeCompare(b.date))
            .slice(-30); // Last 30 days for the chart

        const atRiskStudents = activeStudents.map(student => {
            const lookbackDate = new Date();
            lookbackDate.setDate(lookbackDate.getDate() - atRiskConfig.days);
            const lookbackDateStr = toISODateString(lookbackDate);
            
            const recentAbsences = attendance.filter(a => 
                a.studentId === student.id && 
                a.presence === Presence.Absent && 
                a.date >= lookbackDateStr
            ).length;
            
            return { student, recentAbsences };
        }).filter(item => item.recentAbsences >= atRiskConfig.threshold);


        return {
            overallAttendance: totalPossibleDays > 0 ? Math.round((totalPresentDays / totalPossibleDays) * 100) : 0,
            perfectAttendanceCount,
            chartData,
            atRiskStudents
        };
    }, [studentsInYear, attendance, holidays, loading, atRiskConfig]);
    
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
    }
    
    if (loading) return <div>Loading reports...</div>
    
    const activeStudentsCount = studentsInYear.filter(s => s.status === StudentStatus.Active).length;

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
                         <input type="number" value={atRiskConfig.threshold} onChange={e => setAtRiskConfig(p => ({...p, threshold: parseInt(e.target.value, 10) || 1}))} className="w-20 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                         <span className="font-medium">absences in the last</span>
                          <input type="number" value={atRiskConfig.days} onChange={e => setAtRiskConfig(p => ({...p, days: parseInt(e.target.value, 10) || 1}))} className="w-20 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
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
