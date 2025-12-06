import React from 'react';
import { StudentStatus } from '../../types';

interface StatusBadgeProps {
    status: StudentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({ status }) => {
    const colorClasses = {
        [StudentStatus.Active]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        [StudentStatus.Completed]: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
        [StudentStatus.Withdrawn]: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[status]}`}>
            {status}
        </span>
    );
});

StatusBadge.displayName = 'StatusBadge';
