import React, { useMemo } from 'react';
import { Holiday, Presence } from '../../types';
import { getStartOfWeek, toISODateString, formatDateForDisplay } from '../../services/dateUtils';

// Accept any object with date and presence (works for both AttendanceRecord and DBAttendance)
interface AttendanceCalendarProps {
    attendanceRecords: Array<{ date: string; presence: string }>;
    holidays: Holiday[];
    entryDateStr: string;
    registrationDateStr: string;
}

const CalendarDay: React.FC<{
    day: Date;
    isCurrentMonth: boolean;
    presence?: Presence;
    isHoliday: boolean;
    isBeforeEntry: boolean;
    isFuture: boolean;
    isRegistrationDay: boolean;
}> = ({ day, isCurrentMonth, presence, isHoliday, isBeforeEntry, isFuture, isRegistrationDay }) => {
    if (!isCurrentMonth) {
        return <div className="w-full h-6 rounded-md bg-slate-50 dark:bg-slate-800/50 print:h-3 print:bg-transparent" />;
    }

    let colorClass = "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 print:bg-slate-100 print:text-black";
    let tooltipText = day.toLocaleDateString();

    if (isFuture) {
        colorClass = "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 print:text-gray-300 print:border print:border-gray-200";
        tooltipText += " (Future)";
    } else if (isBeforeEntry) {
        colorClass = "bg-slate-100 dark:bg-slate-800 print:bg-gray-50 print:text-gray-400";
        tooltipText += " (Before Entry)";
    } else if (isHoliday) {
        colorClass = "bg-yellow-400 text-yellow-800 print:bg-yellow-100 print:text-black";
        tooltipText += " (Holiday)";
    } else {
        switch (presence) {
            case Presence.Present:
                colorClass = "bg-emerald-500 text-white print:bg-emerald-100 print:text-black print:font-bold";
                tooltipText += ": Present";
                break;
            case Presence.Absent:
                colorClass = "bg-rose-500 text-white print:bg-rose-100 print:text-black print:font-bold";
                tooltipText += ": Absent";
                break;
            case Presence.Tardy:
                colorClass = "bg-amber-500 text-white print:bg-amber-100 print:text-black print:font-bold";
                tooltipText += ": Tardy";
                break;
            case Presence.Excused:
                colorClass = "bg-blue-500 text-white print:bg-blue-100 print:text-black print:font-bold";
                tooltipText += ": Excused";
                break;
            default:
                colorClass = "bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 print:bg-gray-200 print:text-black"; // Pending
                tooltipText += ": Pending";
        }
    }

    if (isRegistrationDay) {
        tooltipText += " (Registered)";
    }

    return (
        <div className="relative group">
            <div className={`w-full h-6 rounded-md flex items-center justify-center transition-colors duration-150 ${colorClass} print:h-3 print:rounded-sm`}>
                <span className="text-xs print:text-[7px]">{day.getDate()}</span>
            </div>
            {isRegistrationDay && <span className="absolute top-0 right-1 text-xs font-bold text-purple-600 dark:text-purple-400 print:text-[6px] print:top-[-2px] print:right-0" title={`Registered on ${formatDateForDisplay(day)}`}>R</span>}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 print:hidden">
                {tooltipText}
            </div>
        </div>
    );
};

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendanceRecords, holidays, entryDateStr, registrationDateStr }) => {

    const calendarData = useMemo(() => {
        // Records arrive with `presence` as a plain string (DB rows and UI
        // records share this shape); the stored values are Presence members.
        const attendanceMap = new Map<string, Presence>(
            attendanceRecords.map(r => [r.date, r.presence as Presence])
        );
        const holidaySet = new Set(holidays.map(h => h.date));

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = toISODateString(today);

        const startDate = new Date(entryDateStr + "T12:00:00Z");
        const calendarStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

        const monthsData: { name: string; days: Date[]; month: number }[] = [];
        let loopDate = new Date(calendarStartDate);

        while (loopDate <= today) {
            const currentMonth = loopDate.getMonth();
            const currentYear = loopDate.getFullYear();
            const monthName = loopDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

            const monthDays: Date[] = [];
            let currentCalDay = getStartOfWeek(firstDayOfMonth, 'sunday');

            while (true) {
                monthDays.push(new Date(currentCalDay));
                currentCalDay.setDate(currentCalDay.getDate() + 1);

                // Break after filling the last week of the month
                if (currentCalDay.getMonth() !== currentMonth && currentCalDay.getDay() === 0) {
                    break;
                }
                // Safety break for very long months
                if (monthDays.length > 42) break;
            }

            monthsData.push({ name: monthName, days: monthDays, month: currentMonth });

            loopDate.setMonth(loopDate.getMonth() + 1);
        }

        return { months: monthsData, attendanceMap, holidaySet, todayStr };
    }, [attendanceRecords, holidays, entryDateStr]);

    const { months, attendanceMap, holidaySet, todayStr } = calendarData;

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm print:shadow-none print:p-0 print:bg-transparent">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 print:text-lg print:mb-2 pointer-events-none">Attendance Calendar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-4 gap-x-6 gap-y-8 print:gap-x-2 print:gap-y-4">
                {months.map(({ name, days, month }) => (
                    <div key={name}>
                        <h4 className="text-base font-semibold text-center text-slate-700 dark:text-slate-200 mb-2 print:text-xs print:mb-1 print:text-black">{name}</h4>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 print:text-[8px] print:gap-0">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={index}>{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1 print:gap-[1px]">
                            {days.map((day, index) => {
                                const dateStr = toISODateString(day);
                                return (
                                    <CalendarDay
                                        key={index}
                                        day={day}
                                        isCurrentMonth={day.getMonth() === month}
                                        presence={attendanceMap.get(dateStr)}
                                        isHoliday={holidaySet.has(dateStr)}
                                        isBeforeEntry={dateStr < entryDateStr}
                                        isFuture={dateStr > todayStr}
                                        isRegistrationDay={dateStr === registrationDateStr}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 text-xs text-slate-500 dark:text-slate-400 print:text-[10px] print:mt-4">
                <span>Legend:</span>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500 print:w-2 print:h-2"></div> Present</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-500 print:w-2 print:h-2"></div> Tardy</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-500 print:w-2 print:h-2"></div> Excused</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-rose-500 print:w-2 print:h-2"></div> Absent</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-yellow-400 print:w-2 print:h-2"></div> Holiday</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600 print:w-2 print:h-2"></div> Pending</div>
                <div className="flex items-center gap-1"><span className="font-bold text-purple-600">R</span> Registration</div>
            </div>
        </div>
    );
};