import React from 'react';
import { Student, AttendanceRecord, Holiday } from '../../types';
import { PrintOptions } from '../common/PrintOptionsModal';
import { formatDateForDisplay } from '../../services/dateUtils';
import { AttendanceCalendar } from '../common/AttendanceCalendar';
import { AttendanceList } from '../student/AttendanceList';

interface StudentProgressReportProps {
    student: Student;
    attendance: AttendanceRecord[];
    holidays: Holiday[];
    stats: {
        daysAttended: number;
        daysRemaining: number;
        projectedRelease: string;
        entryDate: string;
        creditDays: number;
    };
    options: PrintOptions | null;
    customFields: Array<{ id: string; name: string; value: string | number | boolean }>;
}

export const StudentProgressReport: React.FC<StudentProgressReportProps> = ({
    student,
    attendance,
    holidays,
    stats,
    options,
    customFields
}) => {
    if (!options) return null;

    return (
        <div className="hidden print:block print:w-full font-serif text-black leading-snug">
            {/* Report Header */}
            <div className="border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">Student Progress Report</h1>
                        <p className="text-sm text-gray-600 mt-1">STEP Academy Attendance System</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Stats Summary - 4 Column Grid */}
            {options.includeStats && (
                <section className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Status</p>
                            <p className="text-lg font-bold">{student.status}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Days Attended</p>
                            <p className="text-lg font-bold">{stats.daysAttended}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Days Remaining</p>
                            <p className="text-lg font-bold">{stats.daysRemaining}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Projected Release</p>
                            <p className="text-lg font-bold">{stats.projectedRelease}</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Student Details & Contact - Two Column Layout */}
            {(options.includeDetails || options.includeContact) && (
                <section className="grid grid-cols-2 gap-8 mb-8 break-inside-avoid">
                    {options.includeDetails && (
                        <div>
                            <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Academic Details</h3>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b border-gray-100"><td className="py-1 font-semibold text-gray-600">ID</td><td className="py-1 text-right">{student.studentNumber || student.id}</td></tr>
                                    <tr className="border-b border-gray-100"><td className="py-1 font-semibold text-gray-600">Grade Level</td><td className="py-1 text-right">{student.gradeLevel}</td></tr>
                                    <tr className="border-b border-gray-100"><td className="py-1 font-semibold text-gray-600">Entry Date</td><td className="py-1 text-right">{stats.entryDate}</td></tr>
                                    <tr className="border-b border-gray-100"><td className="py-1 font-semibold text-gray-600">Gender</td><td className="py-1 text-right">{student.gender}</td></tr>
                                    <tr className="border-b border-gray-100"><td className="py-1 font-semibold text-gray-600">Date of Birth</td><td className="py-1 text-right">{student.dob ? formatDateForDisplay(student.dob) : 'N/A'}</td></tr>
                                    {customFields.map(field => (
                                        <tr key={field.id} className="border-b border-gray-100">
                                            <td className="py-1 font-semibold text-gray-600">{field.name}</td>
                                            <td className="py-1 text-right">{String(field.value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {options.includeContact && (
                        <div>
                            <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Contact Information</h3>
                            <table className="w-full text-sm">
                                <tbody>
                                    {student.guardianName && (
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1 font-semibold text-gray-600">Guardian</td>
                                            <td className="py-1 text-right">{student.guardianName}</td>
                                        </tr>
                                    )}
                                    {student.guardianPhone && (
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1 font-semibold text-gray-600">Phone</td>
                                            <td className="py-1 text-right">{student.guardianPhone}</td>
                                        </tr>
                                    )}
                                    {student.guardianEmail && (
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1 font-semibold text-gray-600">Email</td>
                                            <td className="py-1 text-right break-all">{student.guardianEmail}</td>
                                        </tr>
                                    )}
                                    {student.emergencyContactName && (
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1 font-semibold text-gray-600">Emergency</td>
                                            <td className="py-1 text-right">{student.emergencyContactName}</td>
                                        </tr>
                                    )}
                                    {student.emergencyContactPhone && (
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1 font-semibold text-gray-600">Emerg. Phone</td>
                                            <td className="py-1 text-right">{student.emergencyContactPhone}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* Attendance Calendar */}
            {options.includeCalendar && (
                <section className="mb-8">
                    <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Attendance Overview</h3>
                    <AttendanceCalendar
                        attendanceRecords={attendance}
                        holidays={holidays}
                        entryDateStr={stats.entryDate}
                        registrationDateStr={student.registrationDate}
                    />
                </section>
            )}

            {/* Comments */}
            {options.includeComments && student.comments && (
                <section className="mb-8 break-inside-avoid">
                    <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Comments</h3>
                    <div className="p-4 bg-gray-50 rounded text-sm text-gray-800 whitespace-pre-wrap">
                        {student.comments}
                    </div>
                </section>
            )}

            {/* Attendance Log */}
            {options.includeAttendanceLog && (
                <section className="mb-8">
                    <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Attendance Log</h3>
                    <AttendanceList attendance={attendance} printColumns={options.attendanceLogColumns} variant="report" />
                </section>
            )}

            {/* Footer */}
            <div className="fixed bottom-0 w-full text-center text-xs text-gray-400 border-t border-gray-200 pt-2 pb-4">
                STEP Academy Attendance System • Printed on {new Date().toLocaleString()}
            </div>
        </div>
    );
};
