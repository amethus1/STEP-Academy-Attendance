import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { ExtendedStudent } from '../../services/mappers';
import { Presence } from '../../types';
import { canRecordAttendance } from '../../services/attendanceCompleteness';
import { toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { AttendanceButton } from '../common/AttendanceButton';
import { StatusBadge } from '../common/StatusBadge';

interface WeeklyStudentRowProps {
    student: ExtendedStudent;
    displayDays: Date[];
    attendanceMap: Record<string, Presence>; // Map date -> presence for this student
    fixedColumns: { id: string; label: string; isSticky?: boolean; widthClass?: string }[];
    onMarkAttendance: (studentId: string, date: string, current: Presence | undefined, target: Presence) => void;
    isHoliday: (date: string) => boolean;
    holidayDates: Set<string>;
    todayStr: string;

    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
    /** Index into displayDays of the keyboard-focused cell in this row, if any. */
    focusedDayIndex?: number | null;
}

const getCellValue = (student: ExtendedStudent, columnId: string) => {
    switch (columnId) {
        case 'select':
            return null; // Handled in component
        case 'lastName':
            return <Link to={`/student/${student.id}`} className="hover:underline text-brand-dark dark:text-brand-light">{student.lastName}</Link>;
        case 'firstName':
            return student.firstName;
        case 'studentNumber':
            return student.studentNumber || student.id;
        case 'campus':
            return student.campus;
        case 'gradeLevel':
            return student.gradeLevel;
        case 'status':
            return <StatusBadge status={student.status} />;
        case 'daysRemaining':
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.daysRemaining > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{student.daysRemaining}</span>
        case 'projectedReleaseDate': {
            const dateVal = student.projectedReleaseDate;
            return dateVal && dateVal !== 'N/A' && dateVal !== 'Completed' ? formatDateForDisplay(dateVal as string) : dateVal;
        }
        default:
            return String((student as unknown as Record<string, unknown>)[columnId] ?? '');
    }
}

export const WeeklyStudentRow = memo(({ student, displayDays, attendanceMap, fixedColumns, onMarkAttendance, isHoliday, holidayDates, todayStr, isSelected, onToggleSelection, focusedDayIndex }: WeeklyStudentRowProps) => {
    return (
        <tr data-weekly-row={student.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
            {fixedColumns.map((col, index) => (
                <td key={col.id} className={`py-3 px-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 ${col.isSticky ? `sticky z-10 ${index === 0 ? 'left-0' : (index === 1 ? 'left-10' : 'left-40')}` : ''} ${col.widthClass ? col.widthClass : ''} ${isSelected ? '!bg-blue-50 dark:!bg-blue-900/30' : ''}`}>
                    {col.id === 'select' ? (
                        <input
                            type="checkbox"
                            aria-label={`Select ${student.firstName} ${student.lastName}`}
                            checked={!!isSelected}
                            onChange={() => onToggleSelection?.(student.id)}
                            className="rounded border-slate-300 text-brand focus:ring-brand"
                        />
                    ) : getCellValue(student, col.id)}
                </td>
            ))}
            {displayDays.map((day, dayIndex) => {
                const dateStr = toISODateString(day);
                const presence = attendanceMap[dateStr];

                const isDayHoliday = isHoliday(dateStr);
                const isDisabled = !canRecordAttendance(student, dateStr, todayStr, holidayDates);
                const isRegistrationDay = student.registrationDate === dateStr;
                const focusRing = focusedDayIndex === dayIndex ? 'ring-2 ring-inset ring-sky-400 bg-sky-50 dark:bg-sky-900/30' : '';

                if (isDayHoliday) {
                    return <td key={dateStr} className={`py-3 px-4 text-center bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 text-xs font-bold ${focusRing}`}>HOLIDAY</td>
                }

                return (
                    <td key={dateStr} className={`py-3 px-4 text-center relative ${focusRing}`}>
                        {isRegistrationDay && <span className="absolute top-1 right-1 text-xs font-bold text-purple-600 dark:text-purple-400" title={`Registered on ${formatDateForDisplay(dateStr)}`}>R</span>}
                        {isDisabled ? <div className="h-8 w-16" /> : (
                            <div className="flex justify-center items-center gap-2">
                                {presence === Presence.Tardy ? (
                                    <button
                                        onClick={() => onMarkAttendance(student.id, dateStr, presence, Presence.Present)}
                                        className="p-1 rounded-full bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                                        title="Tardy (Click to mark Present)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </button>
                                ) : presence === Presence.Excused ? (
                                    <button
                                        onClick={() => onMarkAttendance(student.id, dateStr, presence, Presence.Present)}
                                        className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                                        title="Excused (Click to mark Present)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </button>
                                ) : (
                                    <AttendanceButton
                                        currentPresence={presence}
                                        targetPresence={Presence.Present}
                                        onClick={() => onMarkAttendance(student.id, dateStr, presence, Presence.Present)}
                                    />
                                )}

                                <AttendanceButton
                                    currentPresence={presence}
                                    targetPresence={Presence.Absent}
                                    onClick={() => onMarkAttendance(student.id, dateStr, presence, Presence.Absent)}
                                />
                            </div>
                        )}
                    </td>
                )
            })}
        </tr>
    );
}, (prev, next) =>
    // Every prop that affects the output has to be compared here. Selection was
    // missing, so ticking a row's checkbox did not re-render it and React put
    // the controlled checkbox straight back.
    prev.student === next.student &&
    prev.attendanceMap === next.attendanceMap &&
    prev.todayStr === next.todayStr &&
    prev.displayDays === next.displayDays &&
    prev.isSelected === next.isSelected &&
    prev.focusedDayIndex === next.focusedDayIndex &&
    prev.holidayDates === next.holidayDates &&
    prev.isHoliday === next.isHoliday &&
    prev.onMarkAttendance === next.onMarkAttendance &&
    prev.onToggleSelection === next.onToggleSelection &&
    prev.fixedColumns === next.fixedColumns
);

WeeklyStudentRow.displayName = 'WeeklyStudentRow';
