import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStudents } from '../../hooks/useStudents';
import { useAttendance, useSaveAttendance, useDeleteAttendance, useHolidays, useSaveAttendanceComment } from '../../hooks/useAttendance';
import { useActiveSchoolYear } from '../../hooks/useActiveSchoolYear';
import { useSettings } from '../../hooks/useSettings';
import { StudentStatus, Presence } from '../../types';
import { toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { ExtendedStudent, mapDBStudentToUI, mapDBHolidaysToHolidays } from '../../services/mappers';
import { StatusBadge } from '../common/StatusBadge';
import { AttendanceButton } from '../common/AttendanceButton';
import { PageLoadingSkeleton } from '../common/SkeletonLoader';
import { DataTable, ColumnDef } from '../common/DataTable';
import { useStudentFilter } from '../../hooks/useStudentFilter';

type AttendanceFilterType = 'All' | 'Present' | 'Absent' | 'Tardy' | 'Excused' | 'Pending';

export const DailyView: React.FC = () => {
  const { settings } = useSettings();
  const [selectedDate, setSelectedDate] = useState(toISODateString(new Date()));

  const schoolYear = useActiveSchoolYear(selectedDate);

  const { data: rawStudents, isLoading: studentsLoading } = useStudents(schoolYear);
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendance(selectedDate);
  const { data: holidays = [] } = useHolidays();
  const { mutate: saveAttendance } = useSaveAttendance();
  const { mutate: deleteAttendance } = useDeleteAttendance();
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

  // State for editing comments
  const [editingComment, setEditingComment] = useState<{ studentId: string; value: string } | null>(null);

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

  const markAllPresent = () => {
    if (finalFilteredStudents.length === 0) return;
    if (!window.confirm(`Mark ${finalFilteredStudents.length} students as Present?`)) return;

    const records = finalFilteredStudents
      .filter(s => s.status === StudentStatus.Active)
      .map(s => ({
        id: crypto.randomUUID(),
        enrollment_id: s.enrollmentId!,
        student_id: s.id,
        date: selectedDate,
        presence: Presence.Present,
        comment: null
      }));

    if (records.length > 0) {
      saveAttendance(records);
    }
  };

  const handleMarkAttendance = (studentId: string, currentPresence: Presence | undefined, targetPresence: Presence) => {
    const newPresence = currentPresence === targetPresence ? null : targetPresence;
    if (newPresence === null) {
      deleteAttendance({ studentId, date: selectedDate });
    } else {
      saveAttendance([{
        id: crypto.randomUUID(),
        enrollment_id: studentsInYear.find(s => s.id === studentId)?.enrollmentId!,
        student_id: studentId,
        date: selectedDate,
        presence: newPresence,
        comment: null
      }]);
    }
  };

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
            onFocus={(e) => setEditingComment({ studentId: s.id, value: e.target.value })}
            onChange={(e) => setEditingComment({ studentId: s.id, value: e.target.value })}
            onBlur={(e) => {
              const newComment = e.target.value.trim();
              const oldComment = commentsByStudent[s.id] || '';
              if (newComment !== oldComment) {
                saveComment({ studentId: s.id, date: selectedDate, comment: newComment || null });
              }
              setEditingComment(null);
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
        <button onClick={markAllPresent} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-sm transition-colors">
          Mark All Present
        </button>
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
      />
    </div>
  );
};
