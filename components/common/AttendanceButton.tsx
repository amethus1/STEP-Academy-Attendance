import React from 'react';
import { Presence } from '../../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon } from '../icons/Icons';

interface AttendanceButtonProps {
    currentPresence?: Presence;
    targetPresence: Presence;
    onClick: () => void;
}

const getButtonConfig = (targetPresence: Presence, isSelected: boolean) => {
    switch (targetPresence) {
        case Presence.Present:
            return {
                icon: CheckCircleIcon,
                selectedColor: 'text-emerald-500',
                hoverColor: 'hover:text-emerald-400',
                label: isSelected ? 'Marked as present' : 'Mark as present'
            };
        case Presence.Absent:
            return {
                icon: XCircleIcon,
                selectedColor: 'text-rose-500',
                hoverColor: 'hover:text-rose-400',
                label: isSelected ? 'Marked as absent' : 'Mark as absent'
            };
        case Presence.Tardy:
            return {
                icon: ClockIcon,
                selectedColor: 'text-amber-500',
                hoverColor: 'hover:text-amber-400',
                label: isSelected ? 'Marked as tardy' : 'Mark as tardy'
            };
        case Presence.Excused:
            return {
                icon: ExclamationTriangleIcon,
                selectedColor: 'text-blue-500',
                hoverColor: 'hover:text-blue-400',
                label: isSelected ? 'Marked as excused' : 'Mark as excused'
            };
        default:
            return {
                icon: CheckCircleIcon,
                selectedColor: 'text-slate-500',
                hoverColor: 'hover:text-slate-400',
                label: 'Mark attendance'
            };
    }
};

export const AttendanceButton: React.FC<AttendanceButtonProps> = React.memo(({ currentPresence, targetPresence, onClick }) => {
    const isSelected = currentPresence === targetPresence;
    const config = getButtonConfig(targetPresence, isSelected);
    const Icon = config.icon;

    return (
        <button
            onClick={onClick}
            aria-label={config.label}
            title={config.label}
            className={`p-1 rounded-full transition-colors duration-150 ${isSelected ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
            <Icon className={`h-6 w-6 transition-all ${isSelected ? config.selectedColor : `text-slate-300 dark:text-slate-500 ${config.hoverColor}`}`} />
        </button>
    );
});

AttendanceButton.displayName = 'AttendanceButton';
