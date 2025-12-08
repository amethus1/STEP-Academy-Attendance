import React, { useState } from 'react';
import { useAuditLogs, useDistinctAuditActions, useDistinctAuditEntityTypes } from '../../hooks/useAuditLogs';
import { formatDateForDisplay } from '../../services/dateUtils';
import { PageLoadingSkeleton } from '../common/SkeletonLoader';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/Icons';

const PAGE_SIZE = 25;

export const AuditLogPage: React.FC = () => {
    const [page, setPage] = useState(0);
    const [actionFilter, setActionFilter] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { data, isLoading, error } = useAuditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    });

    const { data: actions = [] } = useDistinctAuditActions();
    const { data: entityTypes = [] } = useDistinctAuditEntityTypes();

    const logs = data?.logs || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
        if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        if (action.includes('DELETE')) return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    };

    const handleClearFilters = () => {
        setActionFilter('');
        setEntityTypeFilter('');
        setStartDate('');
        setEndDate('');
        setPage(0);
    };

    if (isLoading) return <PageLoadingSkeleton />;
    if (error) return <div className="text-red-500 p-4">Error loading audit logs: {String(error)}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Audit Log</h1>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {total} total entries
                </span>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Action</label>
                    <select
                        value={actionFilter}
                        onChange={e => { setActionFilter(e.target.value); setPage(0); }}
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white min-w-[150px]"
                    >
                        <option value="">All Actions</option>
                        {actions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Entity Type</label>
                    <select
                        value={entityTypeFilter}
                        onChange={e => { setEntityTypeFilter(e.target.value); setPage(0); }}
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white min-w-[150px]"
                    >
                        <option value="">All Types</option>
                        {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">From</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => { setStartDate(e.target.value); setPage(0); }}
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">To</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => { setEndDate(e.target.value); setPage(0); }}
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                    />
                </div>

                <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                >
                    Clear Filters
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entity Type</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entity ID</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                    No audit log entries found
                                </td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <td className="py-3 px-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                        {formatTimestamp(log.timestamp)}
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${getActionBadgeColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                        {log.entity_type}
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono text-xs">
                                        {log.entity_id ? log.entity_id.slice(0, 8) + '...' : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300 max-w-md truncate">
                                        {log.details || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-2 rounded-md border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-2 rounded-md border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <ChevronRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
