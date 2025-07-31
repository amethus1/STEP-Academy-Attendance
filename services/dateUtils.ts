import { Student, AttendanceRecord, Holiday, Presence } from '../types';
import { getSettings } from './settingsService';

export const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateForDisplay = (date: Date | string): string => {
    const { dateFormat } = getSettings();
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00Z') : new Date(date);
    
    // Ensure we are working with UTC dates to prevent timezone-off-by-one errors
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');

    switch (dateFormat) {
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
        default:
            return `${month}/${day}/${year}`;
    }
};

export const getDaysAttended = (studentId: string, attendance: AttendanceRecord[]): number => {
  return attendance.filter(a => a.studentId === studentId && a.presence === Presence.Present).length;
};

export const calculateProjectedReleaseDate = (
  student: Student,
  attendance: AttendanceRecord[],
  holidays: Holiday[],
  projectionStartDateStr: string,
): string => {
  if (student.status !== 'Active') {
    return 'N/A';
  }

  const daysAttended = getDaysAttended(student.id, attendance);
  const creditDays = student.creditDays || 0;
  const daysRemaining = student.daysAssigned - daysAttended - creditDays;

  if (daysRemaining <= 0) {
    return 'Completed';
  }

  let projectedDate = new Date(projectionStartDateStr + 'T12:00:00Z'); // Use UTC to avoid timezone issues
  let daysAdded = 0;
  const holidayDates = new Set(holidays.map(h => h.date));
  
  while (daysAdded < daysRemaining) {
    projectedDate.setDate(projectedDate.getDate() + 1);
    const dayOfWeek = projectedDate.getUTCDay();
    const dateStr = toISODateString(projectedDate);

    // Skip weekends and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
      daysAdded++;
    }
  }

  return toISODateString(projectedDate);
};


export const getWeekDays = (startDate: Date): Date[] => {
  const days = [];
  for (let i = 0; i < 5; i++) {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + i);
    days.push(newDate);
  }
  return days;
};

export const getStartOfWeek = (date: Date, weekStartDay: 'sunday' | 'monday' = 'monday'): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  let diff;
  if (weekStartDay === 'monday') {
    // if day is Sunday (0), we want to go back 6 days to Monday. Otherwise, go back (day - 1) days.
    diff = d.getDate() - day + (day === 0 ? -6 : 1);
  } else { // Sunday start
    diff = d.getDate() - day;
  }
  return new Date(d.setDate(diff));
};
