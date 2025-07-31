import React, { useRef, useState } from 'react';
import { getAppData, saveAppData } from '../../services/storageService';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { CustomFieldDefinition } from '../../types';
import { TrashIcon } from '../icons/Icons';

export const DataManagementPage: React.FC = () => {
  const { customFieldDefinitions, addCustomFieldDefinition, removeCustomFieldDefinition, refreshData } = useAppData();
  const { settings, saveSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date'>('text');
  const [error, setError] = useState('');

  const handleExport = () => {
    const data = getAppData();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `step-academy-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (settings.showConfirmations && !window.confirm("Are you sure you want to import this file? This will overwrite all existing data.")) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File is not readable");
        const importedData = JSON.parse(text);
        
        if ('students' in importedData && 'attendance' in importedData && 'holidays' in importedData) {
          saveAppData(importedData);
          alert("Data imported successfully!");
          refreshData();
          window.location.reload(); 
        } else {
          throw new Error("Invalid data structure in JSON file.");
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert(`Import failed. Please check the file format. Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
         if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newFieldName.trim()) {
      setError("Field name cannot be empty.");
      return;
    }
    const fieldId = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (customFieldDefinitions.some(f => f.id === fieldId)) {
      setError("A field with this name already exists.");
      return;
    }

    const newField: CustomFieldDefinition = {
      id: fieldId,
      name: newFieldName.trim(),
      type: newFieldType,
    };
    addCustomFieldDefinition(newField);
    setNewFieldName('');
    setNewFieldType('text');
  };
  
  const handleRemoveCustomField = (fieldId: string) => {
    if (settings.showConfirmations && !window.confirm("Are you sure you want to remove this custom field? This will delete all data associated with it from all students.")) {
        return;
    }
    // Remove from roster settings
    saveSettings({
      rosterVisibleColumns: settings.rosterVisibleColumns.filter(id => id !== fieldId),
      rosterColumnOrder: settings.rosterColumnOrder.filter(id => id !== fieldId),
    });
    // Remove from student data
    removeCustomFieldDefinition(fieldId);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b dark:border-slate-700 pb-3 mb-4">Custom Student Fields</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-4">Add custom fields to the student profile. These will appear on the student form and can be displayed on the roster.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Existing Fields</h4>
            <ul className="space-y-2">
              {customFieldDefinitions.map(field => (
                <li key={field.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                  <div>
                    <span className="font-medium dark:text-slate-200">{field.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{field.type}</span>
                  </div>
                  <button onClick={() => handleRemoveCustomField(field.id)} className="text-slate-400 hover:text-rose-500 p-1 rounded-full"><TrashIcon /></button>
                </li>
              ))}
              {customFieldDefinitions.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No custom fields defined.</p>}
            </ul>
          </div>
          <form onSubmit={handleAddCustomField} className="space-y-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">Add New Field</h4>
            <div>
                <label htmlFor="new-field-name" className="text-sm font-medium text-slate-600 dark:text-slate-300">Field Name</label>
                <input id="new-field-name" type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="w-full p-2 mt-1 border rounded-md bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600" placeholder="e.g., Guardian Phone"/>
            </div>
            <div>
                <label htmlFor="new-field-type" className="text-sm font-medium text-slate-600 dark:text-slate-300">Field Type</label>
                <select id="new-field-type" value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)} className="w-full p-2 mt-1 border rounded-md bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                </select>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" className="w-full px-4 py-2 bg-brand-dark hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm">Add Field</button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b dark:border-slate-700 pb-3 mb-4">Export Data</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Export all your students, attendance records, holidays, and custom fields into a single JSON file.
        </p>
        <button 
          onClick={handleExport}
          className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm"
        >
          Export All Data
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border-l-4 border-rose-500">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b dark:border-slate-700 pb-3 mb-4">Import Data</h3>
        <div className="bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 p-3 rounded-md mb-4">
          <p className="font-bold">Warning!</p>
          <p>Importing a file will completely overwrite all current application data. This action cannot be undone.</p>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Choose a previously exported JSON file to restore your application data.
        </p>
        <input 
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileSelected}
          className="hidden"
        />
        <button
          onClick={handleImportClick}
          className="cursor-pointer px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md shadow-sm inline-block"
        >
          Choose File and Import
        </button>
      </div>
    </div>
  );
};