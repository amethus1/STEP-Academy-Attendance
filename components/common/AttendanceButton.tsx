import React from 'react';
import { Presence } from '../../types';
import { CheckCircleIcon, XCircleIcon } from '../icons/Icons';

interface AttendanceButtonProps {
    currentPresence?: Presence;
    targetPresence: Presence;
    onClick: () => void;
}

export const AttendanceButton: React.FC<AttendanceButtonProps> = React.memo(({ currentPresence, targetPresence, onClick }) => {
    const isSelected = currentPresence === targetPresence;
    const isPresent = targetPresence === Presence.Present;

    const ariaLabel = isPresent
        ? (isSelected ? 'Marked as present' : 'Mark as present')
        : (isSelected ? 'Marked as absent' : 'Mark as absent');

    return (
        <button
            onClick={onClick}
            aria-label={ariaLabel}
            className={`p-1 rounded-full transition-colors duration-150 ${isSelected ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
            {isPresent ?
                <CheckCircleIcon className={`h-6 w-6 transition-all ${isSelected ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-500 hover:text-emerald-400'}`} /> :
                <XCircleIcon className={`h-6 w-6 transition-all ${isSelected ? 'text-rose-500' : 'text-slate-300 dark:text-slate-500 hover:text-rose-400'}`} />
            }
        </button>
    );
});

AttendanceButton.displayName = 'AttendanceButton';
