import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettings } from '../../hooks/useSettings';
import { toast } from 'sonner';
import { RolloverModal } from './RolloverModal';
import { CustomFieldDefinition, AutoBackupFrequency } from '../../types';
import { TrashIcon } from '../icons/Icons';
import { getExportData, importData, DBStudent, DBEnrollment, DBAttendance, DBHoliday, recalculateAllSchoolYears, closeOldEnrollments } from '../../db/queries';
import { performBackup, getFrequencyLabel } from '../../services/backupService';

export const DataManagementPage: React.FC = () => {
  const { settings, saveSettings } = useSettings();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customFieldDefinitions = settings.customFieldDefinitions || [];

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date'>('text');
  const [error, setError] = useState('');
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('Loading...');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
  const [isClosingOld, setIsClosingOld] = useState(false);
  const [showCloseOldConfirm, setShowCloseOldConfirm] = useState(false);

  useEffect(() => {
    // SQLite managed internally
    setCurrentLocation('Internal Direct SQL Database');
  }, []);

  const handleChangeLocation = async () => {
    toast.info("Changing storage location is not supported in the new database architecture.");
  };

  const handleSelectBackupFolder = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Backup Folder'
      });

      if (selected) {
        saveSettings({ backupFolderPath: selected as string });
        toast.success('Backup folder set!');
      }
    } catch (e) {
      console.error('Failed to select folder:', e);
      toast.error('Could not open folder picker');
    }
  };

  const handleBackupNow = async () => {
    if (!settings.backupFolderPath) {
      toast.error('Please select a backup folder first');
      return;
    }

    setIsBackingUp(true);
    try {
      const result = await performBackup(settings.backupFolderPath);
      if (result.success) {
        toast.success('Backup completed successfully!');
        // Refresh settings to show updated last backup date
        window.location.reload();
      } else {
        toast.error('Backup failed: ' + result.error);
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFrequencyChange = (frequency: AutoBackupFrequency) => {
    if (frequency === 'onDataChange') {
      const confirmed = window.confirm(
        'Warning: "On Data Change" will create a backup every time you save a student or import data. ' +
        'This can create many backup files quickly and may slow down operations. ' +
        'Are you sure you want to enable this?'
      );
      if (!confirmed) return;
    }
    saveSettings({ autoBackupFrequency: frequency });
  };

  const formatLastBackupDate = () => {
    if (!settings.lastAutoBackupDate) return 'Never';
    const date = new Date(settings.lastAutoBackupDate);
    return date.toLocaleString();
  };

  const handleExport = async () => {
    try {
      toast.info("Preparing export...");
      const data = await getExportData();
      const content = JSON.stringify(data, null, 2);

      try {
        // Try Tauri export
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');

        const filePath = await save({
          defaultPath: `step-academy-backup-${new Date().toISOString().split('T')[0]}.json`,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (filePath) {
          await writeTextFile(filePath, content);
          toast.success("Export successful!");
        } else {
          toast.info("Export cancelled");
        }
      } catch (tauriError) {
        console.warn("Tauri export failed, falling back to browser download", tauriError);
        // Fallback to Blob
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `step-academy-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Export started (Browser Mode)!");
      }
    } catch (e) {
      console.error("Export failed", e);
      toast.error("Export failed");
    }
  };

  const handleImportClick = async () => {
    if (settings.showConfirmations) {
      const confirmed = await window.confirm("Are you sure you want to import data? This will overwrite all existing data.");
      if (!confirmed) return;
    }

    try {
      // Try Tauri import
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readTextFile } = await import('@tauri-apps/plugin-fs');

        const selected = await open({
          multiple: false,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (selected) {
          const filePath = selected as string;
          const text = await readTextFile(filePath);
          await processImport(text);
        }
      } catch (tauriError) {
        console.warn("Tauri import failed, falling back to browser input", tauriError);
        fileInputRef.current?.click();
      }
    } catch (e) {
      console.error("Import failed", e);
      toast.error("Import failed: " + String(e));
    }
  };

  const processImport = async (text: string) => {
    try {
      // Cancel background queries to release DB locks
      await queryClient.cancelQueries();

      const importedData = JSON.parse(text);

      // 1. Standard Format Check
      if ('students' in importedData && 'enrollments' in importedData && 'attendance' in importedData && 'holidays' in importedData) {
        await importData(importedData);
        toast.success("Data imported successfully!");
        setTimeout(() => window.location.reload(), 1000);
        return;
      }

      // 2. Legacy Format Check (User Schema)
      // Schema: { "$schema": "...", "properties": { "students": [...], "attendance": [...] } }
      // We check for students and attendance arrays, and absence of enrollments
      if (Array.isArray(importedData.students) && Array.isArray(importedData.attendance) && !importedData.enrollments) {
        toast.info("Legacy backup detected. Converting...");

        // Transform Logic
        const newStudents: DBStudent[] = [];
        const newEnrollments: DBEnrollment[] = [];
        const newAttendance: DBAttendance[] = [];

        // Map legacy student ID (string like "12345") to new UUIDs
        // legacyId -> { studentUuid, enrollmentUuid }
        const idMap = new Map<string, { studentUuid: string, enrollmentUuid: string }>();

        for (const s of importedData.students) {
          const studentUuid = crypto.randomUUID();
          const enrollmentUuid = crypto.randomUUID();

          // Infer school year from entryDate or use current
          let schoolYear = '2024-2025'; // Default
          if (s.entryDate) {
            const year = parseInt(s.entryDate.split('-')[0]);
            const month = parseInt(s.entryDate.split('-')[1]);
            // If aug-dec, year is start. If jan-jul, year-1 is start.
            const startYear = month >= 8 ? year : year - 1;
            schoolYear = `${startYear}-${startYear + 1}`;
          }

          idMap.set(s.id, { studentUuid, enrollmentUuid });

          // Create Profile
          newStudents.push({
            id: studentUuid,
            student_number: s.id, // Legacy ID becomes student number
            first_name: s.firstName,
            last_name: s.lastName,
            dob: null, // Not in schema
            guardian_name: s.guardianName || null,
            guardian_phone: s.guardianPhone || null,
            emergency_contact_name: s.emergencyContactName || null,
            emergency_contact_phone: s.emergencyContactPhone || null,
            photo_url: s.photoUrl || null,
            custom_fields: JSON.stringify(s.customFields || {})
          });

          // Create Enrollment
          newEnrollments.push({
            id: enrollmentUuid,
            student_id: studentUuid,
            school_year: schoolYear,
            start_date: s.entryDate || new Date().toISOString().split('T')[0],
            end_date: s.exitDate || null, // Assuming exitDate might exist in data even if not in user's prompt schema example
            grade_level: s.gradeLevel || 'Unknown',
            campus: s.campus || 'Main',
            status: s.status || 'Active',
            sped_504: s.sped504 || null,
            drg_offense: s.drgOffense || null,
            days_assigned: s.daysAssigned || 0,
            credit_days: s.creditDays || 0,
            comments: s.comments || null
          });
        }

        // Transform Attendance
        for (const a of importedData.attendance) {
          const map = idMap.get(a.studentId);
          if (map) {
            newAttendance.push({
              id: crypto.randomUUID(),
              student_id: map.studentUuid,
              enrollment_id: map.enrollmentUuid,
              date: a.date,
              presence: a.presence
            });
          }
        }

        // Import Converted Data
        await importData({
          students: newStudents,
          enrollments: newEnrollments,
          attendance: newAttendance,
          holidays: [] // Legacy has no holidays
        });

        toast.success("Legacy data imported and converted successfully!");
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      throw new Error("Invalid data structure in JSON file.");
    } catch (error) {
      console.error("Import parsing failed:", error);
      toast.error(`Import failed. Invalid file format.`);
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        await processImport(text);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newFieldName.trim()) {
      setError('Field name is required');
      return;
    }
    const id = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (customFieldDefinitions.some(f => f.id === id)) {
      setError('Field with this name already exists');
      return;
    }

    const newField: CustomFieldDefinition = { id, name: newFieldName.trim(), type: newFieldType };

    // Update settings
    saveSettings({ customFieldDefinitions: [...customFieldDefinitions, newField] });

    setNewFieldName('');
    setNewFieldType('text');
    setError('');
  };

  const handleDeleteCustomField = (id: string) => {
    if (settings.showConfirmations && !window.confirm("Are you sure? Data for this field will be hidden (but remains in DB JSON).")) return;
    saveSettings({ customFieldDefinitions: customFieldDefinitions.filter(f => f.id !== id) });
  };

  const handleRecalculateSchoolYears = () => {
    // Just show the modal - actual work happens in executeRecalculate
    setShowRecalculateConfirm(true);
  };

  const executeRecalculate = () => {
    setShowRecalculateConfirm(false);
    setIsRecalculating(true);
    recalculateAllSchoolYears()
      .then((result) => {
        queryClient.invalidateQueries();
        if (result.updated === 0) {
          toast.success(`All ${result.total} enrollments are already correct!`);
        } else {
          toast.success(`Updated ${result.updated} of ${result.total} enrollments.`);
        }
      })
      .catch((e) => {
        console.error("Failed to recalculate school years:", e);
        toast.error("Failed to recalculate school years. Check console for details.");
      })
      .finally(() => {
        setIsRecalculating(false);
      });
  };

  const handleCloseOldEnrollments = () => {
    setShowCloseOldConfirm(true);
  };

  const executeCloseOld = () => {
    setShowCloseOldConfirm(false);
    setIsClosingOld(true);

    // Use current school year from settings
    const currentYear = settings.schoolYearStartDate
      ? `${new Date(settings.schoolYearStartDate).getFullYear()}-${new Date(settings.schoolYearStartDate).getFullYear() + 1}`
      : '2024-2025';

    closeOldEnrollments(currentYear)
      .then((result) => {
        queryClient.invalidateQueries();
        if (result.updated === 0) {
          toast.success('No old Active enrollments found!');
        } else {
          toast.success(`Closed ${result.updated} old enrollment(s).`);
        }
      })
      .catch((e) => {
        console.error("Failed to close old enrollments:", e);
        toast.error("Failed to close old enrollments. Check console for details.");
      })
      .finally(() => {
        setIsClosingOld(false);
      });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <RolloverModal isOpen={isRolloverModalOpen} onClose={() => setIsRolloverModalOpen(false)} />

      {/* Recalculate School Years Confirmation Modal */}
      {showRecalculateConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recalculate School Years?</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-2">
              This will recalculate the school year for ALL enrollments based on their registration date.
            </p>
            <ul className="text-sm text-slate-500 dark:text-slate-400 mb-4 list-disc list-inside">
              <li>If a defined school year covers the date, it will use that.</li>
              <li>Otherwise, assumes July 15 starts a new school year.</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRecalculateConfirm(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={executeRecalculate}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium"
              >
                Yes, Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Old Enrollments Confirmation Modal */}
      {showCloseOldConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Close Old Enrollments?</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-2">
              This will mark all "Active" enrollments from <strong>previous school years</strong> as "Completed".
            </p>
            <ul className="text-sm text-slate-500 dark:text-slate-400 mb-4 list-disc list-inside">
              <li>Only affects enrollments NOT in the current school year</li>
              <li>Sets status to "Completed" with an exit date of June 30</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCloseOldConfirm(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={executeCloseOld}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
              >
                Yes, Close Old Enrollments
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Data Management</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage application data, custom fields, and backups.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">End of Year Actions</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Prepare for the next school year by promoting students and updating the school year dates.
          This process creates new student records for the next year while preserving the current year's history.
        </p>
        <button
          onClick={() => setIsRolloverModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm transition-colors"
        >
          Start Year-End Rollover
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Custom Student Fields</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Add custom fields to the student profile. These will appear on the student form and can be displayed on the roster.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Existing Fields</h3>
            {customFieldDefinitions.length === 0 ? (
              <p className="text-slate-500 italic">No custom fields defined.</p>
            ) : (
              <ul className="space-y-2">
                {customFieldDefinitions.map(field => (
                  <li key={field.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded border dark:border-slate-700">
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{field.name}</span>
                      <span className="ml-2 text-xs text-slate-500 uppercase">({field.type})</span>
                    </div>
                    <button onClick={() => handleDeleteCustomField(field.id)} className="text-red-500 hover:text-red-700 text-sm"><TrashIcon className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md border dark:border-slate-700">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Add New Field</h3>
            <form onSubmit={handleAddCustomField} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Field Name</label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                  placeholder="e.g., Guardian Phone"
                  className="w-full p-2 border rounded-md text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Field Type</label>
                <select
                  value={newFieldType}
                  onChange={e => setNewFieldType(e.target.value as any)}
                  className="w-full p-2 border rounded-md text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" className="w-full py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark">Add Field</button>
            </form>
          </div>
        </div>
      </div>

      {/* Automatic Backups Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Automatic Backups</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Configure automatic backups to a folder of your choice (e.g., Google Drive, Dropbox, or any synced folder).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup Folder */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Backup Folder</label>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleSelectBackupFolder}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Select Folder
              </button>
              {settings.backupFolderPath && (
                <button
                  onClick={handleBackupNow}
                  disabled={isBackingUp}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-md"
                >
                  {isBackingUp ? 'Backing up...' : 'Backup Now'}
                </button>
              )}
            </div>
            {settings.backupFolderPath ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 break-all">
                📁 {settings.backupFolderPath}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400 italic">No folder selected</p>
            )}
          </div>

          {/* Auto-Backup Frequency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Auto-Backup Frequency</label>
            <select
              value={settings.autoBackupFrequency || 'off'}
              onChange={(e) => handleFrequencyChange(e.target.value as AutoBackupFrequency)}
              disabled={!settings.backupFolderPath}
              className="w-full p-2 border rounded-md text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white disabled:opacity-50"
            >
              <option value="off">Off</option>
              <option value="daily">Daily (once per day on app start)</option>
              <option value="weekly">Weekly (once per week on app start)</option>
              <option value="onAppStart">Every App Start</option>
              <option value="onDataChange">On Data Change ⚠️</option>
            </select>
            {settings.autoBackupFrequency === 'onDataChange' && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Creates backups frequently. May generate many files.
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Last backup: {formatLastBackupDate()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Export Data</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Export all your students, attendance records, holidays, and custom fields into a single JSON file.</p>
          <button onClick={handleExport} className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm">Export All Data</button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Import Data</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Import data from a JSON backup file. <strong className="text-red-500">Warning: This will overwrite all existing data.</strong></p>
          <div className="flex gap-2">
            <button onClick={handleImportClick} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Import Data</button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Maintenance Section - at the bottom */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Maintenance</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Advanced tools for fixing data issues. Use with caution.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Recalculate School Years</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Re-assigns the school year for each enrollment based on its registration date.
              Uses defined school years if available, otherwise assumes school year starts July 15.
            </p>
            <button
              onClick={handleRecalculateSchoolYears}
              disabled={isRecalculating}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-md"
            >
              {isRecalculating ? 'Recalculating...' : 'Recalculate School Years'}
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Close Old Enrollments</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Marks all "Active" enrollments from previous school years as "Completed".
              Use this to clean up enrollments that weren't properly closed during rollover.
            </p>
            <button
              onClick={handleCloseOldEnrollments}
              disabled={isClosingOld}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-md"
            >
              {isClosingOld ? 'Closing...' : 'Close Old Enrollments'}
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};