import React, { useState } from 'react';
import { EnrollmentUI } from '../../services/mappers';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateForDisplay } from '../../services/dateUtils';
import { StudentStatus } from '../../types';
import { PencilIcon, XCircleIcon } from '../icons/Icons';

interface EnrollmentHistorySectionProps {
    enrollments: EnrollmentUI[];
    selectedEnrollmentId: string | null;
    onSelectEnrollment: (id: string) => void;
    onEditEnrollment?: (enrollmentId: string, updates: Partial<EnrollmentUI>) => void;
}

interface EditFormState {
    gradeLevel: string;
    campus: string;
    status: StudentStatus;
    startDate: string;
    endDate: string;
    daysAssigned: number;
    creditDays: number;
    sped504: string;
    drgOffense: string;
    comments: string;
}

/**
 * Displays enrollment history for a student.
 * Clicking an enrollment can filter the attendance view to that period.
 * Supports editing individual enrollments.
 */
export const EnrollmentHistorySection: React.FC<EnrollmentHistorySectionProps> = ({
    enrollments,
    selectedEnrollmentId,
    onSelectEnrollment,
    onEditEnrollment
}) => {
    const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditFormState | null>(null);

    const handleEditClick = (e: React.MouseEvent, enrollment: EnrollmentUI) => {
        e.stopPropagation(); // Prevent selection
        setEditingEnrollmentId(enrollment.id);
        setEditForm({
            gradeLevel: enrollment.gradeLevel,
            campus: enrollment.campus,
            status: enrollment.status,
            startDate: enrollment.startDate,
            endDate: enrollment.endDate,
            daysAssigned: enrollment.daysAssigned,
            creditDays: enrollment.creditDays,
            sped504: enrollment.sped504,
            drgOffense: enrollment.drgOffense,
            comments: enrollment.comments
        });
    };

    const handleSave = () => {
        if (!editingEnrollmentId || !editForm || !onEditEnrollment) return;

        onEditEnrollment(editingEnrollmentId, {
            gradeLevel: editForm.gradeLevel,
            campus: editForm.campus,
            status: editForm.status,
            startDate: editForm.startDate,
            endDate: editForm.endDate,
            daysAssigned: editForm.daysAssigned,
            creditDays: editForm.creditDays,
            sped504: editForm.sped504,
            drgOffense: editForm.drgOffense,
            comments: editForm.comments
        });

        setEditingEnrollmentId(null);
        setEditForm(null);
    };

    const handleCancel = () => {
        setEditingEnrollmentId(null);
        setEditForm(null);
    };

    if (enrollments.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                    Enrollment History
                </h3>
                <p className="text-slate-500 dark:text-slate-400">No enrollments found.</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 print:shadow-none print:border print:border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                    Enrollment History
                    <span className="ml-2 text-sm font-normal text-slate-500">
                        ({enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''})
                    </span>
                </h3>

                <div className="space-y-3">
                    {enrollments.map((enrollment, index) => {
                        const isSelected = enrollment.id === selectedEnrollmentId;
                        const isCurrent = index === 0;

                        return (
                            <div
                                key={enrollment.id}
                                onClick={() => onSelectEnrollment(enrollment.id)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer select-none ${isSelected
                                    ? 'border-brand bg-brand/5 dark:bg-brand/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-brand/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                                            {enrollment.schoolYear}
                                        </span>
                                        {isCurrent && (
                                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={enrollment.status} />
                                        {onEditEnrollment && (
                                            <button
                                                onClick={(e) => handleEditClick(e, enrollment)}
                                                className="p-1.5 text-slate-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors print:hidden"
                                                title="Edit enrollment"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">Grade: </span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {enrollment.gradeLevel}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">Days: </span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {enrollment.daysAttended} / {enrollment.daysAssigned}
                                        </span>
                                    </div>
                                    <div className="col-span-2 mt-1">
                                        <span className="text-slate-500 dark:text-slate-400">Registration: </span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {formatDateForDisplay(enrollment.startDate)}
                                        </span>
                                    </div>
                                    {enrollment.endDate && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500 dark:text-slate-400">Exit: </span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                                {formatDateForDisplay(enrollment.endDate)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Show remaining days and projected release for active enrollments */}
                                {enrollment.status === 'Active' && enrollment.daysRemaining > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Remaining:</span>
                                        <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                                            {enrollment.daysRemaining} days
                                        </span>
                                        <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
                                        <span className="text-slate-500 dark:text-slate-400">Projected:</span>
                                        <span className="ml-1 font-medium text-slate-700 dark:text-slate-200">
                                            {enrollment.projectedReleaseDate}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Edit Modal */}
            {editingEnrollmentId && editForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                Edit Enrollment
                            </h3>
                            <button
                                onClick={handleCancel}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Date Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Registration Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.startDate}
                                        onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Exit Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.endDate}
                                        onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Status
                                </label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StudentStatus })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                >
                                    <option value={StudentStatus.Active}>Active</option>
                                    <option value={StudentStatus.Completed}>Completed</option>
                                    <option value={StudentStatus.Withdrawn}>Withdrawn</option>
                                </select>
                            </div>

                            {/* Grade & Campus */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Grade Level
                                    </label>
                                    <select
                                        value={editForm.gradeLevel}
                                        onChange={(e) => setEditForm({ ...editForm, gradeLevel: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                    >
                                        {['6', '7', '8', '9', '10', '11', '12'].map(g => (
                                            <option key={g} value={g}>Grade {g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Campus
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.campus}
                                        onChange={(e) => setEditForm({ ...editForm, campus: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Days */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Days Assigned
                                    </label>
                                    <input
                                        type="number"
                                        value={editForm.daysAssigned}
                                        onChange={(e) => setEditForm({ ...editForm, daysAssigned: parseInt(e.target.value) || 0 })}
                                        min={1}
                                        max={365}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Credit Days
                                    </label>
                                    <input
                                        type="number"
                                        value={editForm.creditDays}
                                        onChange={(e) => setEditForm({ ...editForm, creditDays: parseInt(e.target.value) || 0 })}
                                        min={0}
                                        max={365}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* SPED & DRG */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        SPED/504
                                    </label>
                                    <select
                                        value={editForm.sped504}
                                        onChange={(e) => setEditForm({ ...editForm, sped504: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                    >
                                        <option value="None">None</option>
                                        <option value="SPED">SPED</option>
                                        <option value="504">504</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        DRG Offense
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.drgOffense}
                                        onChange={(e) => setEditForm({ ...editForm, drgOffense: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Comments */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Comments
                                </label>
                                <textarea
                                    value={editForm.comments}
                                    onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                                    rows={3}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-md font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
