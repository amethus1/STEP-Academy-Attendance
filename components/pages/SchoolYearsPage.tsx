import React, { useState } from 'react';
import { useSchoolYears, useCreateSchoolYear, useUpdateSchoolYear, useDeleteSchoolYear } from '../../hooks/useSchoolYears';
import { SchoolYear } from '../../types';
import { TrashIcon, PencilIcon } from '../icons/Icons';
import { formatDateForDisplay } from '../../services/dateUtils';

export const SchoolYearsPage: React.FC = () => {
    const { data: schoolYears = [], isLoading } = useSchoolYears();
    const createSchoolYear = useCreateSchoolYear();
    const updateSchoolYear = useUpdateSchoolYear();
    const deleteSchoolYear = useDeleteSchoolYear();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingYear, setEditingYear] = useState<SchoolYear | null>(null);
    const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '' });

    const handleEdit = (year: SchoolYear) => {
        if (!year) {
            console.error("Attempted to edit undefined year");
            return;
        }
        setEditingYear(year);
        setFormData({
            name: year.name || '',
            startDate: year.startDate || '',
            endDate: year.endDate || ''
        });
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingYear(null);
        // Default new year guess?
        setFormData({ name: '', startDate: '', endDate: '' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}? This will rely on fallback logic for dates in this range.`)) {
            await deleteSchoolYear.mutateAsync(id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingYear) {
                await updateSchoolYear.mutateAsync({
                    id: editingYear.id,
                    updates: formData
                });
            } else {
                await createSchoolYear.mutateAsync({
                    id: crypto.randomUUID(),
                    ...formData
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to save school year", error);
            alert("Failed to save school year.");
        }
    };

    if (isLoading) return <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-lg">Loading school years...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">School Years Management</h1>
                <button
                    type="button"
                    onClick={handleCreate}
                    className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-md shadow-sm transition-colors"
                >
                    Add School Year
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">End Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {schoolYears.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                                    No school years defined. System is using default legacy logic.
                                </td>
                            </tr>
                        ) : (
                            schoolYears.map(year => (
                                <tr key={year.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{year.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{formatDateForDisplay(year.startDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{formatDateForDisplay(year.endDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(year)}
                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                                            title="Edit"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(year.id, year.name)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                            title="Delete"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">{editingYear ? 'Edit School Year' : 'Add School Year'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 2024-2025"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring focus:ring-brand focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring focus:ring-brand focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.endDate}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring focus:ring-brand focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-dark shadow-sm"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
