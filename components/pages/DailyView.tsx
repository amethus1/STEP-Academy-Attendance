import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Student, StudentStatus, Presence } from '../../types';
import { toISODateString, getDaysAttended, calculateProjectedReleaseDate, formatDateForDisplay } from '../../services/dateUtils';
import { CheckCircleIcon, XCircleIcon } from '../icons/Icons';

type DailyStudent = Student & { daysRemaining: number; projectedReleaseDate: string; };
type SortKey = keyof DailyStudent | string;
type AttendanceFilterType = 'All' | 'Present' | 'Absent' | 'Pending';

const StatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  const colorClasses = {
    [StudentStatus.Active]: 'bg-emerald-100 text-emerald-800',
    [StudentStatus.Completed]: 'bg-sky-100 text-sky-800',
    [StudentStatus.Withdrawn]: 'bg-slate-100 text-slate-800',
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[status]}`}>
      {status}
    </span>
  );
};

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

const dailyViewColumns: { id: SortKey; label: string; }[] = [
    { id: 'lastName', label: 'Last Name' },
    { id: 'firstName', label: 'First Name' },
    { id: 'id', label: 'ID' },
    { id: 'campus', label: 'Campus' },
    { id: 'gradeLevel', label: 'Grade' },
    { id: 'status', label: 'Status' },
    { id: 'daysRemaining', label: 'Days Left' },
    { id: 'projectedReleaseDate', label: 'Release Date' },
];

export const DailyView: React.FC = () => {
  const { students, attendance, holidays, markAttendance, loading } = useAppData();
  const { settings } = useSettings();

  const studentsInYear = useMemo(
    () => students.filter(s =>
      s.registrationDate >= settings.schoolYearStartDate &&
      s.registrationDate <= settings.schoolYearEndDate
    ),
    [students, settings.schoolYearStartDate, settings.schoolYearEndDate]
  );
  const [selectedDate, setSelectedDate] = useState(toISODateString(new Date()));
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'lastName', direction: 'asc' });

  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'All'>(StudentStatus.Active);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilterType>('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [spedFilter, setSpedFilter] = useState('All');
  
  const gradeLevels = useMemo(
    () => ['All', ...Array.from(new Set(studentsInYear.map(s => s.gradeLevel).filter(Boolean)))],
    [studentsInYear]
  );
  const spedOptions = ['All', 'None', 'SPED', '504'];

  const changeDay = (amount: number) => {
    setSelectedDate(prev => {
        const newDate = new Date(prev + "T12:00:00Z");
        newDate.setDate(newDate.getDate() + amount);
        return toISODateString(newDate);
    });
  };
  
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
    let filteredStudents = extendedStudentData.filter(s => {
        // Base filters
        const eligibleOnDate = s.entryDate <= selectedDate;
        const statusMatch = statusFilter === 'All' || s.status === statusFilter;
        const gradeMatch = gradeFilter === 'All' || s.gradeLevel === gradeFilter;
        const spedMatch = spedFilter === 'All' || s.sped504 === spedFilter;
        const searchMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase());

        if(!eligibleOnDate || !statusMatch || !gradeMatch || !spedMatch || !searchMatch) return false;

        // Attendance filter
        const record = attendance.find(a => a.studentId === s.id && a.date === selectedDate);
        switch(attendanceFilter) {
            case 'Present':
                return record?.presence === Presence.Present;
            case 'Absent':
                return record?.presence === Presence.Absent;
            case 'Pending':
                // Pending only applies to active students on the selected day
                return s.status === StudentStatus.Active && !record;
            case 'All':
            default:
                return true;
        }
    });
    
    return [...filteredStudents].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof DailyStudent];
      const bVal = b[sortConfig.key as keyof DailyStudent];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  }, [extendedStudentData, attendance, statusFilter, attendanceFilter, gradeFilter, spedFilter, selectedDate, sortConfig, searchTerm]);

  const handleMarkAttendance = (studentId: string, currentPresence: Presence | undefined, targetPresence: Presence) => {
    const newPresence = currentPresence === targetPresence ? null : targetPresence;
    markAttendance(studentId, selectedDate, newPresence);
  };
  
  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getCellValue = (student: DailyStudent, columnId: SortKey) => {
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
            return student[columnId as keyof DailyStudent] as string | number;
    }
  }
  
  if (loading) return <div className="text-center p-8">Loading student data...</div>;

  return (
    <div className="space-y-6">
       <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDay(-1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Prev Day</button>
           <input 
              id="date-selector"
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
            />
          <button onClick={() => changeDay(1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Next Day</button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex items-center gap-4 flex-wrap">
            <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
            />
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
                <label className="text-sm font-medium">Attendance:</label>
                <select value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value as any)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    <option value="All">All</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Pending">Pending</option>
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
              {dailyViewColumns.map(col => (
                <th 
                  key={col.id} 
                  onClick={() => requestSort(col.id)} 
                  className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                >
                    {col.label} {sortConfig.key === col.id ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attendance</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
             {sortedAndFilteredStudents.map(student => {
               const attendanceRecord = attendance.find(a => a.studentId === student.id && a.date === selectedDate);
               const isDisabled = student.status !== StudentStatus.Active;
               
               return (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    {dailyViewColumns.map(col => (
                        <td key={col.id} className="py-3 px-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-100">
                            {getCellValue(student, col.id)}
                        </td>
                    ))}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex justify-center items-center gap-4">
                        {isDisabled ? (
                           <span className="text-sm text-slate-400 dark:text-slate-500">N/A</span>
                        ) : (
                          <>
                            <AttendanceButton 
                                currentPresence={attendanceRecord?.presence} 
                                targetPresence={Presence.Present}
                                onClick={() => handleMarkAttendance(student.id, attendanceRecord?.presence, Presence.Present)}
                            />
                            <AttendanceButton 
                                currentPresence={attendanceRecord?.presence} 
                                targetPresence={Presence.Absent}
                                onClick={() => handleMarkAttendance(student.id, attendanceRecord?.presence, Presence.Absent)}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
               );
             })}
          </tbody>
        </table>
        {sortedAndFilteredStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students match the current filter.</p>}
      </div>
    </div>
  );
};
