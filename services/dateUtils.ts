// Imports removed as they are no longer needed
import { getSettingsSync } from './settingsService';

export const toISODateString = (date: Date): string => {
  // Use local date components to avoid UTC conversion shifting dates
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateForDisplay = (date: Date | string): string => {
  if (!date) return '';
  const { dateFormat } = getSettingsSync();
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00Z') : new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) {
    return typeof date === 'string' ? date : '';
  }

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

export const addBusinessDays = (startDate: Date, daysToAdd: number, holidayDates: Set<string>): Date => {
  const currentDate = new Date(startDate);
  // Ensure we are working with noon UTC to safely add days without DST shifts affecting the date part
  currentDate.setUTCHours(12, 0, 0, 0);

  let daysAdded = 0;

  // Safety break to prevent infinite loops
  const maxIterations = daysToAdd * 5 + 365; // Generous buffer
  let iterations = 0;

  while (daysAdded < daysToAdd && iterations < maxIterations) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getUTCDay();
    const dateStr = toISODateString(currentDate);

    // Skip weekends (0=Sun, 6=Sat) and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
      daysAdded++;
    }
    iterations++;
  }

  return currentDate;
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

export const getDateRange = (startDate: string, endDate: string): string[] => {
  const start = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  const dates: string[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    dates.push(toISODateString(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
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

export interface SimpleSchoolYear {
  name: string;
  startDate: string;
  endDate: string;
}

export const getSchoolYearFromDate = (date: Date, definedYears?: SimpleSchoolYear[]): string => {
  const dateStr = toISODateString(date);

  // If we have defined years, check if date falls in any of them
  if (definedYears && definedYears.length > 0) {
    const matchedYear = definedYears.find(year => {
      return dateStr >= year.startDate && dateStr <= year.endDate;
    });
    if (matchedYear) return matchedYear.name;

    // If no match found but we have years, we might want to default to the closest or just legacy?
    // Let's fallback to legacy logic for dates outside range (like pre-historic data)
  }

  // Legacy logic: Cutoff is ~July/August. 
  // Should we use settings? We can't use hook here easily but we can access settingsService.
  // The current logic assumes Aug 1 start roughly (month >= 7 is August index 7 ?? No, month 0=Jan, 6=July, 7=Aug)
  // Date.getMonth(): 0-11. 
  // If month 7 (August) or later, it's the start of a year. e.g. Aug 2024 -> 2024-2025.
  // If month 6 (July) or earlier, it's the end of a year. e.g. July 2024 -> 2023-2024.
  const year = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-${year + 1}`;
};
