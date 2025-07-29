/**
 * Add work-days (Mon-Fri) to a start date, skipping holidays.
 */
export const calculateWorkday = (
  startDate: string,
  workdays: number,
  holidays: string[] = []
): string => {
  if (workdays <= 0) return startDate;

  const holidaySet = new Set(holidays);
  const d = new Date(startDate + 'T00:00:00');
  let counted = 0;

  while (counted < workdays) {
    d.setDate(d.getDate() + 1);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const dStr = formatDate(d);
    if (!isWeekend && !holidaySet.has(dStr)) counted++;
  }
  return formatDate(d);
};

/** Monday-Friday dates for the week containing the given date */
export const getWeekDays = (date: Date): Date[] => {
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay(); // adjust to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

/** ISO → YYYY-MM-DD */
export const formatDate = (d: Date): string => d.toISOString().split('T')[0];

/** ISO / Date → MM-DD-YYYY for display */
export const formatDisplayDate = (d: Date | string): string => {
  const dateObj = new Date(typeof d === 'string' ? d + 'T00:00:00' : d);
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${dateObj.getFullYear()}`;
};