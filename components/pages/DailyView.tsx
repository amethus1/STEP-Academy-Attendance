import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStudents } from '../../hooks/useStudents';
import { useAttendance, useAttendanceRange, useHolidays, useSaveAttendanceComment } from '../../hooks/useAttendance';
import { useAttendanceMarking } from '../../hooks/useAttendanceMarking';
import { useKeyboardEntry } from '../../hooks/useKeyboardEntry';
import { useActiveSchoolYear } from '../../hooks/useActiveSchoolYear';
import { StudentStatus, Presence } from '../../types';
import { toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { ExtendedStudent, mapDBStudentToUI, mapDBHolidaysToHolidays } from '../../services/mappers';
import { getDayCompleteness, findMissedSchoolDays } from '../../services/attendanceCompleteness';
import { CheckCircleIcon, CalendarDaysIcon, ExclamationTriangleIcon } from '../icons/Icons';
import { StatusBadge } from '../common/StatusBadge';
import { AttendanceButton } from '../common/AttendanceButton';
import { PageLoadingSkeleton } from '../common/SkeletonLoader';
import { DataTable, ColumnDef } from '../common/DataTable';
import { useStudentFilter } from '../../hooks/useStudentFilter';

type AttendanceFilterType = 'All' | 'Present' | 'Absent' | 'Tardy' | 'Excused' | 'Pending';

/** A keycap, for the keyboard-entry hint bar. */
const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-1.5 py-0.5 rounded border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-800 font-sans font-semibold">
    {children}
  </kbd>
);

export const DailyView: React.FC = () => {
  const [searchParams] = useSearchParams();
  // Other views link here with ?date=YYYY-MM-DD to open a specific day.
  const [selectedDate, setSelectedDate] = useState(() => {
    const requested = searchParams.get('date');
    return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : toISODateString(new Date());
  });
  const todayStr = toISODateString(new Date());

  const schoolYear = useActiveSchoolYear(selectedDate);

  const { data: rawStudents, isLoading: studentsLoading } = useStudents(schoolYear);
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendance(selectedDate);
  const { data: holidays = [] } = useHolidays();
  const { mutate: saveComment } = useSaveAttendanceComment();

  // Convert holidays to UI format once
  const holidaysUI = useMemo(() => mapDBHolidaysToHolidays(holidays), [holidays]);

  // Build memoized lookups
  const attendanceByStudent = useMemo(() => {
    const map: Record<string, Presence> = {};
    for (const record of attendanceRecords) {
      map[record.student_id] = record.presence as Presence;
    }
    return map;
  }, [attendanceRecords]);

  const commentsByStudent = useMemo(() => {
    const map: Record<string, string> = {};
    for (const record of attendanceRecords) {
      if (record.comment) {
        map[record.student_id] = record.comment;
      }
    }
    return map;
  }, [attendanceRecords]);

  // Transform students
  const studentsInYear = useMemo(() => {
    if (!rawStudents) return [];
    return rawStudents.map(s => mapDBStudentToUI(s, holidaysUI));
  }, [rawStudents, holidaysUI]);

  // --- Is this day finished, and did we skip one? ---
  const MISSED_DAY_LOOKBACK = 14;

  const lookbackStart = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00Z');
    d.setDate(d.getDate() - MISSED_DAY_LOOKBACK);
    return toISODateString(d);
  }, [selectedDate]);

  const { data: recentAttendance = [] } = useAttendanceRange(lookbackStart, selectedDate);

  const holidayDates = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const holidayNamesByDate = useMemo(
    () => Object.fromEntries(holidays.map(h => [h.date, h.name])),
    [holidays]
  );

  const dayCompleteness = useMemo(
    () => getDayCompleteness(
      studentsInYear,
      selectedDate,
      new Set(Object.keys(attendanceByStudent)),
      holidayDates,
      holidayNamesByDate
    ),
    [studentsInYear, selectedDate, attendanceByStudent, holidayDates, holidayNamesByDate]
  );

  const missedDays = useMemo(
    () => findMissedSchoolDays(
      studentsInYear,
      new Set(recentAttendance.map(r => r.date)),
      holidayDates,
      selectedDate,
      MISSED_DAY_LOOKBACK
    ),
    [studentsInYear, recentAttendance, holidayDates, selectedDate]
  );


  // Additional Filter State for Attendance
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilterType>('All');

  // Use Filter Hook
  const {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    gradeFilter, setGradeFilter,
    spedFilter, setSpedFilter,
    sortConfig, setSortConfig,
    filteredStudents: baseFilteredStudents,
    gradeLevels
  } = useStudentFilter(studentsInYear);

  // Apply extra filters (Date eligibility + Attendance Status) that are specific to DailyView
  const finalFilteredStudents = useMemo(() => {
    return baseFilteredStudents.filter(s => {
      // Date Eligibility
      const eligibleOnDate = s.entryDate <= selectedDate;
      const exitedBefore = s.exitDate && s.exitDate < selectedDate;
      if (!eligibleOnDate || exitedBefore) return false;

      // Attendance Status Filter
      const presence = attendanceByStudent[s.id];
      switch (attendanceFilter) {
        case 'Present': return presence === Presence.Present;
        case 'Absent': return presence === Presence.Absent;
        case 'Tardy': return presence === Presence.Tardy;
        case 'Excused': return presence === Presence.Excused;
        case 'Pending': return s.status === StudentStatus.Active && !presence;
        case 'All': default: return true;
      }
    });
  }, [baseFilteredStudents, selectedDate, attendanceFilter, attendanceByStudent]);


  const changeDay = (amount: number) => {
    setSelectedDate(prev => {
      const newDate = new Date(prev + "T12:00:00Z");
      newDate.setDate(newDate.getDate() + amount);
      return toISODateString(newDate);
    });
  };

  const jumpToToday = () => {
    setSelectedDate(toISODateString(new Date()));
  };

  const { mark, markMany } = useAttendanceMarking();

  // No attendance is due on weekends and holidays, and a stray mark there
  // still counts toward days attended, moving the student's release date. The
  // controls are locked on those days, with an explicit unlock for programs
  // that hold a makeup session.
  const [unlockedDate, setUnlockedDate] = useState<string | null>(null);
  // Future dates too: a Present recorded ahead of time counts as attended
  // before the student has actually come in.
  const isFutureDate = selectedDate > todayStr;
  const noAttendanceDue = !dayCompleteness.isSchoolDay || isFutureDate;
  const markingLocked = noAttendanceDue && unlockedDate !== selectedDate;

  const markAllPresent = () => {
    if (markingLocked) return;
    const active = finalFilteredStudents.filter(s => s.status === StudentStatus.Active);
    if (active.length === 0) return;

    const overwritten = active.filter(s => {
      const current = attendanceByStudent[s.id];
      return current !== undefined && current !== Presence.Present;
    }).length;

    // Only interrupt when this would overwrite marks already made; filling in
    // blanks is the common case and Undo covers a mistake either way.
    if (overwritten > 0 && !window.confirm(
      `${overwritten} ${overwritten === 1 ? 'student is' : 'students are'} already marked with another status. Overwrite and mark all ${active.length} Present?`
    )) return;

    markMany(active.map(s => ({ student: s, current: attendanceByStudent[s.id] })), selectedDate, Presence.Present);
  };

  const handleMarkAttendance = useCallback((studentId: string, currentPresence: Presence | undefined, targetPresence: Presence) => {
    if (markingLocked) return;
    const student = studentsInYear.find(s => s.id === studentId);
    if (!student) return;
    mark(student, selectedDate, currentPresence, targetPresence);
  }, [markingLocked, studentsInYear, selectedDate, mark]);

  // --- Keyboard entry ---
  const markableStudents = useMemo(
    () => finalFilteredStudents.filter(s => s.status === StudentStatus.Active),
    [finalFilteredStudents]
  );

  const keyboard = useKeyboardEntry({
    rowCount: markableStudents.length,
    onMark: useCallback((row: number, _col: number, presence: Presence) => {
      const student = markableStudents[row];
      if (student) handleMarkAttendance(student.id, attendanceByStudent[student.id], presence);
    }, [markableStudents, attendanceByStudent, handleMarkAttendance]),
    onClear: useCallback((row: number) => {
      const student = markableStudents[row];
      const current = student && attendanceByStudent[student.id];
      if (current) handleMarkAttendance(student.id, current, current);
    }, [markableStudents, attendanceByStudent, handleMarkAttendance])
  });
  const keyboardActive = keyboard.active;
  const focusedStudent = keyboard.row === null ? undefined : markableStudents[keyboard.row];

  // Keep the focused row on screen as the selection moves.
  useEffect(() => {
    if (!focusedStudent) return;
    document
      .querySelector(`[data-row-key="${focusedStudent.id}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [focusedStudent]);

  // Defining Columns
  const columns: ColumnDef<ExtendedStudent>[] = [
    {
      id: 'lastName',
      label: 'Last Name',
      sortable: true,
      render: (s) => <Link to={`/student/${s.id}`} className="hover:underline text-brand-dark dark:text-brand-light">{s.lastName}</Link>
    },
    { id: 'firstName', label: 'First Name', sortable: true },
    { id: 'studentNumber', label: 'ID', sortable: true, render: (s) => s.studentNumber || s.id },
    { id: 'campus', label: 'Campus', sortable: true },
    { id: 'gradeLevel', label: 'Grade', sortable: true },
    { id: 'status', label: 'Status', sortable: true, render: (s) => <StatusBadge status={s.status} /> },
    {
      id: 'daysRemaining',
      label: 'Days Left',
      sortable: true,
      render: (s) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.daysRemaining > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {s.daysRemaining}
        </span>
      )
    },
    {
      id: 'projectedReleaseDate',
      label: 'Release Date',
      sortable: true,
      render: (s) => {
        const val = s.projectedReleaseDate;
        return val && val !== 'N/A' && val !== 'Completed' ? formatDateForDisplay(val) : val;
      }
    },
    {
      id: 'attendance',
      label: 'Attendance',
      align: 'center',
      render: (s) => {
        const currentPresence = attendanceByStudent[s.id];
        const isDisabled = s.status !== StudentStatus.Active;
        if (isDisabled) return <span className="text-sm text-slate-400 dark:text-slate-500">N/A</span>;

        return (
          <div className="flex justify-center items-center gap-2">
            {[Presence.Present, Presence.Tardy, Presence.Excused, Presence.Absent].map(p => (
              <AttendanceButton
                key={p}
                currentPresence={currentPresence}
                targetPresence={p}
                disabled={markingLocked}
                onClick={() => handleMarkAttendance(s.id, currentPresence, p)}
              />
            ))}
          </div>
        );
      }
    },
    {
      id: 'notes',
      label: 'Notes',
      width: 'w-64',
      render: (s) => {
        const currentPresence = attendanceByStudent[s.id];
        const isDisabled = s.status !== StudentStatus.Active;
        if (isDisabled || !currentPresence) return <span className="text-sm text-slate-400 dark:text-slate-500 italic">—</span>;

        return (
          <input
            type="text"
            placeholder="Add note..."
            defaultValue={commentsByStudent[s.id] || ''}
            onBlur={(e) => {
              const newComment = e.target.value.trim();
              const oldComment = commentsByStudent[s.id] || '';
              if (newComment !== oldComment) {
                saveComment({ studentId: s.id, date: selectedDate, comment: newComment || null });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        );
      }
    }
  ];

  const loading = studentsLoading || attendanceLoading;

  if (loading) return <PageLoadingSkeleton />;

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
          <button onClick={jumpToToday} className="ml-2 px-3 py-2 text-brand hover:underline text-sm font-medium">Jump to Today</button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (keyboardActive ? keyboard.stop() : keyboard.start())}
            aria-pressed={keyboardActive}
            disabled={markableStudents.length === 0 || markingLocked}
            className={`px-4 py-2 font-semibold rounded-md shadow-sm transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${keyboardActive
              ? 'bg-brand text-white border-brand'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
              }`}
          >
            {keyboardActive ? 'Exit keyboard entry' : 'Keyboard entry'}
          </button>
          <button onClick={markAllPresent} disabled={markingLocked} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Mark All Present
          </button>
        </div>
      </div>

      {keyboardActive && (
        <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-900 dark:text-sky-200 text-sm border border-sky-200 dark:border-sky-800">
          <span>
            {focusedStudent
              ? <>Marking <strong>{focusedStudent.firstName} {focusedStudent.lastName}</strong></>
              : 'No student selected'}
          </span>
          <span className="flex items-center gap-3 flex-wrap text-xs">
            <span><Key>P</Key> present</span>
            <span><Key>A</Key> absent</span>
            <span><Key>T</Key> tardy</span>
            <span><Key>E</Key> excused</span>
            <span><Key>↑</Key><Key>↓</Key> move</span>
            <span><Key>Del</Key> clear</span>
            <span><Key>Esc</Key> exit</span>
          </span>
        </div>
      )}

      {/* Completeness: a silently unmarked day under-counts served days. */}
      <div aria-live="polite" className="space-y-3">
        {noAttendanceDue ? (
          <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm">
            <span className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 flex-shrink-0" />
              <span>
                No attendance expected — {dayCompleteness.holidayName
                  || (!dayCompleteness.isSchoolDay ? 'this date is not a school day' : 'this date is in the future')}.
                {markingLocked
                  ? ' Marking is locked so a stray click does not count as a day attended.'
                  : ' Marking is unlocked for this date; anything recorded counts toward days attended.'}
              </span>
            </span>
            {markingLocked ? (
              <button
                onClick={() => setUnlockedDate(selectedDate)}
                className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                Record attendance anyway
              </button>
            ) : (
              <button
                onClick={() => { setUnlockedDate(null); keyboard.stop(); }}
                className="px-3 py-1.5 rounded-md font-semibold hover:underline"
              >
                Lock again
              </button>
            )}
          </div>
        ) : dayCompleteness.expected === 0 ? null : dayCompleteness.unmarked === 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 text-sm border border-emerald-200 dark:border-emerald-800">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span>All {dayCompleteness.expected} students marked for this day.</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm border border-amber-200 dark:border-amber-800">
            <span className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <span>
                <strong>{dayCompleteness.unmarked}</strong> of {dayCompleteness.expected} students still unmarked.
              </span>
            </span>
            <button
              onClick={() => setAttendanceFilter('Pending')}
              className="px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-800/60 font-semibold hover:bg-amber-200 dark:hover:bg-amber-800"
            >
              Show unmarked
            </button>
          </div>
        )}

        {missedDays.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 text-sm border border-rose-200 dark:border-rose-800">
            <span className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <span>
                {missedDays.length === 1
                  ? 'One earlier school day has no attendance recorded:'
                  : `${missedDays.length} earlier school days have no attendance recorded:`}
              </span>
            </span>
            <div className="flex flex-wrap gap-2 pl-7">
              {missedDays.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className="px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-800/60 font-medium hover:bg-rose-200 dark:hover:bg-rose-800"
                >
                  {formatDateForDisplay(date)}
                </button>
              ))}
            </div>
          </div>
        )}
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
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StudentStatus | 'All')} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
            <option value="All">All</option>
            <option value={StudentStatus.Active}>Active</option>
            <option value={StudentStatus.Completed}>Completed</option>
            <option value={StudentStatus.Withdrawn}>Withdrawn</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Attendance:</label>
          <select value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value as AttendanceFilterType)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
            <option value="All">All</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Tardy">Tardy</option>
            <option value="Excused">Excused</option>
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
            <option value="All">All</option>
            <option value="None">None</option>
            <option value="SPED">SPED</option>
            <option value="504">504</option>
          </select>
        </div>
      </div>

      <DataTable
        data={finalFilteredStudents}
        columns={columns}
        keyExtractor={(s) => s.id}
        sortConfig={sortConfig}
        onSort={(key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))}
        emptyMessage="No students match the current filter."
        rowClassName={(s) => s.id === focusedStudent?.id ? 'bg-sky-100 dark:bg-sky-900/40 ring-2 ring-inset ring-sky-400' : ''}
      />
    </div>
  );
};
