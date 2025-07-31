import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { TrashIcon } from '../icons/Icons';

export const HolidaysPage: React.FC = () => {
  const { holidays, addHoliday, removeHoliday, loading } = useAppData();
  const [newHolidayDate, setNewHolidayDate] = useState(toISODateString(new Date()));
  const [newHolidayName, setNewHolidayName] = useState('');
  const [error, setError] = useState('');

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim()) {
      setError('Holiday name is required.');
      return;
    }
    if (holidays.some(h => h.date === newHolidayDate)) {
      setError('This date is already a holiday.');
      return;
    }
    setError('');
    addHoliday({ date: newHolidayDate, name: newHolidayName });
    setNewHolidayName('');
  };

  if (loading) return <div className="text-center p-8">Loading holiday data...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Add Holiday</h3>
          <form onSubmit={handleAddHoliday} className="space-y-4">
            <div>
              <label htmlFor="holiday-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Holiday Name</label>
              <input 
                id="holiday-name"
                type="text"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                placeholder="e.g., Winter Break"
              />
            </div>
            <div>
              <label htmlFor="holiday-date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Date</label>
              <input 
                id="holiday-date"
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm">
              Add Holiday
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Holiday List</h3>
          <div className="max-h-[60vh] overflow-y-auto">
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {holidays.length > 0 ? holidays.map(holiday => (
                <li key={holiday.date} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{holiday.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateForDisplay(holiday.date)}</p>
                  </div>
                  <button onClick={() => removeHoliday(holiday.date)} className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/50 transition-colors">
                    <TrashIcon />
                  </button>
                </li>
              )) : <p className="text-slate-500 dark:text-slate-400">No holidays have been added yet.</p>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};