import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import Button from '../components/ui/Button';
import { formatDate } from '../utils/date';
import Papa from 'papaparse';
/// <reference path="../types/electron-api.d.ts" />

const reviveDates = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const isoRE = /^\d{4}-\d{2}-\d{2}(T.*Z)?$/;
    if (isoRE.test(obj)) {
      const d = new Date(obj);
      if (!isNaN(d.getTime())) return d;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(reviveDates);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, reviveDates(v)])
    );
  }
  return obj;
};

const DataManagementPage: React.FC = () => {
  const { students, attendanceLog, holidays, importData } = useAttendance();
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState('');

  /* ---------- EXPORT ---------- */
  const handleExportJson = () => {
    const data = { students, attendanceLog, holidays };
    const blob = new Blob([JSON.stringify(data, null, 2)],
      { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_export_${formatDate(new Date())}.json`;
    link.click();
  };

  const handleExportCsv = async () => {
    const csvText = Papa.unparse(attendanceLog);
    const res = await window.electron.saveCsv(csvText);
    if (res.success) alert(`CSV saved to:\n${res.path}`);
  };

  /* ---------- IMPORT ---------- */
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFile(e.target.files?.[0] ?? null);

  const handleImport = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const data = reviveDates(json);
        if (importData(data)) setImportStatus('Import successful!');
      } catch {
        setImportStatus('Invalid JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Data Management</h1>
        <Button onClick={handleExportJson}>Export Backup (JSON)</Button>
        <Button className="ml-3" onClick={handleExportCsv}>
          Export Attendance Log (CSV)
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Import Data</h2>
        <input type="file" accept=".json" onChange={onFile} />
        <Button onClick={handleImport} variant="danger" disabled={!file}>
          Import & Overwrite
        </Button>
        {importStatus && <p className="mt-2">{importStatus}</p>}
      </div>
    </div>
  );
};

export default DataManagementPage;