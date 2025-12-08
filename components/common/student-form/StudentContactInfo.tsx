import React from 'react';
import { Student } from '../../../types';

interface StudentContactInfoProps {
    formData: Student;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StudentContactInfo: React.FC<StudentContactInfoProps> = ({ formData, onChange }) => {
    return (
        <div className="md:col-span-3 border-t pt-4 mt-4 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <h4 className="md:col-span-2 text-lg font-semibold text-slate-700 dark:text-slate-200">Contact Information</h4>
            <div>
                <label htmlFor="guardianName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Guardian Name</label>
                <input type="text" name="guardianName" value={formData.guardianName} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="guardianPhone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Guardian Phone</label>
                <input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="emergencyContactName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Emergency Contact</label>
                <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Emergency Phone</label>
                <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
        </div>
    );
};
