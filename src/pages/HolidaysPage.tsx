import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { formatDisplayDate } from '../utils/date';
import Button from '../components/ui/Button';
import XIcon from '../components/icons/XIcon';

const HolidaysPage: React.FC = () => {
  const { holidays, addHoliday, removeHoliday } = useAttendance();
  const [newDate, setNewDate] = useState('');
  const [err, setErr] = useState('');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return setErr('Pick a date.');
    if (holidays.includes(newDate)) return setErr('Already added.');
    addHoliday(newDate);
    setNewDate('');
    setErr('');
  };

  const inputCls =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600';
  const lblCls = 'block text-sm font-medium dark:text-gray-300';

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold dark:text-gray-100 mb-6">Manage Holidays</h1>

      {/* add form */}
      <form onSubmit={add} className="border rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold mb-2">Add a Holiday</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Holidays are skipped when projecting release dates.
        </p>
        <label className={lblCls}>
          Date
          <input
            type="date"
            value={newDate}
            onChange={e => {
              setNewDate(e.target.value);
              setErr('');
            }}
            className={inputCls}
          />
        </label>
        {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
        <div className="mt-4 text-right">
          <Button type="submit">Add Holiday</Button>
        </div>
      </form>

      {/* list */}
      <h2 className="text-lg font-semibold mb-4">Upcoming Holidays</h2>
      {holidays.length ? (
        <ul className="space-y-2">
          {holidays.map(d => (
            <li
              key={d}
              className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md"
            >
              <span className="font-medium">{formatDisplayDate(d)}</span>
              <Button
                variant="ghost"
                className="p-1"
                onClick={() => removeHoliday(d)}
              >
                <XIcon className="w-5 h-5 text-red-500 hover:text-red-700" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center py-4 text-gray-500 dark:text-gray-400">
          No holidays added.
        </p>
      )}
    </div>
  );
};

export default HolidaysPage;