import React, { useMemo } from 'react';
import { AttendanceRecord, Holiday, Presence } from '../../types';
import { getStartOfWeek, toISODateString, formatDateForDisplay } from '../../services/dateUtils';

interface AttendanceCalendarProps {
    attendanceRecords: AttendanceRecord[];
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
        return <div className="w-full h-6 rounded-md bg-slate-50 dark:bg-slate-800/50" />;
    }

    let colorClass = "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
    let tooltipText = day.toLocaleDateString();

    if (isFuture) {
        colorClass = "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500";
        tooltipText += " (Future)";
    } else if (isBeforeEntry) {
        colorClass = "bg-slate-100 dark:bg-slate-800";
        tooltipText += " (Before Entry)";
    } else if (isHoliday) {
        colorClass = "bg-yellow-400 text-yellow-800";
        tooltipText += " (Holiday)";
    } else {
        switch (presence) {
            case Presence.Present:
                colorClass = "bg-emerald-500 text-white";
                tooltipText += ": Present";
                break;
            case Presence.Absent:
                colorClass = "bg-rose-500 text-white";
                tooltipText += ": Absent";
                break;
            default:
                colorClass = "bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200"; // Pending
                tooltipText += ": Pending";
        }
    }
    
    if (isRegistrationDay) {
        tooltipText += " (Registered)";
    }

    return (
        <div className="relative group">
            <div className={`w-full h-6 rounded-md flex items-center justify-center transition-colors duration-150 ${colorClass}`}>
                <span className="text-xs">{day.getDate()}</span>
            </div>
            {isRegistrationDay && <span className="absolute top-0 right-1 text-xs font-bold text-purple-600 dark:text-purple-400" title={`Registered on ${formatDateForDisplay(day)}`}>R</span>}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {tooltipText}
            </div>
        </div>
    );
};

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendanceRecords, holidays, entryDateStr, registrationDateStr }) => {

    const calendarData = useMemo(() => {
        const attendanceMap = new Map(attendanceRecords.map(r => [r.date, r.presence]));
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
                if(monthDays.length > 42) break;
            }
            
            monthsData.push({ name: monthName, days: monthDays, month: currentMonth });
            
            loopDate.setMonth(loopDate.getMonth() + 1);
        }

        return { months: monthsData, attendanceMap, holidaySet, todayStr };
    }, [attendanceRecords, holidays, entryDateStr]);

    const { months, attendanceMap, holidaySet, todayStr } = calendarData;

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance Calendar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-x-6 gap-y-8">
                {months.map(({ name, days, month }) => (
                    <div key={name}>
                        <h4 className="text-base font-semibold text-center text-slate-700 dark:text-slate-200 mb-2">{name}</h4>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 text-xs text-slate-500 dark:text-slate-400">
                <span>Legend:</span>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500"></div> Present</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-rose-500"></div> Absent</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-yellow-400"></div> Holiday</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600"></div> Pending</div>
                 <div className="flex items-center gap-1"><span className="font-bold text-purple-600">R</span> Registration</div>
            </div>
        </div>
    );
};