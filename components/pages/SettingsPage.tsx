import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { Theme, DateFormat } from '../../types';
import { SunIcon, MoonIcon, AcademicCapIcon, FolderIcon } from '../icons/Icons';
import { ImportWizard } from '../common/ImportWizard';
import { useLogAction } from '../../hooks/useAuditLogs';

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

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <select {...props} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
            {children}
        </select>
    </div>
);

export const SettingsPage: React.FC = () => {
    const { settings, saveSettings } = useSettings();
    const { data: schoolYears = [], isLoading: schoolYearsLoading } = useSchoolYears();
    const [showImportWizard, setShowImportWizard] = React.useState(false);
    const logAction = useLogAction();

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <ImportWizard
                isOpen={showImportWizard}
                onClose={() => setShowImportWizard(false)}
                onSuccess={() => {
                    setShowImportWizard(false);
                    // Optional: refresh data signal?
                }}
            />
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
                    <option value="/">Dashboard</option>
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

            <SettingsCard title="School Year" description="Select the active school year and manage year definitions.">
                <Select
                    label="Active School Year"
                    id="active-school-year"
                    value={settings.activeSchoolYear || ''}
                    onChange={e => saveSettings({ activeSchoolYear: e.target.value })}
                    disabled={schoolYearsLoading}
                >
                    <option value="">Auto-detect from current date</option>
                    {schoolYears.map(year => (
                        <option key={year.id} value={year.name}>{year.name}</option>
                    ))}
                </Select>
                {schoolYears.length === 0 && !schoolYearsLoading && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        No school years defined. The system will use automatic date-based detection.
                    </p>
                )}
                <div className="pt-2">
                    <Link
                        to="/settings/school-years"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-md transition-colors"
                    >
                        <AcademicCapIcon className="h-5 w-5" />
                        Manage School Years
                    </Link>
                </div>
            </SettingsCard>

            <SettingsCard title="Data & Backup" description="Manage your data, configure backups, and import/export records.">
                {/* Backup Settings */}
                <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-200">Auto-Backup Configuration</h4>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Backup Folder Location</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={settings.backupFolderPath || 'Not configured'}
                                className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm"
                            />
                            <button
                                onClick={async () => {
                                    try {
                                        const { open } = await import('@tauri-apps/plugin-dialog');
                                        const selected = await open({
                                            directory: true,
                                            multiple: false,
                                            defaultPath: settings.backupFolderPath || undefined
                                        });
                                        if (selected && typeof selected === 'string') {
                                            saveSettings({ backupFolderPath: selected });
                                        }
                                    } catch (err) {
                                        console.error('Failed to pick folder:', err);
                                        // Fallback or alert user
                                        alert('Could not open folder picker. Ensure you are running in the desktop app.');
                                    }
                                }}
                                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                                title="Select Backup Folder"
                            >
                                <FolderIcon className="h-5 w-5" />
                            </button>
                        </div>
                        {!settings.backupFolderPath && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please select a folder to enable auto-backups.</p>
                        )}
                    </div>

                    <Select
                        label="Auto-Backup Frequency"
                        id="backup-frequency"
                        value={settings.autoBackupFrequency}
                        onChange={e => saveSettings({ autoBackupFrequency: e.target.value as any })}
                        disabled={!settings.backupFolderPath}
                    >
                        <option value="off">Off</option>
                        <option value="onAppStart">On App Start</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="onDataChange">On Every Change (Caution)</option>
                    </Select>
                </div>

                {/* Manual Actions */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-200">Manual Actions</h4>
                    <div className="flex flex-wrap gap-3">
                        <button
                            className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!settings.backupFolderPath}
                            onClick={async () => {
                                const { performBackup } = await import('../../services/backupService');
                                if (settings.backupFolderPath) {
                                    const result = await performBackup(settings.backupFolderPath);
                                    if (result.success) {
                                        await logAction('Backup Data', 'System', null, `Manual backup to ${result.filePath}`);
                                        alert(`Backup saved to ${result.filePath}`);
                                    }
                                    else alert(`Backup failed: ${result.error}`);
                                }
                            }}
                        >
                            Backup Now
                        </button>
                        <button
                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            onClick={async () => {
                                try {
                                    const { open } = await import('@tauri-apps/plugin-dialog');
                                    const { performRestore } = await import('../../services/backupService');

                                    const selected = await open({
                                        multiple: false,
                                        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
                                    });

                                    if (selected && typeof selected === 'string') {
                                        if (confirm("WARNING: This will overwrite ALL current data with the backup. Are you sure?")) {
                                            const result = await performRestore(selected);
                                            if (result.success) {
                                                await logAction('Restore Data', 'System', null, `Restored from ${selected}`);
                                                alert("Restore successful! The app will now reload.");
                                                window.location.reload();
                                            } else {
                                                alert(`Restore failed: ${result.error}`);
                                            }
                                        }
                                    }
                                } catch (err) {
                                    console.error('Restore failed:', err);
                                    alert('Could not open file picker.');
                                }
                            }}
                        >
                            Restore Backup (JSON)
                        </button>
                        <button
                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            onClick={() => setShowImportWizard(true)}
                        >
                            Import CSV
                        </button>
                        <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                        <button
                            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-brand hover:underline"
                            onClick={() => {
                                // Simple CSV Export
                                import('../../services/csvService').then(async ({ exportToCsv }) => {
                                    const { getExportData } = await import('../../db/queries');
                                    const data = await getExportData();
                                    // Flatten data for CSV? Or export JSON?
                                    // Let's export JSON for now as "Full Export"
                                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `step-academy-export-${new Date().toISOString().slice(0, 10)}.json`;
                                    a.click();
                                });
                            }}
                        >
                            Export All Data (JSON)
                        </button>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
};