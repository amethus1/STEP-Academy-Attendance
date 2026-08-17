import React from 'react';
import { Student } from '../../../types';

interface StudentPersonalDetailsProps {
    formData: Student;
    errors: Record<string, string>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

// Adjust to match district reporting categories if needed; stored as free text
// so an unlisted value entered via import is preserved rather than dropped.
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];

export const StudentPersonalDetails: React.FC<StudentPersonalDetailsProps> = ({ formData, errors, onChange }) => {
    return (
        <>
            <div className="md:col-span-2">
                <label htmlFor="studentNumber" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Student ID</label>
                <input type="text" name="studentNumber" value={formData.studentNumber} onChange={onChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.studentNumber ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.studentNumber && <p className="text-red-500 text-xs mt-1">{errors.studentNumber}</p>}
            </div>
            <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={onChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.firstName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={onChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.lastName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
            <div>
                <label htmlFor="dob" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Date of Birth</label>
                <input type="date" id="dob" name="dob" value={formData.dob} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
                <label htmlFor="gender" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Gender</label>
                <select id="gender" name="gender" value={formData.gender} onChange={onChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    <option value="">Not specified</option>
                    {/* Keep a value that came from an import even if it is not a listed option. */}
                    {formData.gender && !GENDER_OPTIONS.includes(formData.gender) && (
                        <option value={formData.gender}>{formData.gender}</option>
                    )}
                    {GENDER_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
            </div>
        </>
    );
};
