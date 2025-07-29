import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';
import {
  EnrichedStudent,
  StudentStatus,
} from '../types';
import { calculateWorkday, formatDate, formatDisplayDate } from '../utils/date';
import Button from '../components/ui/Button';
import PlusIcon from '../components/icons/PlusIcon';
import Modal from '../components/ui/Modal';
import StudentForm from '../components/StudentForm';

/* Chip colours by status */
const statusColor: Record<StudentStatus, string> = {
  [StudentStatus.Active]:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [StudentStatus.Completed]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [StudentStatus.Withdrawn]:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

type SortKey =
  | keyof EnrichedStudent
  | 'projectedRelease';

type ColumnKey = string;

const baseColumnDefs: Record<string, { label: string; sort?: SortKey }> = {
  studentId: { label: 'ID', sort: 'studentId' },
  lastName: { label: 'Last Name', sort: 'lastName' },
  firstName: { label: 'First Name', sort: 'firstName' },
  campus: { label: 'Campus', sort: 'campus' },
  gradeLevel: { label: 'Grade Level', sort: 'gradeLevel' },
  sped504: { label: 'SPED/504', sort: 'sped504' },
  drg: { label: 'DRG', sort: 'drg' },
  creditDays: { label: 'Credit Days', sort: 'creditDays' },
  status: { label: 'Status', sort: 'status' },
  registrationDate: { label: 'Registration', sort: 'registrationDate' },
  entryDate: { label: 'Entry Date', sort: 'entryDate' },
  daysAttended: { label: 'Days Attended', sort: 'daysAttended' },
  daysRemaining: { label: 'Days Remaining', sort: 'daysRemaining' },
  projectedRelease: { label: 'Projected Release', sort: 'projectedRelease' },
  comments: { label: 'Comments', sort: 'comments' },
};


/* -------------------------------------------------- */
/* Roster page                                        */
/* -------------------------------------------------- */
const RosterPage: React.FC = () => {
  const { enrichedStudents, holidays, students } = useAttendance();

  const customFieldKeys = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      Object.keys(s.customFields || {}).forEach(k => set.add(k));
    });
    return Array.from(set);
  }, [students]);

  const columnDefs = useMemo(() => {
    const defs: Record<string, { label: string; sort?: SortKey }> = {
      ...baseColumnDefs,
    };
    customFieldKeys.forEach(k => {
      defs[k] = { label: k };
    });
    return defs;
  }, [customFieldKeys]);

  const defaultCols = useMemo<ColumnKey[]>(
    () => [
      'lastName',
      'firstName',
      'status',
      'registrationDate',
      'entryDate',
      'daysAttended',
      'daysRemaining',
      'projectedRelease',
      'comments',
      ...customFieldKeys,
    ],
    [customFieldKeys]
  );

  const [search, setSearch] = useState('');
  const [isModal, setIsModal] = useState(false);
  const [projection, setProjection] = useState<'entry' | 'today'>('entry');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'lastName',
    dir: 'asc',
  });
  const [columns, setColumns] = useState<ColumnKey[]>(() => {
    try {
      const raw = localStorage.getItem('rosterColumns');
      return raw ? (JSON.parse(raw) as ColumnKey[]) : defaultCols;
    } catch {
      return defaultCols;
    }
  });
  const [showColModal, setShowColModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('rosterColumns', JSON.stringify(columns));
  }, [columns]);

  // Ensure columns include any newly added custom fields
  useEffect(() => {
    setColumns(prev => {
      const arr = [...prev];
      customFieldKeys.forEach(k => {
        if (!arr.includes(k)) arr.push(k);
      });
      return arr;
    });
  }, [customFieldKeys]);

  /* --- Search filter --- */
  const filtered = useMemo(
    () =>
      enrichedStudents.filter(
        s =>
          `${s.firstName} ${s.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          s.studentId.toLowerCase().includes(search.toLowerCase())
      ),
    [enrichedStudents, search]
  );

  /* --- Sorting --- */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const { key, dir } = sort;

      const aVal =
        key === 'projectedRelease'
          ? new Date(
              projection === 'entry'
                ? a.projectedReleaseDate
                : calculateWorkday(formatDate(new Date()), a.daysRemaining, holidays)
            )
          : (a as any)[key];

      const bVal =
        key === 'projectedRelease'
          ? new Date(
              projection === 'entry'
                ? b.projectedReleaseDate
                : calculateWorkday(formatDate(new Date()), b.daysRemaining, holidays)
            )
          : (b as any)[key];

      const cmp =
        aVal === undefined || aVal === null
          ? 1
          : bVal === undefined || bVal === null
          ? -1
          : aVal < bVal
          ? -1
          : aVal > bVal
          ? 1
          : 0;

      return dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort, projection, holidays]);

  const requestSort = (key: SortKey) =>
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));

  const sortIndicator = (key: SortKey) =>
    sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const thBase =
    'px-6 py-3 text-xs font-medium uppercase tracking-wider cursor-pointer select-none';
  const thLeft = `${thBase} text-left`;
  const thCenter = `${thBase} text-center`;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        {/* header */}
        <div className="flex flex-col sm:flex-row justify-between mb-4">
          <h1 className="text-2xl font-bold dark:text-gray-100">
            Student Roster
          </h1>

          <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <Button onClick={() => setIsModal(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Student
            </Button>
            <Button variant="secondary" onClick={() => setShowColModal(true)}>
              Columns
            </Button>
          </div>
        </div>

        {/* little info / toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Displaying {sorted.length} of {enrichedStudents.length} students.
          </span>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Projection&nbsp;Method:</span>
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
        </div>

        {/* main table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map(col => {
                  const def = columnDefs[col] || { label: col };
                  const cls =
                    col === 'daysAttended' || col === 'daysRemaining'
                      ? thCenter
                      : thLeft;
                  return (
                    <th
                      key={col}
                      className={cls}
                      onClick={() => def.sort && requestSort(def.sort)}
                    >
                      {def.label}
                      {def.sort ? sortIndicator(def.sort) : ''}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.map(stu => {
                const projected =
                  projection === 'entry'
                    ? stu.projectedReleaseDate
                    : calculateWorkday(
                        formatDate(new Date()),
                        stu.daysRemaining,
                        holidays
                      );

                return (
                  <tr
                    key={stu.studentId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    {columns.map(col => {
                      switch (col) {
                        case 'studentId':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {stu.studentId}
                            </td>
                          );
                        case 'lastName':
                          return (
                            <td key={col} className="px-6 py-4 whitespace-nowrap">
                              <Link
                                to={`/student/${stu.studentId}`}
                                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {stu.lastName}
                              </Link>
                            </td>
                          );
                        case 'firstName':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {stu.firstName}
                            </td>
                          );
                        case 'campus':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {stu.campus || '-'}
                            </td>
                          );
                        case 'gradeLevel':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {stu.gradeLevel || '-'}
                            </td>
                          );
                        case 'sped504':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {stu.sped504 || '-'}
                            </td>
                          );
                        case 'drg':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {stu.drg || '-'}
                            </td>
                          );
                        case 'creditDays':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {stu.creditDays ?? '-'}
                            </td>
                          );
                        case 'status':
                          return (
                            <td key={col} className="px-6 py-4">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor[stu.status]}`}>
                                {stu.status}
                              </span>
                            </td>
                          );
                        case 'registrationDate':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatDisplayDate(stu.registrationDate)}
                            </td>
                          );
                        case 'entryDate':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatDisplayDate(stu.entryDate)}
                            </td>
                          );
                        case 'daysAttended':
                          return (
                            <td key={col} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                              {stu.daysAttended} / {stu.daysAssigned}
                            </td>
                          );
                        case 'daysRemaining':
                          return (
                            <td key={col} className="px-6 py-4 text-center text-sm font-semibold">
                              {stu.daysRemaining}
                            </td>
                          );
                        case 'projectedRelease':
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatDisplayDate(projected)}
                            </td>
                          );
                        case 'comments':
                          return (
                            <td
                              key={col}
                              className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate"
                              title={stu.comments}
                            >
                              {stu.comments || '-'}
                            </td>
                          );
                        default:
                          return (
                            <td key={col} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {stu.customFields?.[col] || '-'}
                            </td>
                          );
                      }
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sorted.length === 0 && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              No students match your search.
            </div>
          )}
        </div>
      </div>

      {/* add-student modal */}
      <Modal
        isOpen={isModal}
        onClose={() => setIsModal(false)}
        title="Add New Student"
      >
        <StudentForm onClose={() => setIsModal(false)} />
      </Modal>

      {/* column config modal */}
      <Modal
        isOpen={showColModal}
        onClose={() => setShowColModal(false)}
        title="Customize Columns"
      >
        <div className="space-y-2">
          {columns.map((col, idx) => (
            <div key={col} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked
                onChange={() => setColumns(prev => prev.filter(c => c !== col))}
              />
              <span className="flex-1">{columnDefs[col].label}</span>
              <div className="flex gap-1">
                <button
                  disabled={idx === 0}
                  className="px-1 border rounded"
                  onClick={() =>
                    setColumns(prev => {
                      const arr = [...prev];
                      const [it] = arr.splice(idx, 1);
                      arr.splice(idx - 1, 0, it);
                      return arr;
                    })
                  }
                >
                  ↑
                </button>
                <button
                  disabled={idx === columns.length - 1}
                  className="px-1 border rounded"
                  onClick={() =>
                    setColumns(prev => {
                      const arr = [...prev];
                      const [it] = arr.splice(idx, 1);
                      arr.splice(idx + 1, 0, it);
                      return arr;
                    })
                  }
                >
                  ↓
                </button>
              </div>
            </div>
          ))}

          {Object.keys(columnDefs)
            .filter(k => !columns.includes(k as ColumnKey))
            .map(k => {
              const key = k as ColumnKey;
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => setColumns(prev => [...prev, key])}
                  />
                  <span>{columnDefs[key].label}</span>
                </div>
              );
            })}
        </div>
      </Modal>
    </>
  );
};

export default RosterPage;
