import React, { ReactNode } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '../icons/Icons';

export type ColumnDef<T> = {
    id: string;
    label: string | ReactNode;
    sortable?: boolean;
    render?: (item: T) => ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
};

export type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
};

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    keyExtractor: (item: T) => string | number;
    isLoading?: boolean;
    sortConfig?: SortConfig;
    onSort?: (key: string) => void;
    // Pagination
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    pageSize?: number;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
    emptyMessage?: ReactNode;
    /** Extra classes per row, e.g. to highlight a keyboard-focused row. */
    rowClassName?: (item: T) => string;
}

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    isLoading = false,
    sortConfig,
    onSort,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    pageSize = 25,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    emptyMessage = "No data found.",
    rowClassName
}: DataTableProps<T>) {

    if (isLoading) {
        // Simple skeletal loader for table rows
        return (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden animate-pulse">
                <div className="h-12 bg-slate-100 dark:bg-slate-800 border-b dark:border-slate-700" />
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 border-b dark:border-slate-700 last:border-0" />
                ))}
            </div>
        );
    }

    const handleSort = (colId: string) => {
        if (onSort) onSort(colId);
    };

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + data.length; // Approximate for display text
    // Note: data passing into this table is usually usually already paginated (pageData) 
    // OR full data that we slice here? 
    // Let's assume the parent passes *displayed* data (paginated) OR full data if they don't use server-side.
    // Actually, to make it generic, let's assume `data` contains only the items to show on the current page.
    // The counting labels (Showing X-Y of Z) need a totalCount prop if we want to be accurate for server-side.
    // Let's stick to the current RosterPage pattern: Client-side pagination logic is in component, 
    // but let's allow `data` to be the "paginated slice".
    // Wait, RosterPage currently slices it: `paginatedStudents = sortedAndFilteredStudents.slice(...)`.

    // So `data` prop is the slice. We need totalItems to display "Showing ... of X".

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-x-auto max-h-[70vh]">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                        <tr>
                            {columns.map(col => {
                                const isSorted = sortConfig && sortConfig.key === col.id;
                                const ariaSort: 'ascending' | 'descending' | 'none' = isSorted
                                    ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending')
                                    : 'none';
                                return (
                                    <th
                                        key={col.id}
                                        scope="col"
                                        aria-sort={col.sortable ? ariaSort : undefined}
                                        onClick={() => col.sortable && handleSort(col.id)}
                                        className={`py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none' : ''} ${col.width ? col.width : ''}`}
                                    >
                                        <span className={`inline-flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                                            {col.label}
                                            {col.sortable && (
                                                isSorted
                                                    ? (sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />)
                                                    : <ChevronUpIcon className="h-3.5 w-3.5 opacity-30" />
                                            )}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                        {data.map((item) => (
                            <tr
                                key={keyExtractor(item)}
                                data-row-key={keyExtractor(item)}
                                className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${rowClassName ? rowClassName(item) : ''}`}
                            >
                                {columns.map(col => (
                                    <td key={`${keyExtractor(item)}-${col.id}`} className={`py-3 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                                        {col.render ? col.render(item) : (item as any)[col.id]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length === 0 && (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        {emptyMessage}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && onPageChange && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                            Page {currentPage} of {totalPages}
                        </span>
                        {onPageSizeChange && pageSize && (
                            <select
                                value={pageSize}
                                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                className="ml-2 p-1 border rounded-md text-sm bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600"
                            >
                                {pageSizeOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt} per page</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
                        >
                            First
                        </button>
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
                        >
                            Prev
                        </button>

                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
