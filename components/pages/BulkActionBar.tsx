import React from 'react';
import { Presence } from '../../types';

interface BulkActionBarProps {
    selectedCount: number;
    /** The day the bulk action records, shown so nobody has to guess. */
    dateLabel: string;
    /** When set, the actions are disabled and this explains why. */
    disabledReason?: string;
    onClearSelection: () => void;
    onMarkAll: (presence: Presence) => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ selectedCount, dateLabel, disabledReason, onClearSelection, onMarkAll }) => {
    if (selectedCount === 0) return null;
    const disabled = !!disabledReason;

    return (
        <div
            role="region"
            aria-label="Bulk attendance actions"
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl flex flex-col gap-2 z-50 animate-in fade-in slide-in-from-bottom-4 max-w-[calc(100vw-2rem)]"
        >
            <div className="flex items-center gap-6 flex-wrap">
                <span className="font-medium text-sm">{selectedCount} Selected</span>
                <div className="h-4 w-px bg-slate-700" />
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onMarkAll(Presence.Present)}
                        disabled={disabled}
                        className="px-3 py-1.5 bg-brand text-white rounded-md text-sm hover:bg-brand-dark transition-colors font-medium hover:ring-2 ring-brand ring-offset-2 ring-offset-slate-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:ring-0"
                    >
                        Mark Present for {dateLabel}
                    </button>
                    <button
                        onClick={() => onMarkAll(Presence.Absent)}
                        disabled={disabled}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors font-medium hover:ring-2 ring-red-600 ring-offset-2 ring-offset-slate-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:ring-0"
                    >
                        Mark Absent for {dateLabel}
                    </button>
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <button
                    onClick={onClearSelection}
                    className="text-slate-300 hover:text-white text-sm"
                >
                    Clear
                </button>
            </div>
            {disabledReason && <p className="text-xs text-amber-300">{disabledReason}</p>}
        </div>
    );
};
