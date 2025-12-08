import React, { useState, useRef } from 'react';
import { useActiveSchoolYear } from '../../hooks/useActiveSchoolYear';
import { parseCsv, validateImportData, processImport, ImportResult } from '../../services/importService';
import { toast } from 'sonner';
import { useLogAction } from '../../hooks/useAuditLogs';

interface ImportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'complete';

export const ImportWizard: React.FC<ImportWizardProps> = ({ isOpen, onClose, onSuccess }) => {
    const activeSchoolYear = useActiveSchoolYear();
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logAction = useLogAction();

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            toast.error("Please upload a CSV file.");
            return;
        }

        setFile(selectedFile);

        // Parse & Validate
        const text = await selectedFile.text();
        const rawData = parseCsv(text);
        const validation = validateImportData(rawData);

        setImportResult(validation);
        setStep('preview');
    };

    const handleImport = async () => {
        if (!importResult || importResult.validRows.length === 0) return;

        setStep('importing');
        setProgress(0);

        try {
            await processImport(importResult.validRows, activeSchoolYear, (current, total) => {
                setProgress(Math.round((current / total) * 100));
            });
            await logAction('Import Data', 'System', null, `Imported ${importResult.validRows.length} students from CSV`);
            setStep('complete');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Import failed. Check console for details.");
            setStep('preview'); // Go back to preview on error
        }
    };

    const handleReset = () => {
        setStep('upload');
        setFile(null);
        setImportResult(null);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Students (CSV)</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'upload' && (
                        <div className="text-center py-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                            />
                            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Click to upload or drag and drop</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">CSV files only</p>
                        </div>
                    )}

                    {step === 'preview' && importResult && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Valid Rows</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.validRows.length}</p>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Invalid Rows</p>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{importResult.invalidRows.length}</p>
                                </div>
                            </div>

                            {importResult.invalidRows.length > 0 && (
                                <div className="border border-red-200 dark:border-red-800 rounded-md p-4 bg-red-50 dark:bg-red-900/10">
                                    <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Errors</h4>
                                    <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 list-disc pl-4 max-h-40 overflow-y-auto">
                                        {importResult.invalidRows.slice(0, 50).map((err, i) => (
                                            <li key={i}>Row {err.row}: {err.errors.map(e => e.message).join(', ')}</li>
                                        ))}
                                        {importResult.invalidRows.length > 50 && <li>...and {importResult.invalidRows.length - 50} more</li>}
                                    </ul>
                                </div>
                            )}

                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Preview (First 5 Valid)</h4>
                                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-md">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-50 dark:bg-slate-800">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">First Name</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Last Name</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                            {importResult.validRows.slice(0, 5).map((row, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-slate-200">{row.firstName}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-slate-200">{row.lastName}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-slate-200">{row.studentNumber}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-slate-200">{row.gradeLevel}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 border-4 border-slate-200 border-t-brand rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Importing Data...</h3>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-4 max-w-md mx-auto">
                                <div className="bg-brand h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-sm text-slate-500 mt-2">{progress}% Complete</p>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Import Complete!</h3>
                            <p className="text-slate-600 dark:text-slate-400 mt-2">Successfully imported {importResult?.validRows.length} records.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                    {step === 'upload' && (
                        <button onClick={onClose} className="px-4 py-2 text-slate-700 font-medium hover:text-slate-900">Cancel</button>
                    )}
                    {step === 'preview' && (
                        <>
                            <button onClick={handleReset} className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium hover:text-slate-900">Choose Different File</button>
                            <button
                                onClick={handleImport}
                                disabled={importResult?.validRows.length === 0}
                                className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                Import {importResult?.validRows.length} Students
                            </button>
                        </>
                    )}
                    {step === 'complete' && (
                        <button onClick={onClose} className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-dark font-medium">Done</button>
                    )}
                </div>
            </div>
        </div>
    );
};
