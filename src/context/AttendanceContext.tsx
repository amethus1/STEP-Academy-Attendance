import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';

import {
  Student,
  AttendanceRecord,
  Presence,
  EnrichedStudent,
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE_LOG,
  INITIAL_HOLIDAYS,
} from '../constants';
import { calculateWorkday, formatDate } from '../utils/date';

interface AttendanceContextType {
  enrichedStudents: EnrichedStudent[];
  getStudentById: (id: string) => EnrichedStudent | undefined;
  getAttendanceForStudent: (id: string) => AttendanceRecord[];
  addStudent: (student: Student) => void;
  updateStudent: (studentIdToUpdate: string, student: Student) => void;
  markAttendance: (studentId: string, date: Date, presence: Presence) => void;
  holidays: string[];
  addHoliday: (date: string) => void;
  removeHoliday: (date: string) => void;
  attendanceLog: AttendanceRecord[];
  students: Student[];
  importData: (data: {
    students: Student[];
    attendanceLog: AttendanceRecord[];
    holidays: string[];
  }) => boolean;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined
);

/* ---------- helpers ---------- */
function getInitial<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ---------- provider ---------- */
export const AttendanceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [students, setStudents] = useState<Student[]>(() =>
    getInitial('students', INITIAL_STUDENTS)
  );
  const [attendanceLog, setAttendanceLog] = useState<AttendanceRecord[]>(() =>
    getInitial('attendanceLog', INITIAL_ATTENDANCE_LOG)
  );
  const [holidays, setHolidays] = useState<string[]>(() =>
    getInitial('holidays', INITIAL_HOLIDAYS)
  );

  /* persist to localStorage */
  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);
  useEffect(() => {
    localStorage.setItem('attendanceLog', JSON.stringify(attendanceLog));
  }, [attendanceLog]);
  useEffect(() => {
    localStorage.setItem('holidays', JSON.stringify(holidays));
  }, [holidays]);

  /* enriched student objects */
  const enrichedStudents = useMemo<EnrichedStudent[]>(() => {
    const stats = new Map<string, { present: number; absent: number }>();

    attendanceLog.forEach(log => {
      if (!stats.has(log.studentId))
        stats.set(log.studentId, { present: 0, absent: 0 });

      const rec = stats.get(log.studentId)!;
      log.presence === Presence.Present ? rec.present++ : rec.absent++;
    });

    return students.map(s => {
      const { present = 0, absent = 0 } = stats.get(s.studentId) || {};
      const credit = s.creditDays || 0;
      const requiredDays = Math.max(0, s.daysAssigned - credit);
      const projectedWork = requiredDays + absent;

      return {
        ...s,
        daysAttended: present,
        daysRemaining: Math.max(0, requiredDays - present),
        projectedReleaseDate: calculateWorkday(
          s.entryDate,
          projectedWork,
          holidays
        ),
      };
    });
  }, [students, attendanceLog, holidays]);

  /* CRUD helpers */
  const addStudent = (newStu: Student) => {
    if (students.some(s => s.studentId === newStu.studentId)) return;
    setStudents(prev => [...prev, newStu]);
  };

  const updateStudent = (idToUpdate: string, updated: Student) => {
    setStudents(prev =>
      prev.map(s => (s.studentId === idToUpdate ? updated : s))
    );
    if (idToUpdate !== updated.studentId) {
      setAttendanceLog(prev =>
        prev.map(l =>
          l.studentId === idToUpdate ? { ...l, studentId: updated.studentId } : l
        )
      );
    }
  };

  const markAttendance = (
    studentId: string,
    date: Date,
    presence: Presence
  ) => {
    const dateStr = formatDate(date);

    setAttendanceLog(prev => {
      const idx = prev.findIndex(
        l => l.studentId === studentId && l.attendanceDate === dateStr
      );

      if (idx > -1) {
        const log = prev[idx];
        // toggle off if clicking same value
        if (log.presence === presence) return prev.filter((_, i) => i !== idx);
        // otherwise update
        const copy = [...prev];
        copy[idx] = { ...log, presence };
        return copy;
      }
      // add new
      return [
        ...prev,
        {
          logId: `LOG-${studentId}-${dateStr}-${Date.now()}`,
          studentId,
          attendanceDate: dateStr,
          presence,
        },
      ];
    });
  };

  /* misc helpers */
  const getStudentById = (id: string) =>
    enrichedStudents.find(s => s.studentId === id);

  const getAttendanceForStudent = (id: string) =>
    attendanceLog
      .filter(l => l.studentId === id)
      .sort(
        (a, b) =>
          new Date(b.attendanceDate).getTime() -
          new Date(a.attendanceDate).getTime()
      );

  const addHoliday = (d: string) =>
    setHolidays(prev =>
      prev.includes(d) ? prev : [...prev, d].sort((a, b) => a.localeCompare(b))
    );
  const removeHoliday = (d: string) =>
    setHolidays(prev => prev.filter(h => h !== d));

  const importData = (data: {
    students: Student[];
    attendanceLog: AttendanceRecord[];
    holidays: string[];
  }) => {
    if (
      Array.isArray(data.students) &&
      Array.isArray(data.attendanceLog) &&
      Array.isArray(data.holidays) &&
      window.confirm(
        'Import will overwrite ALL existing data. Continue?'
      )
    ) {
      const toStr = (d: string | Date) =>
        d instanceof Date ? formatDate(d) : /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : formatDate(new Date(d));

      const parsedStudents = data.students.map(s => ({
        ...s,
        daysAssigned: Number((s as any).daysAssigned) || 0,
        creditDays: Number((s as any).creditDays) || 0,
        entryDate: toStr((s as any).entryDate),
        registrationDate: toStr((s as any).registrationDate),
      }));

      const parsedLogs = data.attendanceLog.map(l => ({
        ...l,
        attendanceDate: toStr((l as any).attendanceDate),
      }));

      const parsedHolidays = data.holidays.map(h => toStr(h));

      setStudents(parsedStudents);
      setAttendanceLog(parsedLogs);
      setHolidays(parsedHolidays);
      // wipe any old column preferences so RosterPage falls back to defaults
      localStorage.removeItem('rosterColumns');
      return true;
    }
    return false;
  };

  /* context value */
  const value: AttendanceContextType = {
    enrichedStudents,
    getStudentById,
    getAttendanceForStudent,
    addStudent,
    updateStudent,
    markAttendance,
    holidays,
    addHoliday,
    removeHoliday,
    attendanceLog,
    students,
    importData,
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};

/* ---------- hook ---------- */
export const useAttendance = (): AttendanceContextType => {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be inside Provider');
  return ctx;
};