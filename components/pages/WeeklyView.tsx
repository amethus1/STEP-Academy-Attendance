import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStudents, useCreateStudent } from '../../hooks/useStudents';
import { useAttendanceRange, useSaveAttendance, useDeleteAttendance, useHolidays } from '../../hooks/useAttendance';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { useSettings } from '../../hooks/useSettings';
import { Presence, Student, StudentStatus } from '../../types';
import { ExtendedStudent, mapDBStudentToUI } from '../../services/mappers';
import { toISODateString, getDaysAttended, formatDateForDisplay, getStartOfWeek, getWeekDays, getSchoolYearFromDate } from '../../services/dateUtils';
import { StatusBadge } from '../common/StatusBadge';
import { AttendanceButton } from '../common/AttendanceButton';
import { PageLoadingSkeleton } from '../common/SkeletonLoader';
import { WeeklyStudentRow } from './WeeklyStudentRow';
import { ChipFilter } from '../common/ChipFilter';
import { BulkActionBar } from './BulkActionBar';

type SortKey = keyof ExtendedStudent | string;
const EMPTY_MAP = {};

const fixedColumns: { id: SortKey; label: string; isSticky?: boolean; widthClass?: string }[] = [
  { id: 'select', label: '', isSticky: true, widthClass: 'w-10' }, // Checkbox
  { id: 'lastName', label: 'Last Name', isSticky: true, widthClass: 'w-32' },
  { id: 'firstName', label: 'First Name', isSticky: true, widthClass: 'w-32' },
  { id: 'studentNumber', label: 'ID', widthClass: 'w-28' },
  { id: 'campus', label: 'Campus', widthClass: 'w-28' },
  { id: 'gradeLevel', label: 'Grade', widthClass: 'w-20' },
  { id: 'status', label: 'Status', widthClass: 'w-24' },
  { id: 'daysRemaining', label: 'Days Left', widthClass: 'w-24' },
  { id: 'projectedReleaseDate', label: 'Release Date', widthClass: 'w-32' },
];


export const WeeklyView: React.FC = () => {
  // const { students, attendance, holidays, markAttendance, loading } = useAppData(); // REMOVED
  const { settings } = useSettings();
  const { data: schoolYears = [] } = useSchoolYears();

  const [currentDate, setCurrentDate] = useState<string>(toISODateString(new Date()));

  // Derive school year - prefer manual selection, else auto-detect
  const schoolYear = useMemo(() => {
    if (settings.activeSchoolYear) {
      return settings.activeSchoolYear;
    }
    return getSchoolYearFromDate(new Date(currentDate + "T12:00:00Z"), schoolYears);
  }, [settings.activeSchoolYear, currentDate, schoolYears]);

  const { data: rawStudents, isLoading: studentsLoading } = useStudents(schoolYear);
  const { data: holidays = [] } = useHolidays();
  const { mutate: saveAttendance } = useSaveAttendance();
  const { mutate: deleteAttendance } = useDeleteAttendance();

  // Helper types
  function urlHolidaysToHolidays(hols: any[]) { return hols; }

  const startOfWeek = useMemo(() => getStartOfWeek(new Date(currentDate + 'T12:00:00Z')), [currentDate]);
  const displayDays = useMemo(() => getWeekDays(startOfWeek), [startOfWeek]);

  // Fetch attendance for the visible week
  // Calculate end of week (last day of displayDays)
  const rangeStartStr = toISODateString(displayDays[0]);
  const rangeEndStr = toISODateString(displayDays[displayDays.length - 1]);

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceRange(rangeStartStr, rangeEndStr);

  const attendanceByStudent = useMemo(() => {
    const map: Record<string, Record<string, Presence>> = {};
    for (const record of attendanceRecords) {
      if (!map[record.student_id]) map[record.student_id] = {};
      map[record.student_id][record.date] = record.presence as Presence;
    }
    return map;
  }, [attendanceRecords]);

  const studentsInYear = useMemo(() => {
    if (!rawStudents) return [];
    return rawStudents.map(s => mapDBStudentToUI(s, urlHolidaysToHolidays(holidays)));
  }, [rawStudents, holidays]);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'lastName', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'All'>(StudentStatus.Active);
  const [gradeFilter, setGradeFilter] = useState('All');
  const [spedFilter, setSpedFilter] = useState('All');

  const gradeLevels = useMemo(
    () => ['All', ...Array.from(new Set(studentsInYear.map(s => s.gradeLevel).filter(Boolean)))],
    [studentsInYear]
  );
  const spedOptions = ['All', 'None', 'SPED', '504'];

  /* Selection State */
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedStudentIds.size === studentsInYear.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(studentsInYear.map(s => s.id)));
    }
  }, [selectedStudentIds.size, studentsInYear]);

  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const todayStr = toISODateString(new Date());

  const changeWeek = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev + 'T12:00:00Z');
      newDate.setDate(newDate.getDate() + (offset * 7));
      return toISODateString(newDate);
    });
  };

  const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    if (dateVal) {
      setCurrentDate(dateVal);
    }
  }

  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = studentsInYear.filter(s => {
      // Logic from legacy: filter by school year dates (handled by useStudents query)
      // Additional logic: filter by status, grade, etc.

      const statusMatch = statusFilter === 'All' || s.status === statusFilter;
      const gradeMatch = gradeFilter === 'All' || s.gradeLevel === gradeFilter;
      const spedMatch = spedFilter === 'All' || s.sped504 === spedFilter;
      const searchMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && gradeMatch && spedMatch && searchMatch;
    });

    return [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof ExtendedStudent];
      const bVal = b[sortConfig.key as keyof ExtendedStudent];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [studentsInYear, statusFilter, gradeFilter, spedFilter, sortConfig, searchTerm]);

  const handleMarkAttendance = useCallback((studentId: string, date: string, currentPresence: Presence | undefined, targetPresence: Presence) => {
    const newPresence = currentPresence === targetPresence ? null : targetPresence;

    if (newPresence === null) {
      deleteAttendance({ studentId, date });
      return;
    }

    saveAttendance([{
      id: crypto.randomUUID(),
      enrollment_id: studentsInYear.find(s => s.id === studentId)?.enrollmentId!,
      student_id: studentId,
      date: date,
      presence: newPresence
    }]);
  }, [deleteAttendance, saveAttendance, studentsInYear]);

  const handleBulkMark = useCallback((presence: Presence) => {
    if (selectedStudentIds.size === 0) return;
    const dateStr = todayStr; // Bulk mark for TODAY only

    const records = Array.from(selectedStudentIds).map((studentId: string) => ({
      id: crypto.randomUUID(),
      enrollment_id: studentsInYear.find(s => s.id === studentId)?.enrollmentId!,
      student_id: studentId,
      date: dateStr,
      presence: presence
    }));

    saveAttendance(records);
    setSelectedStudentIds(new Set()); // Clear selection after action? Or keep it? keep is better for toggling back/forth.
    // But clearing gives feedback "done". Let's clear properly.
  }, [selectedStudentIds, studentsInYear, saveAttendance, todayStr]);

  const isHoliday = useCallback((date: string) => holidaySet.has(date), [holidaySet]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getCellValue = (student: ExtendedStudent, columnId: SortKey) => {
    switch (columnId) {
      case 'lastName':
        return <Link to={`/student/${student.id}`} className="hover:underline text-brand-dark dark:text-brand-light">{student.lastName}</Link>;
      case 'firstName':
        return student.firstName;
      case 'studentNumber':
        return student.studentNumber || student.id;
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
        return student[columnId as keyof ExtendedStudent] as string | number;
    }
  }

  const loading = studentsLoading || attendanceLoading;

  if (loading) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => changeWeek(-1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Prev Week</button>
          <input type="date" value={currentDate} onChange={handleDateJump} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
          <button onClick={() => changeWeek(1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Next Week</button>
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
        <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
          {/* Filters */}
          <ChipFilter
            label="Status"
            selectedValue={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { label: 'Active', value: StudentStatus.Active },
              { label: 'Completed', value: StudentStatus.Completed },
              { label: 'Withdrawn', value: StudentStatus.Withdrawn }
            ]}
          />
          <ChipFilter
            label="Grade"
            selectedValue={gradeFilter}
            onChange={setGradeFilter}
            options={gradeLevels.filter(g => g !== 'All').map(g => ({ label: g, value: g }))}
          />
          <ChipFilter
            label="SPED/504"
            selectedValue={spedFilter}
            onChange={setSpedFilter}
            options={[
              { label: 'None', value: 'None' },
              { label: 'SPED', value: 'SPED' },
              { label: '504', value: '504' }
            ]}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {fixedColumns.map((col, index) => (
                <th
                  key={col.id}
                  onClick={() => col.id !== 'select' && requestSort(col.id)}
                  className={`py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.isSticky ? `sticky z-20 bg-slate-50 dark:bg-slate-800 ${index === 0 ? 'left-0' : 'left-10'}` : ''} ${col.widthClass ? col.widthClass : ''} ${col.id !== 'select' ? 'cursor-pointer' : ''}`}
                >
                  {col.id === 'select' ? (
                    <input type="checkbox" checked={studentsInYear.length > 0 && selectedStudentIds.size === studentsInYear.length} onChange={toggleAll} className="rounded border-slate-300 text-brand focus:ring-brand" />
                  ) : (
                    <>
                      {col.label} {sortConfig.key === col.id ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </>
                  )}
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
              <WeeklyStudentRow
                key={student.id}
                student={student}
                displayDays={displayDays}
                attendanceMap={attendanceByStudent[student.id] || EMPTY_MAP}
                fixedColumns={fixedColumns}
                sortConfig={sortConfig}
                onMarkAttendance={handleMarkAttendance}
                isHoliday={isHoliday}
                todayStr={todayStr}
                isSelected={selectedStudentIds.has(student.id)}
                onToggleSelection={toggleSelection}
              />
            ))}
          </tbody>
        </table>
        {sortedAndFilteredStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students match the current filter.</p>}
      </div>

      <BulkActionBar
        selectedCount={selectedStudentIds.size}
        onClearSelection={() => setSelectedStudentIds(new Set())}
        onMarkAll={handleBulkMark}
      />
    </div>
  );
};