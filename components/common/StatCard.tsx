import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, description, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex items-start justify-between">
        <div className="text-center w-full">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
            {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>}
        </div>
        {icon && <div className="text-slate-400 dark:text-slate-500 ml-4">{icon}</div>}
    </div>
);
