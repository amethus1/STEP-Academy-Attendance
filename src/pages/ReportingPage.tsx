import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
/// <reference path="../types/electron-api.d.ts" />

const ReportingPage: React.FC = () => {
  const { enrichedStudents, attendanceLog } = useAttendance();

  /** Last 5 days, newest → oldest, then reversed for left-to-right */
  const makeBarData = (sid: string) => {
    const logs = attendanceLog
      .filter(l => l.studentId === sid)
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))
      .slice(0, 5)
      .reverse();

    return logs.map(l => ({
      label: l.attendanceDate.slice(5),          // "MM-DD"
      value: l.presence === 'Present' ? 1 : 0
    }));
  };

  const generatePdf = async (sid: string) => {
    const s = enrichedStudents.find(x => x.studentId === sid);
    if (!s) return;

    const res = await window.electron.savePdf({
      studentName: `${s.firstName} ${s.lastName}`,
      daysPresent: s.daysAttended,
      daysAbsent:  s.daysAssigned - s.daysAttended,
      comments:    s.comments ?? '',
      barData:     makeBarData(sid)
    });

    if (res.success) alert(`PDF saved to:\n${res.path}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Weekly Student Summaries</h1>
      <ul className="space-y-2">
        {enrichedStudents.map(s => (
          <li key={s.studentId}
              className="flex justify-between items-center bg-white rounded shadow p-3">
            <span>{s.firstName} {s.lastName}</span>
            <button
              onClick={() => generatePdf(s.studentId)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded">
              PDF
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReportingPage;