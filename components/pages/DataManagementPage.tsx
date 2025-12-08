import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { defaultQueryOptions } from '../../lib/react-query';
import { useSettings } from '../../hooks/useSettings';
import { toast } from 'sonner';
import { RolloverModal } from './RolloverModal';
import { CustomFieldDefinition, AutoBackupFrequency } from '../../types';
import { TrashIcon } from '../icons/Icons';
import { getExportData, importData, recalculateAllSchoolYears, closeOldEnrollments } from '../../db/queries';
import { performBackup, getFrequencyLabel } from '../../services/backupService';
import { validateImportData, isStandardFormat, ValidationResult } from '../../services/importValidation';
import { isLegacyFormat, convertLegacyData } from '../../services/legacyImportService';

export const DataManagementPage: React.FC = () => {
  const { settings, saveSettings, pauseSettingsSave, resumeSettingsSave } = useSettings();
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

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

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
        // Refresh settings/queries
        queryClient.invalidateQueries();
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
      // 0. Pause all settings saves to prevent DB lock contention
      pauseSettingsSave();

      // 1. Disable React Query automatic refetching during import
      queryClient.setDefaultOptions({
        queries: {
          enabled: false,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          refetchInterval: false,
        }
      });

      // 2. Cancel ALL background queries
      await queryClient.cancelQueries();

      // 3. Clear the query cache completely
      queryClient.clear();

      // 4. Force a WAL checkpoint to release any pending writes
      // Removing explicit checkpoint as it might cause more contention
      // const { getDb } = await import('../../db/index');
      // const db = await getDb();
      // await db.execute("PRAGMA wal_checkpoint(TRUNCATE)");

      // 5. Wait for any in-flight database operations to complete
      toast.info("Preparing database for import...");
      await new Promise(resolve => setTimeout(resolve, 2000));

      const importedData = JSON.parse(text);

      // Helper function to attempt import with retry
      const attemptImport = async (data: any, maxRetries = 3): Promise<void> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await importData(data);
            return; // Success!
          } catch (error) {
            const errorMsg = String(error);
            if ((errorMsg.includes('database is locked') || errorMsg.includes('code: 5')) && attempt < maxRetries) {
              console.log(`Import attempt ${attempt} failed due to lock, retrying in ${attempt * 2} seconds...`);
              toast.info(`Database busy, retrying... (${attempt}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            } else {
              throw error; // Re-throw on last attempt or non-lock error
            }
          }
        }
      };

      // 1. Standard Format Check - validate before import
      if (isStandardFormat(importedData)) {
        const validation = validateImportData(importedData);

        if (!validation.valid) {
          // Show validation errors
          setValidationResult(validation);
          setPendingImportData(importedData);
          setShowValidationModal(true);
          return;
        }

        // Show summary and proceed (or show modal for confirmation with summary)
        if (validation.warnings.length > 0) {
          setValidationResult(validation);
          setPendingImportData(importedData);
          setShowValidationModal(true);
          return;
        }

        // No errors or warnings - proceed with import
        await attemptImport(importedData);
        toast.success(`Imported ${validation.summary.studentsCount} students, ${validation.summary.enrollmentsCount} enrollments, ${validation.summary.attendanceCount} attendance records`);
        queryClient.invalidateQueries();
        resumeSettingsSave();
        return;
      }

      // 2. Legacy Format Check - convert old schema to current format
      if (isLegacyFormat(importedData)) {
        toast.info("Legacy backup detected. Converting...");

        const convertedData = convertLegacyData(importedData);
        await attemptImport(convertedData);

        toast.success(`Legacy data imported! ${convertedData.students.length} students, ${convertedData.enrollments.length} enrollments, ${convertedData.attendance.length} attendance records.`);
        queryClient.invalidateQueries();
        resumeSettingsSave();
        return;
      }

      throw new Error("Invalid data structure in JSON file.");
    } catch (error) {
      console.error("Import failed:", error);
      const errorMessage = String(error);

      // Handle specific error types with helpful messages
      if (errorMessage.includes('database is locked') || errorMessage.includes('code: 5')) {
        toast.error("Database is busy after multiple retries. Please close and reopen the app, then try again.");
      } else if (errorMessage.includes('JSON')) {
        toast.error("Import failed: Invalid JSON file format.");
      } else {
        toast.error(`Import failed: ${errorMessage}`);
      }
    } finally {
      // Always restore React Query defaults and resume settings saves
      queryClient.setDefaultOptions(defaultQueryOptions);
      resumeSettingsSave();
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

  const proceedWithImport = async () => {
    if (!pendingImportData) return;
    setShowValidationModal(false);

    try {
      await importData(pendingImportData);
      toast.success(`Imported ${validationResult?.summary.studentsCount || 0} students, ${validationResult?.summary.enrollmentsCount || 0} enrollments`);
      setPendingImportData(null);
      setValidationResult(null);
      queryClient.invalidateQueries();
    } catch (e) {
      console.error("Import failed:", e);
      toast.error("Import failed: " + String(e));
    }
  };

  const cancelImport = () => {
    setShowValidationModal(false);
    setPendingImportData(null);
    setValidationResult(null);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <RolloverModal isOpen={isRolloverModalOpen} onClose={() => setIsRolloverModalOpen(false)} />

      {/* Import Validation Modal */}
      {showValidationModal && validationResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Import Validation {validationResult.valid ? '✓' : '✗'}
            </h3>

            {/* Summary */}
            <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Data Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand">{validationResult.summary.studentsCount}</div>
                  <div className="text-slate-500">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand">{validationResult.summary.enrollmentsCount}</div>
                  <div className="text-slate-500">Enrollments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand">{validationResult.summary.attendanceCount}</div>
                  <div className="text-slate-500">Attendance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand">{validationResult.summary.holidaysCount}</div>
                  <div className="text-slate-500">Holidays</div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">
                  Errors ({validationResult.errors.length})
                </h4>
                <div className="max-h-40 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  {validationResult.errors.slice(0, 20).map((err, i) => (
                    <div key={i} className="text-sm text-red-700 dark:text-red-300 py-1">
                      {err.row !== undefined && <span className="font-mono text-xs mr-2">[Row {err.row}]</span>}
                      <strong>{err.field}</strong>: {err.message}
                    </div>
                  ))}
                  {validationResult.errors.length > 20 && (
                    <p className="text-sm text-red-500 italic">...and {validationResult.errors.length - 20} more errors</p>
                  )}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                  Warnings ({validationResult.warnings.length})
                </h4>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  {validationResult.warnings.map((warn, i) => (
                    <div key={i} className="text-sm text-amber-700 dark:text-amber-300 py-1">
                      <strong>{warn.field}</strong>: {warn.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cancelImport}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md font-medium"
              >
                Cancel
              </button>
              {validationResult.valid && (
                <button
                  onClick={proceedWithImport}
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-md font-medium"
                >
                  Proceed with Import
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
