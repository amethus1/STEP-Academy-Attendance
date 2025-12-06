import React, { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { Student, StudentStatus, CustomFieldDefinition } from '../../types';
import { useDeleteStudent } from '../../hooks/useStudents';
import { toISODateString } from '../../services/dateUtils';
import { CameraIcon, UserCircleIcon, ExclamationTriangleIcon } from '../icons/Icons';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  studentToEdit?: Student | null;
  existingIds?: string[];
  customFieldDefinitions: CustomFieldDefinition[];
  existingStudents: Student[];
}

const studentSchema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  studentNumber: z.string().min(1, 'Student ID is required'),
  daysAssigned: z.number().min(0, 'Days assigned must be positive'),
  exitDate: z.string().optional().refine((val) => {
    return true;
  }),
});

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  studentToEdit,
  customFieldDefinitions,
  existingStudents
}) => {
  const initialFormState: Student = {
    id: '',
    studentNumber: '',
    firstName: '',
    lastName: '',
    registrationDate: toISODateString(new Date()),
    entryDate: toISODateString(new Date()),
    exitDate: '',
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
  const [potentialMatch, setPotentialMatch] = useState<Student | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { mutate: deleteStudent } = useDeleteStudent();

  const handleDelete = () => {
    if (studentToEdit?.id) {
      deleteStudent(studentToEdit.id);
      onClose();
    }
  };

  const isEditMode = !!studentToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && studentToEdit) {
        setFormData({
          ...initialFormState,
          ...studentToEdit,
          studentNumber: studentToEdit.studentNumber || studentToEdit.id,
          customFields: studentToEdit.customFields || {}
        });
      } else {
        const newId = crypto.randomUUID();
        setFormData({ ...initialFormState, id: newId });
      }
      setErrors({});
      setPotentialMatch(null);
    }
  }, [studentToEdit, isOpen]);

  // Check for potential matches when name changes
  useEffect(() => {
    if (!isEditMode && formData.firstName && formData.lastName && formData.firstName.length > 2 && formData.lastName.length > 2) {
      const match = existingStudents.find(s =>
        s.firstName.toLowerCase() === formData.firstName.toLowerCase() &&
        s.lastName.toLowerCase() === formData.lastName.toLowerCase()
      );
      if (match) {
        setPotentialMatch(match);
      } else {
        setPotentialMatch(null);
      }
    }
  }, [formData.firstName, formData.lastName, isEditMode, existingStudents]);

  const handleReEnroll = () => {
    if (!potentialMatch) return;

    const newId = 'SS' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    setFormData(prev => ({
      ...prev,
      id: newId,
      studentNumber: potentialMatch.studentNumber || potentialMatch.id,
      campus: potentialMatch.campus,
      gradeLevel: potentialMatch.gradeLevel,
      sped504: potentialMatch.sped504,
      drgOffense: potentialMatch.drgOffense,
      photoUrl: potentialMatch.photoUrl,
      guardianName: potentialMatch.guardianName,
      guardianPhone: potentialMatch.guardianPhone,
      emergencyContactName: potentialMatch.emergencyContactName,
      emergencyContactPhone: potentialMatch.emergencyContactPhone,
      customFields: potentialMatch.customFields,
      masterId: potentialMatch.masterId || potentialMatch.id
    }));
    setPotentialMatch(null);
  };

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
    try {
      studentSchema.parse(formData);

      const newErrors: Record<string, string> = {};
      if ((formData.status === StudentStatus.Withdrawn || formData.status === StudentStatus.Completed) && !formData.exitDate) {
        newErrors.exitDate = 'Exit Date is required for inactive students.';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return false;
      }

      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const finalData = {
        ...formData,
        studentNumber: formData.studentNumber || formData.id
      };
      onSave(finalData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col dark:bg-slate-800">
        <header className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{isEditMode ? 'Edit Student' : 'Add New Student'}</h2>
        </header>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">

          {/* Re-enrollment Banner */}
          {potentialMatch && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 dark:text-amber-200">Possible Returning Student Found</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  We found a record for <strong>{potentialMatch.firstName} {potentialMatch.lastName}</strong> (ID: {potentialMatch.studentNumber || potentialMatch.id}).
                  Is this the same student returning?
                </p>
                <button
                  type="button"
                  onClick={handleReEnroll}
                  className="px-3 py-1.5 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 text-sm font-semibold rounded-md hover:bg-amber-200 dark:hover:bg-amber-700"
                >
                  Yes, Re-enroll Student
                </button>
              </div>
            </div>
          )}

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
                <label htmlFor="studentNumber" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Student ID</label>
                <input type="text" name="studentNumber" value={formData.studentNumber} onChange={handleChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.studentNumber ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.studentNumber && <p className="text-red-500 text-xs mt-1">{errors.studentNumber}</p>}
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
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
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
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.exitDate ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                  />
                  {errors.exitDate && <p className="text-red-500 text-xs mt-1">{errors.exitDate}</p>}
                </div>
              )}
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

          {isEditMode && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-semibold rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 mr-auto"
            >
              Delete Student
            </button>
          )}

          <button type="submit" onClick={handleSubmit} className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm">Save Student</button>
        </footer>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">⚠️ Delete Student?</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Are you sure you want to <strong>PERMANENTLY</strong> delete this student?
                <br /><br />
                This will remove all their records, attendance, and enrollment history.
                <strong className="text-red-600 dark:text-red-400"> This action CANNOT be undone.</strong>
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDelete();
                  }}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
                >
                  Yes, Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};