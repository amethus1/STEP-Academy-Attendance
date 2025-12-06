import React from 'react';
import { Presence } from '../../types';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onMarkAll: (presence: Presence) => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ selectedCount, onClearSelection, onMarkAll }) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
            <span className="font-medium text-sm">{selectedCount} Selected</span>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onMarkAll(Presence.Present)}
                    className="px-3 py-1.5 bg-brand text-white rounded-md text-sm hover:bg-brand-dark transition-colors font-medium hover:ring-2 ring-brand ring-offset-2 ring-offset-slate-900"
                >
                    Mark All Present
                </button>
                <button
                    onClick={() => onMarkAll(Presence.Absent)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors font-medium hover:ring-2 ring-red-600 ring-offset-2 ring-offset-slate-900"
                >
                    Mark All Absent
                </button>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <button
                onClick={onClearSelection}
                className="text-slate-400 hover:text-white text-sm"
            >
                Clear
            </button>
        </div>
    );
};
