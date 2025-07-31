import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Theme, DateFormat } from '../../types';
import { SunIcon, MoonIcon } from '../icons/Icons';

const SettingsCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & {label: string}> = ({ label, children, ...props}) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <select {...props} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
            {children}
        </select>
    </div>
);

export const SettingsPage: React.FC = () => {
  const { settings, saveSettings } = useSettings();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <SettingsCard title="Appearance" description="Customize the look and feel of the application.">
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</label>
                <div className="flex gap-2">
                    {(['light', 'dark', 'system'] as Theme[]).map(theme => (
                        <button 
                            key={theme}
                            onClick={() => saveSettings({ theme })}
                            className={`flex-1 p-3 rounded-lg border-2 font-semibold capitalize transition-colors ${settings.theme === theme ? 'border-brand bg-brand-light dark:bg-brand-dark/30' : 'border-transparent bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            {theme}
                        </button>
                    ))}
                </div>
            </div>
        </SettingsCard>
        
        <SettingsCard title="Preferences" description="Control application behavior to match your workflow.">
            <Select 
                label="Default View"
                id="default-view"
                value={settings.defaultRoute}
                onChange={e => saveSettings({ defaultRoute: e.target.value })}
            >
                <option value="/attendance">Weekly View</option>
                <option value="/daily">Daily View</option>
                <option value="/roster">Student Roster</option>
                <option value="/reports">Reporting</option>
                <option value="/holidays">Holidays</option>
            </Select>
            <Select
                label="Date Format"
                id="date-format"
                value={settings.dateFormat}
                onChange={e => saveSettings({ dateFormat: e.target.value as DateFormat })}
            >
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 12/25/2024)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 25/12/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2024-12-25)</option>
            </Select>

            <div className="flex items-center justify-between pt-2">
                <label htmlFor="confirmations-toggle" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Show confirmation dialogs
                    <p className="text-xs text-slate-500 dark:text-slate-400">e.g., "Are you sure?" prompts before importing data.</p>
                </label>
                <button
                    id="confirmations-toggle"
                    type="button"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${settings.showConfirmations ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-600'}`}
                    role="switch"
                    aria-checked={settings.showConfirmations}
                    onClick={() => saveSettings({ showConfirmations: !settings.showConfirmations })}
                >
                    <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.showConfirmations ? 'translate-x-5' : 'translate-x-0'}`}
                    ></span>
                </button>
            </div>
        </SettingsCard>

        <SettingsCard title="Calendar & School Year" description="Define your school year and calendar display preferences.">
            <div>
                <label htmlFor="school-year-start" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">School Year Start Date</label>
                <input
                    id="school-year-start"
                    type="date"
                    value={settings.schoolYearStartDate}
                    onChange={e => saveSettings({ schoolYearStartDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                />
            </div>
            <div>
                <label htmlFor="school-year-end" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">School Year End Date</label>
                <input
                    id="school-year-end"
                    type="date"
                    value={settings.schoolYearEndDate}
                    onChange={e => saveSettings({ schoolYearEndDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                />
            </div>
        </SettingsCard>
    </div>
  );
};