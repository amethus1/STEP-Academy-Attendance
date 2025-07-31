import React, { useState, useEffect, useRef } from 'react';
import { Student, StudentStatus, CustomFieldDefinition } from '../../types';
import { toISODateString } from '../../services/dateUtils';
import { CameraIcon, UserCircleIcon } from '../icons/Icons';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  studentToEdit?: Student | null;
  existingIds: string[];
  customFieldDefinitions: CustomFieldDefinition[];
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({ isOpen, onClose, onSave, studentToEdit, existingIds, customFieldDefinitions }) => {
  const initialFormState: Student = {
    id: '',
    firstName: '',
    lastName: '',
    registrationDate: toISODateString(new Date()),
    entryDate: toISODateString(new Date()),
    daysAssigned: 0,
    status: StudentStatus.Active,
    comments: '',
    campus: '',
    gradeLevel: '',
    sped504: 'None',
    drgOffense: '',
    creditDays: 0,
    customFields: {},
    photoUrl: null,
    guardianName: '',
    guardianPhone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  };
  
  const [formData, setFormData] = useState<Student>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!studentToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && studentToEdit) {
        setFormData({ ...initialFormState, ...studentToEdit, customFields: studentToEdit.customFields || {} });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [studentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'daysAssigned' || name === 'creditDays') ? parseInt(value, 10) || 0 : value }));
  };
  
  const handleCustomFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [name]: type === 'number' ? parseInt(value, 10) || 0 : value
      }
    }));
  };
  
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL(file.type);
            setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.id.trim()) newErrors.id = 'Student ID is required.';
    if (!isEditMode && existingIds.includes(formData.id.trim())) newErrors.id = 'Student ID must be unique.';
    if (!formData.firstName.trim()) newErrors.firstName = 'First Name is required.';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last Name is required.';
    if (formData.daysAssigned <= 0) newErrors.daysAssigned = 'Assigned days must be positive.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col dark:bg-slate-800">
        <header className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{isEditMode ? 'Edit Student' : 'Add New Student'}</h2>
        </header>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Photo Section */}
            <div className="md:col-span-1 flex flex-col items-center">
              <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />
              <div className="w-40 h-40 rounded-full bg-slate-200 dark:bg-slate-700 mb-2 flex items-center justify-center overflow-hidden">
                {formData.photoUrl ? <img src={formData.photoUrl} alt="Student" className="w-full h-full object-cover" /> : <UserCircleIcon className="w-24 h-24 text-slate-400" />}
              </div>
              <button type="button" onClick={() => photoInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                 <CameraIcon className="h-4 w-4" /> {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
            </div>
            
            {/* Form Fields Section */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="md:col-span-2">
                <label htmlFor="id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Student ID</label>
                <input type="text" name="id" value={formData.id} onChange={handleChange} disabled={isEditMode} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.id ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} ${isEditMode ? 'bg-slate-100 dark:bg-slate-700' : ''}`} />
                {errors.id && <p className="text-red-500 text-xs mt-1">{errors.id}</p>}
              </div>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.firstName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.lastName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label htmlFor="campus" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Campus</label>
                <input type="text" name="campus" value={formData.campus} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="gradeLevel" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Grade Level</label>
                <input type="text" name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="drgOffense" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">DRG Offense</label>
                <input type="text" name="drgOffense" value={formData.drgOffense} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="sped504" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">SPED/504</label>
                <select name="sped504" value={formData.sped504} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                  <option value="None">None</option>
                  <option value="SPED">SPED</option>
                  <option value="504">504</option>
                </select>
              </div>
              <div>
                <label htmlFor="registrationDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Registration Date</label>
                <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="entryDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Entry Date</label>
                <input type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="daysAssigned" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Days Assigned</label>
                <input type="number" name="daysAssigned" value={formData.daysAssigned} onChange={handleChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.daysAssigned ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.daysAssigned && <p className="text-red-500 text-xs mt-1">{errors.daysAssigned}</p>}
              </div>
              <div>
                <label htmlFor="creditDays" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Credit Days</label>
                <input type="number" name="creditDays" value={formData.creditDays} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
            </div>
            {/* Contact & Other Info */}
            <div className="md:col-span-3 border-t pt-4 mt-4 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                <h4 className="md:col-span-2 text-lg font-semibold text-slate-700 dark:text-slate-200">Contact Information</h4>
                <div>
                  <label htmlFor="guardianName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Guardian Name</label>
                  <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                 <div>
                  <label htmlFor="guardianPhone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Guardian Phone</label>
                  <input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                 <div>
                  <label htmlFor="emergencyContactName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Emergency Contact</label>
                  <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                 <div>
                  <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Emergency Phone</label>
                  <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
                </div>
            </div>
            <div className="md:col-span-3">
              <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                {Object.values(StudentStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label htmlFor="comments" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Comments</label>
              <textarea name="comments" value={formData.comments} onChange={handleChange} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"></textarea>
            </div>
            {customFieldDefinitions.length > 0 && <hr className="md:col-span-3 dark:border-slate-700" />}
            {customFieldDefinitions.map(field => (
                 <div key={field.id} className="md:col-span-3">
                     <label htmlFor={field.id} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{field.name}</label>
                     <input
                         type={field.type}
                         name={field.id}
                         value={formData.customFields[field.id] || ''}
                         onChange={handleCustomFieldChange}
                         className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                     />
                 </div>
            ))}
          </div>
        </form>
        <footer className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" onClick={handleSubmit} className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm">Save Student</button>
        </footer>
      </div>
    </div>
  );
};