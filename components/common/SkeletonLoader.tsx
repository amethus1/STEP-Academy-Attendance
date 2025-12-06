import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 8 }) => (
    <tr>
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="py-3 px-4">
                <Skeleton className="h-5 w-full" />
            </td>
        ))}
    </tr>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 8 }) => (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="py-3 px-4">
                                <Skeleton className="h-4 w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRowSkeleton key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export const CardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
    </div>
);

export const StatCardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg text-center shadow-sm">
        <Skeleton className="h-4 w-24 mx-auto mb-2" />
        <Skeleton className="h-8 w-16 mx-auto" />
    </div>
);

export const PageLoadingSkeleton: React.FC = () => (
    <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
        </div>
        <TableSkeleton />
    </div>
);
