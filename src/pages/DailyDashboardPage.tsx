import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';
import { formatDate } from '../utils/date';
import {
  EnrichedStudent,
  Presence,
  StudentStatus,
  AttendanceRecord,
} from '../types';
import Button from '../components/ui/Button';
import CheckIcon from '../components/icons/CheckIcon';
import XIcon from '../components/icons/XIcon';

/* one-cell action buttons */
const DailyAction: React.FC<{
  student: EnrichedStudent;
  date: string;
  logs: AttendanceRecord[];
}> = ({ student, date, logs }) => {
  const { markAttendance } = useAttendance();
  const dateObj = new Date(date + 'T00:00:00');

  const log = logs.find(l => l.studentId === student.studentId);
  const isPresent = log?.presence === Presence.Present;
  const isAbsent = log?.presence === Presence.Absent;

  const btn = (active: boolean, c: string) =>
    `transition p-1 rounded-full ${
      active
        ? `bg-${c}-500 text-white shadow-lg scale-110`
        : `text-${c}-600 hover:bg-${c}-100 dark:hover:bg-${c}-800/50`
    }`;

  if (student.status !== StudentStatus.Active)
    return <span className="text-xs italic text-gray-400">Inactive</span>;

  return (
    <div className="flex items-center justify-center space-x-2">
      <button
        className={btn(isPresent, 'green')}
        onClick={() => markAttendance(student.studentId, dateObj, Presence.Present)}
        aria-label="Mark present"
      >
        <CheckIcon className="w-5 h-5" />
      </button>
      <button
        className={btn(isAbsent, 'red')}
        onClick={() => markAttendance(student.studentId, dateObj, Presence.Absent)}
        aria-label="Mark absent"
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

const statusChip: Record<StudentStatus, string> = {
  [StudentStatus.Active]:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [StudentStatus.Completed]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [StudentStatus.Withdrawn]:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const DailyDashboardPage: React.FC = () => {
  const [date, setDate] = useState(formatDate(new Date()));
  const [filter, setFilter] = useState<'all' | 'active' | 'present' | 'absent' | 'pending'>(
    'active'
  );
  const [sortBy, setSortBy] = useState<'studentId' | 'lastName' | 'firstName'>(
    'lastName'
  );

  const changeDay = (offset: number) =>
    setDate(prev => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + offset);
      return formatDate(d);
    });

  const { enrichedStudents, attendanceLog } = useAttendance();

  const students = useMemo(() => {
    const logsForDay = attendanceLog.filter(l => l.attendanceDate === date);
    const presentIDs = new Set(
      logsForDay.filter(l => l.presence === Presence.Present).map(l => l.studentId)
    );
    const absentIDs = new Set(
      logsForDay.filter(l => l.presence === Presence.Absent).map(l => l.studentId)
    );
    const attendedIDs = new Set(logsForDay.map(l => l.studentId));

    let pool: EnrichedStudent[] = [];
    switch (filter) {
      case 'all':
        pool = enrichedStudents;
        break;
      case 'active':
        pool = enrichedStudents.filter(s => s.status === StudentStatus.Active);
        break;
      case 'present':
        pool = enrichedStudents.filter(
          s => presentIDs.has(s.studentId) && s.status === StudentStatus.Active
        );
        break;
      case 'absent':
        pool = enrichedStudents.filter(
          s => absentIDs.has(s.studentId) && s.status === StudentStatus.Active
        );
        break;
      case 'pending':
        pool = enrichedStudents.filter(
          s =>
            !attendedIDs.has(s.studentId) && s.status === StudentStatus.Active
        );
        break;
    }
    return pool
      .filter(s => new Date(s.entryDate) <= new Date(date + 'T00:00:00'))
      .sort((a, b) => {
        switch (sortBy) {
          case 'studentId':
            return a.studentId.localeCompare(b.studentId);
          case 'firstName':
            return a.firstName.localeCompare(b.firstName);
          default:
            return a.lastName.localeCompare(b.lastName);
        }
      });
  }, [filter, date, enrichedStudents, attendanceLog, sortBy]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">Daily Attendance</h1>
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" onClick={() => changeDay(-1)}>
              Prev Day
            </Button>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-2 border rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <Button variant="secondary" onClick={() => setDate(formatDate(new Date()))}>
              Today
            </Button>
            <Button variant="secondary" onClick={() => changeDay(1)}>
              Next Day
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {(['all', 'active', 'present', 'absent', 'pending'] as const).map(t => (
            <Button
              key={t}
              variant={filter === t ? 'primary' : 'secondary'}
              className={`text-xs ${filter === t ? '' : 'font-normal'}`}
              onClick={() => setFilter(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
          <select
            value={sortBy}
            onChange={e =>
              setSortBy(
                e.target.value as 'studentId' | 'firstName' | 'lastName'
              )
            }
            className="ml-2 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="lastName">Sort by Last</option>
            <option value="firstName">Sort by First</option>
            <option value="studentId">Sort by ID</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Student&nbsp;ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Last&nbsp;Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                First&nbsp;Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Attendance
              </th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {students.map(stu => (
              <tr key={stu.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {stu.studentId}
                </td>
                <td className="px-6 py-4">
                  <Link to={`/student/${stu.studentId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {stu.lastName}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {stu.firstName}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${statusChip[stu.status]}`}>
                    {stu.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <DailyAction student={stu} date={date} logs={attendanceLog.filter(l => l.attendanceDate === date)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">No students match the current filter.</div>
        )}
      </div>
    </div>
  );
};

export default DailyDashboardPage;