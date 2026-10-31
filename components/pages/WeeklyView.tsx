import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useStudents } from '../../hooks/useStudents';
import { useAttendanceRange } from '../../hooks/useAttendance';
import { useSchoolCalendar } from '../../hooks/useSummerSessions';
import { useActiveSchoolYear } from '../../hooks/useActiveSchoolYear';
import { useSettings } from '../../hooks/useSettings';
import { useAttendanceMarking } from '../../hooks/useAttendanceMarking';
import { useKeyboardEntry } from '../../hooks/useKeyboardEntry';
import { Presence, StudentStatus } from '../../types';
import { mapDBStudentToUI } from '../../services/mappers';
import { isInRegularTerm, isWeekend } from '../../services/schoolCalendar';
import { toISODateString, formatDateForDisplay, getStartOfWeek, getWeekDays } from '../../services/dateUtils';
import { getDayCompleteness, canRecordAttendance, isSchoolDay } from '../../services/attendanceCompleteness';

import { PageLoadingSkeleton } from '../common/SkeletonLoader';
import { WeeklyStudentRow } from './WeeklyStudentRow';
import { ChipFilter } from '../common/ChipFilter';
import { BulkActionBar } from './BulkActionBar';
import { ChevronUpIcon, ChevronDownIcon, CheckCircleIcon } from '../icons/Icons';
import { useStudentFilter, SortKey } from '../../hooks/useStudentFilter';

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

/** A keycap, for the keyboard-entry hint bar. */
const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-1.5 py-0.5 rounded border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-800 font-sans font-semibold">
    {children}
  </kbd>
);

export const WeeklyView: React.FC = () => {
  const { settings, saveSettings } = useSettings();
  const [currentDate, setCurrentDate] = useState<string>(toISODateString(new Date()));

  // Derive school year - prefer manual selection, else auto-detect
  const schoolYear = useActiveSchoolYear(currentDate);

  const { data: rawStudents, isLoading: studentsLoading } = useStudents(schoolYear);
  // Holidays, school years and summer sessions: when school is in session.
  const { holidays, holidaysUI, calendar, projection } = useSchoolCalendar();
  const { mark, markMany } = useAttendanceMarking();

  const startOfWeek = useMemo(() => getStartOfWeek(new Date(currentDate + 'T12:00:00Z')), [currentDate]);
  const displayDays = useMemo(() => getWeekDays(startOfWeek), [startOfWeek]);
  const displayDates = useMemo(() => displayDays.map(toISODateString), [displayDays]);

  // Fetch attendance for the visible week
  const rangeStartStr = displayDates[0];
  const rangeEndStr = displayDates[displayDates.length - 1];

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
    return rawStudents.map(s => mapDBStudentToUI(s, holidaysUI, projection));
  }, [rawStudents, holidaysUI, projection]);

  // Use centralized filter hook
  const {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    gradeFilter, setGradeFilter,
    spedFilter, setSpedFilter,
    sortConfig,
    requestSort,
    filteredStudents: sortedAndFilteredStudents,
    gradeLevels
  } = useStudentFilter(studentsInYear, {
    status: (settings.weeklyFilters?.status as StudentStatus | 'All') || StudentStatus.Active,
    grade: settings.weeklyFilters?.grade,
    sped: settings.weeklyFilters?.sped
  });

  // Persist weekly filters
  useEffect(() => {
    saveSettings({
      weeklyFilters: {
        status: statusFilter,
        grade: gradeFilter,
        sped: spedFilter
      }
    });
  }, [statusFilter, gradeFilter, spedFilter, saveSettings]);

  const holidaySet = calendar.holidayDates;
  const holidayNamesByDate = useMemo(() => Object.fromEntries(holidays.map(h => [h.date, h.name])), [holidays]);
  const isHoliday = useCallback((date: string) => holidaySet.has(date), [holidaySet]);
  const todayStr = toISODateString(new Date());

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

  // "Select all" means the students on screen. It used to select every student
  // in the year, so students hidden by a filter were marked by the bulk action.
  const allVisibleSelected = sortedAndFilteredStudents.length > 0 &&
    sortedAndFilteredStudents.every(s => selectedStudentIds.has(s.id));

  const toggleAll = useCallback(() => {
    setSelectedStudentIds(allVisibleSelected ? new Set() : new Set(sortedAndFilteredStudents.map(s => s.id)));
  }, [allVisibleSelected, sortedAndFilteredStudents]);

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

  const handleMarkAttendance = useCallback((studentId: string, date: string, currentPresence: Presence | undefined, targetPresence: Presence) => {
    const student = studentsInYear.find(s => s.id === studentId);
    if (!student || !canRecordAttendance(student, date, todayStr, calendar)) return;
    mark(student, date, currentPresence, targetPresence);
  }, [studentsInYear, todayStr, calendar, mark]);

  // --- Bulk marking, always for today ---
  const todayIsSchoolDay = isSchoolDay(todayStr, calendar);
  const bulkDisabledReason = todayIsSchoolDay
    ? undefined
    : `Today is ${holidayNamesByDate[todayStr] ? `a holiday (${holidayNamesByDate[todayStr]})`
      : !isWeekend(todayStr) && !isInRegularTerm(todayStr, projection.schoolYears) ? 'summer break with no session running' : 'not a school day'}, so no attendance is due. Use the Daily view to record a makeup session.`;

  const handleBulkMark = useCallback((presence: Presence) => {
    if (!todayIsSchoolDay) return;
    const selected = studentsInYear.filter(s => selectedStudentIds.has(s.id));
    // Only students who can actually have attendance today: active, and
    // already started. The rest are left alone and reported.
    const eligible = selected.filter(s => canRecordAttendance(s, todayStr, todayStr, calendar));
    const ineligible = selected.length - eligible.length;

    if (eligible.length > 0) {
      markMany(eligible.map(s => ({ student: s, current: attendanceByStudent[s.id]?.[todayStr] })), todayStr, presence);
    }
    if (ineligible > 0) {
      // Shown alongside the confirmation so nobody assumes those were marked.
      toast.info(`${ineligible} selected ${ineligible === 1 ? 'student was' : 'students were'} not marked: not active, or not yet started on this date.`);
    }
    setSelectedStudentIds(new Set());
  }, [todayIsSchoolDay, studentsInYear, selectedStudentIds, todayStr, calendar, markMany, attendanceByStudent]);

  // --- Completeness for each day of the week ---
  const dayStatus = useMemo(() => displayDates.map(date => {
    if (date > todayStr) return null; // nothing is due yet
    const marked = new Set(attendanceRecords.filter(r => r.date === date).map(r => r.student_id));
    const result = getDayCompleteness(studentsInYear, date, marked, calendar, holidayNamesByDate);
    return result.isSchoolDay && result.expected > 0 ? result : null;
  }), [displayDates, todayStr, attendanceRecords, studentsInYear, calendar, holidayNamesByDate]);

  const unmarkedThisWeek = dayStatus.reduce((sum, d) => sum + (d?.unmarked ?? 0), 0);
  const incompleteDays = dayStatus.filter(d => d && d.unmarked > 0).length;

  // --- Keyboard entry over the grid ---
  const keyboardRows = useMemo(
    () => sortedAndFilteredStudents.filter(s => s.status === StudentStatus.Active),
    [sortedAndFilteredStudents]
  );

  const keyboard = useKeyboardEntry({
    rowCount: keyboardRows.length,
    colCount: displayDates.length,
    onMark: useCallback((row: number, col: number, presence: Presence) => {
      const student = keyboardRows[row];
      const date = displayDates[col];
      if (student && date) handleMarkAttendance(student.id, date, attendanceByStudent[student.id]?.[date], presence);
    }, [keyboardRows, displayDates, attendanceByStudent, handleMarkAttendance]),
    onClear: useCallback((row: number, col: number) => {
      const student = keyboardRows[row];
      const date = displayDates[col];
      const current = student && date ? attendanceByStudent[student.id]?.[date] : undefined;
      if (current) handleMarkAttendance(student.id, date, current, current);
    }, [keyboardRows, displayDates, attendanceByStudent, handleMarkAttendance])
  });

  const focusedStudent = keyboard.row === null ? undefined : keyboardRows[keyboard.row];
  const focusedDate = keyboard.col === null ? undefined : displayDates[keyboard.col];
  const focusedCellMarkable = !!(focusedStudent && focusedDate &&
    canRecordAttendance(focusedStudent, focusedDate, todayStr, calendar));

  // Start on today's column when it is in view.
  const startKeyboard = () => {
    const todayCol = displayDates.indexOf(todayStr);
    keyboard.start(0, todayCol >= 0 ? todayCol : 0);
  };

  useEffect(() => {
    if (!focusedStudent) return;
    document.querySelector(`[data-weekly-row="${focusedStudent.id}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedStudent]);

  const loading = studentsLoading || attendanceLoading;

  if (loading) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => changeWeek(-1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Prev Week</button>
          <input type="date" aria-label="Jump to week containing date" value={currentDate} onChange={handleDateJump} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
          <button onClick={() => changeWeek(1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Next Week</button>
          <button onClick={() => setCurrentDate(toISODateString(new Date()))} className="ml-2 px-3 py-2 text-brand hover:underline text-sm font-medium">This Week</button>
        </div>
        <button
          onClick={() => (keyboard.active ? keyboard.stop() : startKeyboard())}
          aria-pressed={keyboard.active}
          disabled={keyboardRows.length === 0}
          className={`px-4 py-2 font-semibold rounded-md shadow-sm transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${keyboard.active
            ? 'bg-brand text-white border-brand'
            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
        >
          {keyboard.active ? 'Exit keyboard entry' : 'Keyboard entry'}
        </button>
      </div>

      {keyboard.active && (
        <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-900 dark:text-sky-200 text-sm border border-sky-200 dark:border-sky-800">
          <span>
            {focusedStudent && focusedDate ? (
              <>
                <strong>{focusedStudent.firstName} {focusedStudent.lastName}</strong>, {formatDateForDisplay(focusedDate)}
                {!focusedCellMarkable && <span className="ml-1 italic">— no attendance due for this day</span>}
              </>
            ) : 'No student selected'}
          </span>
          <span className="flex items-center gap-3 flex-wrap text-xs">
            <span><Key>P</Key> present</span>
            <span><Key>A</Key> absent</span>
            <span><Key>T</Key> tardy</span>
            <span><Key>E</Key> excused</span>
            <span><Key>↑</Key><Key>↓</Key><Key>←</Key><Key>→</Key> move</span>
            <span><Key>Del</Key> clear</span>
            <span><Key>Esc</Key> exit</span>
          </span>
        </div>
      )}

      {/* Completeness for the week; a day left unmarked under-counts served days. */}
      <div aria-live="polite">
        {unmarkedThisWeek > 0 ? (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm border border-amber-200 dark:border-amber-800">
            <strong>{unmarkedThisWeek}</strong> student-{unmarkedThisWeek === 1 ? 'day is' : 'days are'} still unmarked across {incompleteDays} {incompleteDays === 1 ? 'day' : 'days'} this week. Days needing attention are flagged in the column headers.
          </div>
        ) : dayStatus.some(Boolean) ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 text-sm border border-emerald-200 dark:border-emerald-800">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span>Every school day so far this week is fully marked.</span>
          </div>
        ) : null}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex items-center gap-4 flex-wrap">
        <input
          type="search"
          aria-label="Search students by name or ID"
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
            onChange={(val) => setStatusFilter(val as StudentStatus | 'All')}
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
              {fixedColumns.map((col, index) => {
                const isSorted = sortConfig.key === col.id;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={col.id === 'select' ? undefined : isSorted ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => col.id !== 'select' && requestSort(col.id)}
                    className={`py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.isSticky ? `sticky z-20 bg-slate-50 dark:bg-slate-800 ${index === 0 ? 'left-0' : 'left-10'}` : ''} ${col.widthClass ? col.widthClass : ''} ${col.id !== 'select' ? 'cursor-pointer select-none' : ''}`}
                  >
                    {col.id === 'select' ? (
                      <input
                        type="checkbox"
                        aria-label="Select all students shown"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        className="rounded border-slate-300 text-brand focus:ring-brand"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {isSorted && (sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />)}
                      </span>
                    )}
                  </th>
                );
              })}
              {displayDays.map((day, i) => {
                const status = dayStatus[i];
                return (
                  <th key={day.toISOString()} scope="col" className="py-3 px-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    <span className="block font-normal text-slate-400">{formatDateForDisplay(day)}</span>
                    {status && (status.unmarked > 0 ? (
                      <Link
                        to={`/daily?date=${displayDates[i]}`}
                        className="mt-1 inline-block px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 normal-case font-semibold hover:underline"
                        title={`${status.unmarked} of ${status.expected} students unmarked — open this day`}
                      >
                        {status.unmarked} left
                      </Link>
                    ) : (
                      <span className="mt-1 inline-flex justify-center text-emerald-500" title="Everyone marked">
                        <CheckCircleIcon className="h-4 w-4" />
                      </span>
                    ))}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
            {sortedAndFilteredStudents.map(student => (
              <WeeklyStudentRow
                key={student.enrollmentId}
                student={student}
                displayDays={displayDays}
                attendanceMap={attendanceByStudent[student.id] || EMPTY_MAP}
                fixedColumns={fixedColumns}
                onMarkAttendance={handleMarkAttendance}
                isHoliday={isHoliday}
                calendar={calendar}
                todayStr={todayStr}
                isSelected={selectedStudentIds.has(student.id)}
                onToggleSelection={toggleSelection}
                focusedDayIndex={focusedStudent?.id === student.id ? keyboard.col : null}
              />
            ))}
          </tbody>
        </table>
        {sortedAndFilteredStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students match the current filter.</p>}
      </div>

      <BulkActionBar
        selectedCount={selectedStudentIds.size}
        dateLabel={formatDateForDisplay(todayStr)}
        disabledReason={bulkDisabledReason}
        onClearSelection={() => setSelectedStudentIds(new Set())}
        onMarkAll={handleBulkMark}
      />
    </div>
  );
};
