import React, { useState } from 'react';
import { Student, CustomFieldDefinition } from '../../types';
import { useDeleteStudent } from '../../hooks/useStudents';
import { useStudentForm } from '../../hooks/useStudentForm';
import { ExclamationTriangleIcon } from '../icons/Icons';
import { StudentPhotoUpload } from './student-form/StudentPhotoUpload';
import { StudentPersonalDetails } from './student-form/StudentPersonalDetails';
import { StudentEnrollmentDetails } from './student-form/StudentEnrollmentDetails';
import { StudentContactInfo } from './student-form/StudentContactInfo';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  studentToEdit?: Student | null;
  existingIds?: string[];
  customFieldDefinitions: CustomFieldDefinition[];
  existingStudents: Student[];
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  studentToEdit,
  customFieldDefinitions,
  existingStudents
}) => {
  const {
    formData,
    errors,
    potentialMatch,
    isEditMode,
    handleChange,
    handleCustomFieldChange,
    setPhotoUrl,
    handleReEnroll,
    validate
  } = useStudentForm(studentToEdit, existingStudents, isOpen);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { mutate: deleteStudent } = useDeleteStudent();

  const handleDelete = () => {
    if (studentToEdit?.id) {
      deleteStudent(studentToEdit.id);
      onClose();
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
            <StudentPhotoUpload photoUrl={formData.photoUrl} onPhotoChange={setPhotoUrl} />

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <StudentPersonalDetails formData={formData} errors={errors} onChange={handleChange} />
              <StudentEnrollmentDetails formData={formData} errors={errors} onChange={handleChange} />
            </div>

            <StudentContactInfo formData={formData} onChange={handleChange} />

            {/* Comments */}
            <div className="md:col-span-3">
              <label htmlFor="comments" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Comments</label>
              <textarea name="comments" value={formData.comments} onChange={handleChange} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"></textarea>
            </div>

            {/* Custom Fields */}
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