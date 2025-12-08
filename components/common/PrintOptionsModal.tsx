import React, { useState } from 'react';
import { PrinterIcon } from '../icons/Icons';

interface PrintSection {
    id: string;
    label: string;
    defaultEnabled: boolean;
}

interface PrintOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPrint: (options: PrintOptions) => void;
    studentName: string;
}

export interface PrintOptions {
    includeHeader: boolean;
    includeStats: boolean;
    includeDetails: boolean;
    includeContact: boolean;
    includeCalendar: boolean;
    includeAttendanceLog: boolean;
    includeComments: boolean;
    includeNotes: boolean;
    attendanceLogColumns: 1 | 2;
}

const defaultOptions: PrintOptions = {
    includeHeader: true,
    includeStats: true,
    includeDetails: true,
    includeContact: true,
    includeCalendar: true,
    includeAttendanceLog: true,
    includeComments: true,
    includeNotes: true,
    attendanceLogColumns: 2,
};

export const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
    isOpen,
    onClose,
    onPrint,
    studentName
}) => {
    const [options, setOptions] = useState<PrintOptions>(defaultOptions);

    const sections: PrintSection[] = [
        { id: 'includeHeader', label: 'Student Header (Name, Photo, Status)', defaultEnabled: true },
        { id: 'includeStats', label: 'Statistics Cards (Days Attended, Remaining, etc.)', defaultEnabled: true },
        { id: 'includeDetails', label: 'Student Details (Campus, Grade, SPED/504)', defaultEnabled: true },
        { id: 'includeContact', label: 'Contact Information', defaultEnabled: true },
        { id: 'includeCalendar', label: 'Attendance Calendar', defaultEnabled: true },
        { id: 'includeAttendanceLog', label: 'Attendance Log', defaultEnabled: true },
        { id: 'includeComments', label: 'Comments Section', defaultEnabled: true },
        { id: 'includeNotes', label: 'Daily Notes', defaultEnabled: true },
    ];

    const toggleOption = (id: keyof PrintOptions) => {
        setOptions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePrint = () => {
        onPrint(options);
        onClose();
    };

    const handleSelectAll = () => {
        setOptions({
            ...options,
            includeHeader: true,
            includeStats: true,
            includeDetails: true,
            includeContact: true,
            includeCalendar: true,
            includeAttendanceLog: true,
            includeComments: true,
            includeNotes: true,
        });
    };

    const handleSelectNone = () => {
        setOptions({
            ...options,
            includeHeader: true, // Always keep header
            includeStats: false,
            includeDetails: false,
            includeContact: false,
            includeCalendar: false,
            includeAttendanceLog: false,
            includeComments: false,
            includeNotes: false,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <PrinterIcon className="h-5 w-5" /> Print Options
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Select sections to include for <strong>{studentName}</strong>
                    </p>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={handleSelectAll}
                            className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                            Select All
                        </button>
                        <button
                            onClick={handleSelectNone}
                            className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                            Minimal
                        </button>
                    </div>

                    <div className="space-y-3">
                        {sections.map(section => (
                            <label
                                key={section.id}
                                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <input
                                    type="checkbox"
                                    checked={options[section.id as keyof PrintOptions] as boolean}
                                    onChange={() => toggleOption(section.id as keyof PrintOptions)}
                                    disabled={section.id === 'includeHeader'}
                                    className="w-5 h-5 rounded border-slate-300 text-brand focus:ring-brand"
                                />
                                <span className={`text-sm ${section.id === 'includeHeader' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {section.label}
                                    {section.id === 'includeHeader' && <span className="ml-2 text-xs text-slate-400">(Required)</span>}
                                </span>
                            </label>
                        ))}
                    </div>

                    {/* Attendance Log Options */}
                    {options.includeAttendanceLog && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                                Attendance Log Layout
                            </p>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="columns"
                                        checked={options.attendanceLogColumns === 1}
                                        onChange={() => setOptions(prev => ({ ...prev, attendanceLogColumns: 1 }))}
                                        className="text-brand focus:ring-brand"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-200">Single Column</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="columns"
                                        checked={options.attendanceLogColumns === 2}
                                        onChange={() => setOptions(prev => ({ ...prev, attendanceLogColumns: 2 }))}
                                        className="text-brand focus:ring-brand"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-200">Two Columns (Compact)</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md flex items-center gap-2"
                    >
                        <PrinterIcon className="h-4 w-4" /> Print
                    </button>
                </div>
            </div>
        </div>
    );
};
