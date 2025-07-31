import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Presence, Student, StudentStatus } from '../../types';
import { toISODateString, getDaysAttended, formatDateForDisplay, getStartOfWeek, getWeekDays, calculateProjectedReleaseDate } from '../../services/dateUtils';
import { CheckCircleIcon, XCircleIcon } from '../icons/Icons';

const AttendanceButton: React.FC<{ currentPresence?: Presence; targetPresence: Presence; onClick: () => void }> = ({ currentPresence, targetPresence, onClick }) => {
  const isSelected = currentPresence === targetPresence;

  return (
    <button onClick={onClick} className={`p-1 rounded-full transition-colors duration-150 ${isSelected ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      {targetPresence === Presence.Present ? 
        <CheckCircleIcon className={`h-6 w-6 transition-all ${isSelected ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-500 hover:text-emerald-400'}`} /> : 
        <XCircleIcon className={`h-6 w-6 transition-all ${isSelected ? 'text-rose-500' : 'text-slate-300 dark:text-slate-500 hover:text-rose-400'}`} />
      }
    </button>
  );
};

type WeeklyStudent = Student & { daysRemaining: number; projectedReleaseDate: string; };
type SortKey = keyof WeeklyStudent | string;

const fixedColumns: { id: SortKey; label: string; isSticky?: boolean; widthClass?: string }[] = [
    { id: 'lastName', label: 'Last Name', isSticky: true, widthClass: 'w-32' },
    { id: 'firstName', label: 'First Name', isSticky: true, widthClass: 'w-32' },
    { id: 'id', label: 'ID', widthClass: 'w-28' },
    { id: 'campus', label: 'Campus', widthClass: 'w-28' },
    { id: 'gradeLevel', label: 'Grade', widthClass: 'w-20' },
    { id: 'status', label: 'Status', widthClass: 'w-24' },
    { id: 'daysRemaining', label: 'Days Left', widthClass: 'w-24' },
    { id: 'projectedReleaseDate', label: 'Release Date', widthClass: 'w-32' },
];

const StatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  const colorClasses = {
    [StudentStatus.Active]: 'bg-emerald-100 text-emerald-800',
    [StudentStatus.Completed]: 'bg-sky-100 text-sky-800',
    [StudentStatus.Withdrawn]: 'bg-slate-100 text-slate-800',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[status]}`}>{status}</span>;
};


export const WeeklyView: React.FC = () => {
  const { students, attendance, holidays, markAttendance, loading } = useAppData();
  const { settings } = useSettings();

  const studentsInYear = useMemo(
    () => students.filter(s =>
      s.registrationDate >= settings.schoolYearStartDate &&
      s.registrationDate <= settings.schoolYearEndDate
    ),
    [students, settings.schoolYearStartDate, settings.schoolYearEndDate]
  );

  const [currentDate, setCurrentDate] = useState(new Date());
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'lastName', direction: 'asc' });

  // Filters
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'All'>(StudentStatus.Active);
  const [gradeFilter, setGradeFilter] = useState('All');
  const [spedFilter, setSpedFilter] = useState('All');

  const gradeLevels = useMemo(
    () => ['All', ...Array.from(new Set(studentsInYear.map(s => s.gradeLevel).filter(Boolean)))],
    [studentsInYear]
  );
  const spedOptions = ['All', 'None', 'SPED', '504'];


  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  const displayDays = useMemo(() => getWeekDays(startOfWeek), [startOfWeek]);
  
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const todayStr = toISODateString(new Date());

  const changeWeek = (offset: number) => {
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (offset * 7));
        return newDate;
    });
  };

  const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateVal = e.target.value;
      setCurrentDate(new Date(dateVal + 'T12:00:00Z'));
  }

  const extendedStudentData = useMemo(() => {
      const todayStr = toISODateString(new Date());
      return studentsInYear.map(student => {
          const daysAttended = getDaysAttended(student.id, attendance);
          const daysRemaining = student.daysAssigned - daysAttended - (student.creditDays || 0);
          const projectedReleaseDate = calculateProjectedReleaseDate(student, attendance, holidays, todayStr);
          return {...student, daysRemaining: daysRemaining > 0 ? daysRemaining : 0, projectedReleaseDate }
      });
  }, [studentsInYear, attendance, holidays]);

  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = extendedStudentData.filter(s => {
        const statusMatch = statusFilter === 'All' || s.status === statusFilter;
        const gradeMatch = gradeFilter === 'All' || s.gradeLevel === gradeFilter;
        const spedMatch = spedFilter === 'All' || s.sped504 === spedFilter;
        return statusMatch && gradeMatch && spedMatch;
    });
    
    return [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof WeeklyStudent];
      const bVal = b[sortConfig.key as keyof WeeklyStudent];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [extendedStudentData, statusFilter, gradeFilter, spedFilter, sortConfig]);

  const handleMarkAttendance = (studentId: string, date: string, currentPresence: Presence | undefined, targetPresence: Presence) => {
    const newPresence = currentPresence === targetPresence ? null : targetPresence;
    markAttendance(studentId, date, newPresence);
  };
  
  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getCellValue = (student: WeeklyStudent, columnId: SortKey) => {
    switch(columnId) {
        case 'lastName':
            return <Link to={`/student/${student.id}`} className="hover:underline text-brand-dark dark:text-brand-light">{student.lastName}</Link>;
        case 'firstName':
            return student.firstName;
        case 'id':
            return student.id;
        case 'campus':
            return student.campus;
        case 'gradeLevel':
            return student.gradeLevel;
        case 'status':
            return <StatusBadge status={student.status} />;
        case 'daysRemaining':
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.daysRemaining > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{student.daysRemaining}</span>
        case 'projectedReleaseDate': {
            const dateVal = student.projectedReleaseDate;
            return dateVal && dateVal !== 'N/A' && dateVal !== 'Completed' ? formatDateForDisplay(dateVal as string) : dateVal;
        }
        default:
            return student[columnId as keyof WeeklyStudent] as string | number;
    }
  }

  if (loading) return <div className="text-center p-8">Loading student data...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => changeWeek(-1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Prev Week</button>
            <input type="date" value={toISODateString(currentDate)} onChange={handleDateJump} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            <button onClick={() => changeWeek(1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Next Week</button>
        </div>
      </div>

       <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    <option value="All">All</option>
                    <option value={StudentStatus.Active}>Active</option>
                    <option value={StudentStatus.Completed}>Completed</option>
                    <option value={StudentStatus.Withdrawn}>Withdrawn</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Grade:</label>
                <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">SPED/504:</label>
                <select value={spedFilter} onChange={e => setSpedFilter(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    {spedOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
       </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {fixedColumns.map((col, index) => (
                <th 
                  key={col.id} 
                  onClick={() => requestSort(col.id)} 
                  className={`py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap ${col.isSticky ? `sticky z-20 bg-slate-50 dark:bg-slate-800 ${index === 0 ? 'left-0' : 'left-32'}` : ''} ${col.widthClass ? col.widthClass : ''}`}
                >
                    {col.label} {sortConfig.key === col.id ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              {displayDays.map(day => (
                <th key={day.toISOString()} className="py-3 px-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  <span className="block font-normal text-slate-400">{formatDateForDisplay(day)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
            {sortedAndFilteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  {fixedColumns.map((col, index) => (
                      <td key={col.id} className={`py-3 px-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 ${col.isSticky ? `sticky z-10 ${index === 0 ? 'left-0' : 'left-32'}`: ''} ${col.widthClass ? col.widthClass : ''}`}>
                        {getCellValue(student, col.id)}
                      </td>
                  ))}
                  {displayDays.map(day => {
                    const dateStr = toISODateString(day);
                    const attendanceRecord = attendance.find(a => a.studentId === student.id && a.date === dateStr);
                    const isFuture = dateStr > todayStr;
                    const isBeforeEntry = dateStr < student.entryDate;
                    const isHoliday = holidaySet.has(dateStr);
                    const isDisabled = student.status !== StudentStatus.Active || isFuture || isBeforeEntry || isHoliday;
                    const isRegistrationDay = student.registrationDate === dateStr;
                    
                    if (isHoliday) {
                        return <td key={dateStr} className="py-3 px-4 text-center bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 text-xs font-bold">HOLIDAY</td>
                    }

                    return (
                      <td key={dateStr} className="py-3 px-4 text-center relative">
                        {isRegistrationDay && <span className="absolute top-1 right-1 text-xs font-bold text-purple-600 dark:text-purple-400" title={`Registered on ${formatDateForDisplay(dateStr)}`}>R</span>}
                        {isDisabled ? <div className="h-8 w-16" /> : (
                            <div className="flex justify-center items-center gap-2">
                                <AttendanceButton 
                                    currentPresence={attendanceRecord?.presence} 
                                    targetPresence={Presence.Present}
                                    onClick={() => handleMarkAttendance(student.id, dateStr, attendanceRecord?.presence, Presence.Present)}
                                />
                                <AttendanceButton 
                                    currentPresence={attendanceRecord?.presence} 
                                    targetPresence={Presence.Absent}
                                    onClick={() => handleMarkAttendance(student.id, dateStr, attendanceRecord?.presence, Presence.Absent)}
                                />
                            </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
        {sortedAndFilteredStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students match the current filter.</p>}
      </div>
    </div>
  );
};