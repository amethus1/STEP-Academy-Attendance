import React from 'react';
import { formatDateForDisplay } from '../../services/dateUtils';
import { DBAttendance } from '../../db/types';
import { Presence } from '../../types';

// Update Props interface
interface AttendanceListProps {
    attendance: DBAttendance[];
    printColumns?: 1 | 2;
    variant?: 'default' | 'report';
}

export const AttendanceList: React.FC<AttendanceListProps> = ({ attendance, printColumns = 1, variant = 'default' }) => {
    // Sort by date DESC
    const sortedattendance = [...attendance].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const getPresenceBadge = (presence: string) => {
        // ... (keep logic, but simpler print styles if needed)
        switch (presence) {
            case 'Present':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 print:bg-emerald-100 print:text-emerald-800 font-bold">P</span>;
            case 'Absent':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 print:bg-rose-100 print:text-rose-800 font-bold">A</span>;
            case 'Tardy':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 print:bg-amber-100 print:text-amber-800 font-bold">T</span>;
            case 'Excused':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 print:bg-blue-100 print:text-blue-800 font-bold">E</span>;
            default:
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{presence[0]}</span>;
        }
    };

    const getFullPresenceBadge = (presence: string) => {
        switch (presence) {
            case 'Present':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Present</span>;
            case 'Absent':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Absent</span>;
            case 'Tardy':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Tardy</span>;
            case 'Excused':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Excused</span>;
            default:
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{presence}</span>;
        }
    };

    if (sortedattendance.length === 0) {
        if (variant === 'report') return <p className="text-xs italic text-slate-500">No attendance records.</p>;
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance History</h3>
                <p className="text-slate-500 dark:text-slate-400 italic">No attendance records found for this period.</p>
            </div>
        );
    }

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
        if (variant === 'report') return <div className="w-full">{children}</div>;
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance History</h3>
                {children}
            </div>
        );
    };

    // For dual-column print: split attendance into two halves
    const midpoint = Math.ceil(sortedattendance.length / 2);
    const leftColumn = sortedattendance.slice(0, midpoint);
    const rightColumn = sortedattendance.slice(midpoint);

    return (
        <Wrapper>
            {/* Screen view / Single Column Report: single table */}
            {printColumns === 1 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">Date</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 rounded-tr-lg">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {sortedattendance.map((record) => (
                                <tr key={record.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                        {formatDateForDisplay(record.date)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getFullPresenceBadge(record.presence)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                                        {record.comment || <span className="text-slate-300 dark:text-slate-600 italic">-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Dual column compact table */}
            {printColumns === 2 && (
                <div className="grid grid-cols-2 gap-4">
                    {/* Left Column */}
                    <table className="text-xs w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="px-2 py-1 text-left border">Date</th>
                                <th className="px-2 py-1 text-center border w-8">S</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leftColumn.map((record) => (
                                <tr key={record.date}>
                                    <td className="px-2 py-0.5 border text-xs">{formatDateForDisplay(record.date)}</td>
                                    <td className="px-2 py-0.5 border text-center">{getPresenceBadge(record.presence)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Right Column */}
                    <table className="text-xs w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="px-2 py-1 text-left border">Date</th>
                                <th className="px-2 py-1 text-center border w-8">S</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rightColumn.map((record) => (
                                <tr key={record.date}>
                                    <td className="px-2 py-0.5 border text-xs">{formatDateForDisplay(record.date)}</td>
                                    <td className="px-2 py-0.5 border text-center">{getPresenceBadge(record.presence)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Wrapper>
    );
};
