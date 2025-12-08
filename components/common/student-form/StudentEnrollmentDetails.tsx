import React from 'react';
import { Student, StudentStatus } from '../../../types';

interface StudentEnrollmentDetailsProps {
    formData: Student;
    errors: Record<string, string>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const StudentEnrollmentDetails: React.FC<StudentEnrollmentDetailsProps> = ({ formData, errors, onChange }) => {
    return (
        <>
            <div>
                <label htmlFor="campus" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Campus</label>
                <input type="text" name="campus" value={formData.campus} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="gradeLevel" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Grade Level</label>
                <input type="text" name="gradeLevel" value={formData.gradeLevel} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="drgOffense" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">DRG Offense</label>
                <input type="text" name="drgOffense" value={formData.drgOffense} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="sped504" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">SPED/504</label>
                <select name="sped504" value={formData.sped504} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    <option value="None">None</option>
                    <option value="SPED">SPED</option>
                    <option value="504">504</option>
                </select>
            </div>
            <div>
                <label htmlFor="registrationDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Registration Date</label>
                <input type="date" name="registrationDate" value={formData.registrationDate} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="entryDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Entry Date</label>
                <input type="date" name="entryDate" value={formData.entryDate} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="daysAssigned" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Days Assigned</label>
                <input type="number" name="daysAssigned" value={formData.daysAssigned} onChange={onChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.daysAssigned ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.daysAssigned && <p className="text-red-500 text-xs mt-1">{errors.daysAssigned}</p>}
            </div>
            <div>
                <label htmlFor="creditDays" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Credit Days</label>
                <input type="number" name="creditDays" value={formData.creditDays} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                        {Object.values(StudentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {(formData.status === StudentStatus.Withdrawn || formData.status === StudentStatus.Completed) && (
                    <div>
                        <label htmlFor="exitDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                            {formData.status === StudentStatus.Withdrawn ? 'Withdrawal Date' : 'Completion Date'}
                        </label>
                        <input
                            type="date"
                            name="exitDate"
                            value={formData.exitDate || ''}
                            onChange={onChange}
                            className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.exitDate ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        />
                        {errors.exitDate && <p className="text-red-500 text-xs mt-1">{errors.exitDate}</p>}
                    </div>
                )}
            </div>
        </>
    );
};
