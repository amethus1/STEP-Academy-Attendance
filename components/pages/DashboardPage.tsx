import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudents, useCreateStudent } from '../../hooks/useStudents';
import { useAttendanceRange, useHolidays } from '../../hooks/useAttendance';
// import { useSchoolYears } from '../../hooks/useSchoolYears'; // Removed as unused
import { useSettings } from '../../hooks/useSettings';
import { StudentStatus, Presence, Student } from '../../types';
import { toISODateString } from '../../services/dateUtils';
import { groupAttendanceByDate, groupAttendanceByStudent } from '../../services/attendanceUtils';
import { useActiveSchoolYear } from '../../hooks/useActiveSchoolYear';
import { StatCard } from '../common/StatCard';
import { AttendanceTrendChart } from '../common/AttendanceTrendChart';
import { PageLoadingSkeleton } from '../common/SkeletonLoader';
import { UserGroupIcon, ChartBarIcon, CalendarDaysIcon, PlusIcon, CheckCircleIcon } from '../icons/Icons';
import { StudentFormModal } from '../common/StudentFormModal';
import { DBStudent, DBEnrollment } from '../../db/queries';

type TimePeriod = '7days' | '14days' | '30days' | 'year';

export const DashboardPage: React.FC = () => {
    const { settings } = useSettings();
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('14days');
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

    // const { data: schoolYears = [] } = useSchoolYears(); // Removed as unused

    const schoolYear = useActiveSchoolYear();

    // Date range for attendance
    const today = toISODateString(new Date());
    const periodDays = timePeriod === '7days' ? 7 : timePeriod === '14days' ? 14 : timePeriod === '30days' ? 30 : 90;
    const startDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - periodDays);
        return toISODateString(d);
    }, [periodDays]);

    const { data: rawStudents = [], isLoading: studentsLoading } = useStudents(schoolYear);
    const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceRange(startDate, today);
    // const { data: holidays = [] } = useHolidays(); // Unused for now

    const { mutate: createStudent } = useCreateStudent();

    const loading = studentsLoading || attendanceLoading;

    // Prepare student data for modal duplicate check (Student shape)
    const existingStudentData = useMemo(() => {
        return rawStudents.map(s => ({
            id: s.studentId,
            studentNumber: s.student_number || s.studentId,
            firstName: s.first_name,
            lastName: s.last_name,
            campus: s.campus || '',
            gradeLevel: s.grade_level,
            status: s.status as StudentStatus,
            entryDate: s.start_date,
            registrationDate: s.start_date,
            exitDate: s.end_date || '',
            daysAssigned: s.days_assigned,
            creditDays: s.credit_days || 0,
            sped504: s.sped_504 || 'None',
            drgOffense: s.drg_offense || '',
            comments: s.comments || '',
            photoUrl: s.photo_url,
            guardianName: s.guardian_name || '',
            guardianPhone: s.guardian_phone || '',
            emergencyContactName: s.emergency_contact_name || '',
            emergencyContactPhone: s.emergency_contact_phone || '',
            customFields: (() => {
                try {
                    return s.custom_fields ? JSON.parse(s.custom_fields) : {};
                } catch (e) {
                    console.error('Failed to parse custom_fields for student', s.id, e);
                    return {};
                }
            })(),
        }));
    }, [rawStudents]);

    const handleSaveStudent = (student: Student) => {
        const profile: DBStudent = {
            id: student.id,
            student_number: student.studentNumber || null,
            first_name: student.firstName,
            last_name: student.lastName,
            dob: null,
            guardian_name: student.guardianName,
            guardian_phone: student.guardianPhone,
            emergency_contact_name: student.emergencyContactName,
            emergency_contact_phone: student.emergencyContactPhone,
            photo_url: student.photoUrl,
            custom_fields: JSON.stringify(student.customFields)
        };
        const enrollment: DBEnrollment = {
            id: crypto.randomUUID(),
            student_id: student.id,
            school_year: schoolYear,
            start_date: student.entryDate,
            end_date: student.exitDate || null,
            grade_level: student.gradeLevel,
            campus: student.campus,
            status: student.status,
            sped_504: student.sped504,
            drg_offense: student.drgOffense,
            days_assigned: student.daysAssigned,
            credit_days: student.creditDays,
            comments: student.comments
        };

        createStudent({ student: profile, enrollment });
        setIsStudentModalOpen(false);
    };

    const stats = useMemo(() => {
        if (loading) return null;

        const activeStudents = rawStudents.filter(s => s.status === 'Active');

        // Pre-group attendance data to avoid O(N^2) scans
        const attendanceByDate = groupAttendanceByDate(attendanceRecords);
        const attendanceByStudent = groupAttendanceByStudent(attendanceRecords);

        // Today's Attendance
        const todaysAttendance = attendanceByDate.get(today) || [];
        const presentCount = todaysAttendance.filter(a => a.presence === 'Present').length;
        const attendanceRate = activeStudents.length > 0
            ? Math.round((presentCount / activeStudents.length) * 100)
            : 0;

        // At Risk (>5 absences in the period)
        const atRiskCount = activeStudents.filter(s => {
            const studentRecords = attendanceByStudent.get(s.studentId) || [];
            const recentAbsences = studentRecords.filter(a => a.presence === 'Absent').length;
            return recentAbsences >= 5;
        }).length;

        // Chart Data
        const chartData: { date: string; present: number; absent: number }[] = [];
        for (let i = periodDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = toISODateString(d);

            // Skip weekends
            if (d.getDay() === 0 || d.getDay() === 6) continue;

            const dayRecords = attendanceByDate.get(dateStr) || [];
            chartData.push({
                date: dateStr,
                present: dayRecords.filter(a => a.presence === 'Present').length,
                absent: dayRecords.filter(a => a.presence === 'Absent').length
            });
        }

        return {
            activeCount: activeStudents.length,
            attendanceRate,
            atRiskCount,
            chartData
        };
    }, [rawStudents, attendanceRecords, loading, periodDays, today]);

    if (loading || !stats) return <PageLoadingSkeleton />;

    return (
        <div className="space-y-8">
            <StudentFormModal
                isOpen={isStudentModalOpen}
                onClose={() => setIsStudentModalOpen(false)}
                onSave={handleSaveStudent}
                existingIds={rawStudents.map(s => s.studentId)}
                existingStudents={existingStudentData}
                customFieldDefinitions={settings.customFieldDefinitions || []}
            />

            {/* Welcome Section */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400">Overview of student attendance and activity.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/daily" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm transition-all">
                        <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                        Daily Attendance
                    </Link>
                    <button onClick={() => setIsStudentModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-lg shadow-sm transition-all">
                        <PlusIcon className="h-5 w-5" />
                        Add Student
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Today's Attendance"
                    value={`${stats.attendanceRate}%`}
                    description="of active students present"
                    icon={<CheckCircleIcon className="h-8 w-8 text-emerald-500" />}
                />
                <StatCard
                    label="Active Students"
                    value={stats.activeCount}
                    description="Currently enrolled"
                    icon={<UserGroupIcon className="h-8 w-8 text-brand" />}
                />
                <StatCard
                    label="At-Risk Students"
                    value={stats.atRiskCount}
                    description="> 5 absences in period"
                    icon={<ChartBarIcon className="h-8 w-8 text-rose-500" />}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Attendance Trend</h3>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button onClick={() => setTimePeriod('7days')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timePeriod === '7days' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>7 Days</button>
                                <button onClick={() => setTimePeriod('14days')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timePeriod === '14days' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>14 Days</button>
                                <button onClick={() => setTimePeriod('30days')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timePeriod === '30days' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>30 Days</button>
                                <button onClick={() => setTimePeriod('year')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timePeriod === 'year' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>90 Days</button>
                            </div>
                            <Link to="/reports" className="text-sm text-brand hover:text-brand-dark font-medium whitespace-nowrap">View Full Report &rarr;</Link>
                        </div>
                    </div>
                    <AttendanceTrendChart data={stats.chartData} />
                </div>

                {/* Quick Links / Recent Activity */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Quick Navigation</h3>
                        <nav className="space-y-2">
                            <Link to="/roster" className="flex items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                <div className="p-2 bg-brand-light dark:bg-slate-700 rounded-md text-brand dark:text-brand-light group-hover:bg-brand group-hover:text-white transition-colors">
                                    <UserGroupIcon className="h-5 w-5" />
                                </div>
                                <div className="ml-3">
                                    <p className="font-medium text-slate-800 dark:text-slate-200">Student Roster</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage students and profiles</p>
                                </div>
                            </Link>
                            <Link to="/attendance" className="flex items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                <div className="p-2 bg-emerald-100 dark:bg-slate-700 rounded-md text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <CalendarDaysIcon className="h-5 w-5" />
                                </div>
                                <div className="ml-3">
                                    <p className="font-medium text-slate-800 dark:text-slate-200">Weekly View</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">View attendance by week</p>
                                </div>
                            </Link>
                            <Link to="/reports" className="flex items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                <div className="p-2 bg-purple-100 dark:bg-slate-700 rounded-md text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                    <ChartBarIcon className="h-5 w-5" />
                                </div>
                                <div className="ml-3">
                                    <p className="font-medium text-slate-800 dark:text-slate-200">Reports</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Analyze trends and data</p>
                                </div>
                            </Link>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
};
