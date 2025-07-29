import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';
import { getWeekDays, formatDate, formatDisplayDate } from '../utils/date';
import { EnrichedStudent, AttendanceRecord, Presence, StudentStatus } from '../types';
import Button from '../components/ui/Button';
import CheckIcon from '../components/icons/CheckIcon';
import XIcon from '../components/icons/XIcon';

/* -------------------------------------------------- */
/* Helper component – one cell with ✓ / ✗ buttons     */
/* -------------------------------------------------- */
const AttendanceCell: React.FC<{
  student: EnrichedStudent;
  day: Date;
  attendanceLogs: AttendanceRecord[];
}> = ({ student, day, attendanceLogs }) => {
  const { markAttendance } = useAttendance();
  const dateString = formatDate(day);

  const isBeforeEntry = new Date(student.entryDate) > day;
  const isRegistration = student.registrationDate === dateString;

  const logForDay = attendanceLogs.find(
    log => log.attendanceDate === dateString
  );
  const isPresent = logForDay?.presence === Presence.Present;
  const isAbsent = logForDay?.presence === Presence.Absent;

  const presentBtn =
    `transition-all duration-150 p-1 rounded-full ` +
    (isPresent
      ? 'bg-green-500 text-white shadow-lg scale-110'
      : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-800/50');

  const absentBtn =
    `transition-all duration-150 p-1 rounded-full ` +
    (isAbsent
      ? 'bg-red-500 text-white shadow-lg scale-110'
      : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-800/50');

  if (isBeforeEntry)
    return (
      <div className="text-center">
        {isRegistration && <span className="text-xs font-semibold">R</span>}
      </div>
    );

  return (
    <div className="flex items-center justify-center space-x-2">
      {isRegistration && <span className="text-xs font-semibold mr-1">R</span>}
      <button
        className={presentBtn}
        onClick={() => markAttendance(student.studentId, day, Presence.Present)}
        aria-label={`Mark ${student.firstName} ${student.lastName} present for ${dateString}`}
        aria-pressed={isPresent}
      >
        <CheckIcon className="w-5 h-5" />
      </button>
      <button
        className={absentBtn}
        onClick={() => markAttendance(student.studentId, day, Presence.Absent)}
        aria-label={`Mark ${student.firstName} ${student.lastName} absent for ${dateString}`}
        aria-pressed={isAbsent}
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

/* -------------------------------------------------- */
/* Weekly Dashboard page                              */
/* -------------------------------------------------- */
const DashboardPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'active'>('active');

  const { enrichedStudents, getAttendanceForStudent, attendanceLog } =
    useAttendance();
  const [sortBy, setSortBy] = useState<'studentId' | 'lastName' | 'firstName'>(
    'lastName'
  );

  /* Generate Monday-Friday dates for the chosen week */
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekEnd = weekDays[weekDays.length - 1];

  /* Build the student list according to the filter the user picked */
  const studentsToDisplay = useMemo(() => {
    // filter and sort

    let pool: EnrichedStudent[];
    switch (filter) {
      case 'all':
        pool = enrichedStudents;
        break;
      case 'active':
        pool = enrichedStudents.filter(s => s.status === StudentStatus.Active);
        break;
      default:
        pool = enrichedStudents;
    }

    return pool
      .filter(stu => new Date(stu.entryDate) <= weekEnd)
      .map(stu => ({
        student: stu,
        logs: getAttendanceForStudent(stu.studentId),
      }))
      .sort((a, b) => {
        switch (sortBy) {
          case 'studentId':
            return a.student.studentId.localeCompare(b.student.studentId);
          case 'firstName':
            return a.student.firstName.localeCompare(b.student.firstName);
          default:
            return a.student.lastName.localeCompare(b.student.lastName);
        }
      });
  }, [filter, enrichedStudents, attendanceLog, getAttendanceForStudent, weekEnd, sortBy]);

  /* Helper to jump weeks */
  const changeWeek = (offset: number) =>
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + offset * 7);
      return d;
    });

  const filterBtn = (type: typeof filter) =>
    `text-xs px-3 py-1.5 ${filter === type ? '' : 'font-normal'}`;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">
            Weekly Attendance
          </h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              className={filterBtn('all')}
              variant={filter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilter('all')}
            >
              All Students
            </Button>
          <Button
            className={filterBtn('active')}
            variant={filter === 'active' ? 'primary' : 'secondary'}
            onClick={() => setFilter('active')}
          >
            Active
          </Button>
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

        <div className="flex gap-2 flex-shrink-0 items-center">
          <Button variant="secondary" onClick={() => changeWeek(-1)}>
            Prev Week
          </Button>
          <input
            type="date"
            value={formatDate(currentDate)}
            onChange={e => setCurrentDate(new Date(e.target.value + 'T00:00:00'))}
            className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
          <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="secondary" onClick={() => changeWeek(1)}>
            Next Week
          </Button>
        </div>
      </div>

      {/* table */}
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
              <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Days&nbsp;Left
              </th>
              {weekDays.map(day => (
                <th
                  key={day.toISOString()}
                  className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                >
                  {formatDisplayDate(day)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {studentsToDisplay.map(({ student, logs }) => (
              <tr
                key={student.studentId}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {student.studentId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/student/${student.studentId}`}
                    className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {student.lastName}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {student.firstName}
                </td>
                <td className="px-3 py-4 text-center font-semibold">
                  {student.daysRemaining}
                </td>
                {weekDays.map(day => (
                  <td
                    key={day.toISOString()}
                    className="px-3 py-4 whitespace-nowrap"
                  >
                    <AttendanceCell
                      student={student}
                      day={day}
                      attendanceLogs={logs}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {studentsToDisplay.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No students match the current filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;