import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';
import { Presence, StudentStatus, AttendanceRecord } from '../types';
import { getWeekDays, formatDate, formatDisplayDate, calculateWorkday } from '../utils/date';
import Modal from '../components/ui/Modal';
import StudentForm from '../components/StudentForm';
import Button from '../components/ui/Button';
import CheckIcon from '../components/icons/CheckIcon';
import XIcon from '../components/icons/XIcon';

/* one cell buttons reused from dashboard */
const AttendanceCell: React.FC<{
  day: Date;
  studentId: string;
  entryDate: string;
  registrationDate: string;
  logs: AttendanceRecord[];
}> = ({ day, studentId, entryDate, registrationDate, logs }) => {
  const { markAttendance } = useAttendance();
  const dateString = formatDate(day);

  const isBeforeEntry = new Date(entryDate) > day;
  const isRegistration = registrationDate === dateString;

  const logForDay = logs.find(l => l.attendanceDate === dateString);
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
      <div className="flex flex-col items-center justify-center space-y-1 text-gray-400">
        <span className="text-xs">{formatDisplayDate(day)}</span>
        {isRegistration && <span className="text-xs font-semibold">R</span>}
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center space-y-1">
      <span className="text-xs text-gray-500">{formatDisplayDate(day)}</span>
      {isRegistration && <span className="text-xs font-semibold mr-1">R</span>}
      <div className="flex items-center space-x-2">
        <button
          className={presentBtn}
          onClick={() => markAttendance(studentId, day, Presence.Present)}
          aria-pressed={isPresent}
        >
          <CheckIcon className="w-5 h-5" />
        </button>
        <button
          className={absentBtn}
          onClick={() => markAttendance(studentId, day, Presence.Absent)}
          aria-pressed={isAbsent}
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const statusChip: Record<StudentStatus, string> = {
  [StudentStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [StudentStatus.Completed]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [StudentStatus.Withdrawn]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const DetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { enrichedStudents, getStudentById, getAttendanceForStudent, holidays } =
    useAttendance();
  const [showEdit, setShowEdit] = useState(false);
  const [projection, setProjection] = useState<'entry' | 'today'>('entry');

  const student = studentId ? getStudentById(studentId) : undefined;
  const history = studentId ? getAttendanceForStudent(studentId) : [];

  const nextStudent = useMemo(() => {
    const idx = enrichedStudents.findIndex(s => s.studentId === studentId);
    if (idx === -1) return undefined;
    return enrichedStudents[(idx + 1) % enrichedStudents.length];
  }, [enrichedStudents, studentId]);

  const weeks = useMemo(() => {
    if (!student) return [] as Date[][];
    const logsEnd = history.length
      ? new Date(history[0].attendanceDate + 'T00:00:00')
      : new Date();
    const firstMonday = getWeekDays(new Date(student.entryDate))[0];
    const out: Date[][] = [];
    for (let d = new Date(firstMonday); d <= logsEnd; d.setDate(d.getDate() + 7)) {
      out.push(getWeekDays(new Date(d)));
    }
    return out;
  }, [student, history]);

  const projectedRelease = useMemo(() => {
    if (!student) return '';
    return projection === 'entry'
      ? student.projectedReleaseDate
      : calculateWorkday(
          formatDate(new Date()),
          student.daysRemaining,
          holidays
        );
  }, [student, projection, holidays]);

  if (!student)
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Student not found</h2>
        <Link to="/roster" className="text-blue-600 hover:underline dark:text-blue-400 mt-4 inline-block">
          Back to Roster
        </Link>
      </div>
    );

  return (
    <>
      <div className="space-y-6">
        {/* card 1: summary */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold dark:text-white">{student.firstName} {student.lastName}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{student.studentId}</p>
              <span className={`mt-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusChip[student.status]}`}>
                {student.status}
              </span>
            </div>
            <div className="space-x-2">
              <Button onClick={() => setShowEdit(true)}>Edit Student</Button>
              {nextStudent && (
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/student/${nextStudent.studentId}`)}
                >
                  Next →
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <span className="text-sm font-medium">Projection Method:</span>
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setProjection('entry')}
                className={`px-3 py-1 text-sm font-medium border rounded-l-lg ${
                  projection === 'entry'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
                }`}
              >
                From Entry Date
              </button>
              <button
                onClick={() => setProjection('today')}
                className={`px-3 py-1 text-sm font-medium border rounded-r-lg ${
                  projection === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
                }`}
              >
                From Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center border-t dark:border-gray-700 pt-6 mt-6">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Days Attended</p>
              <p className="text-2xl font-bold">{student.daysAttended}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Days Remaining</p>
              <p className="text-2xl font-bold">{student.daysRemaining}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Registration</p>
              <p className="text-lg font-semibold">{formatDisplayDate(student.registrationDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Entry Date</p>
              <p className="text-lg font-semibold">{formatDisplayDate(student.entryDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Projected Release</p>
              <p className="text-lg font-semibold">{formatDisplayDate(projectedRelease)}</p>
            </div>
          </div>

          {Object.entries(student.customFields || {}).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center border-t dark:border-gray-700 pt-6 mt-6">
              {Object.entries(student.customFields || {}).map(([k, v]) => (
                <div key={k}>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{k}</p>
                  <p className="text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
          )}

          {student.comments && (
            <div className="border-t dark:border-gray-700 pt-6 mt-6">
              <h3 className="text-lg font-medium dark:text-white">Comments</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {student.comments}
              </p>
            </div>
          )}
        </div>

        {/* card 2: weekly attendance */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Weekly Attendance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {weeks[0]?.map(d => (
                    <th key={d.toISOString()} className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 text-center">
                      {formatDisplayDate(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {weeks.map((w, i) => (
                  <tr key={i}>
                    {w.map(day => (
                      <td key={day.toISOString()} className="px-3 py-2 text-center">
                        <AttendanceCell
                          day={day}
                          studentId={student.studentId}
                          entryDate={student.entryDate}
                          registrationDate={student.registrationDate}
                          logs={history}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Student">
        <StudentForm studentToEdit={student} onClose={() => setShowEdit(false)} />
      </Modal>
    </>
  );
};

export default DetailPage;
