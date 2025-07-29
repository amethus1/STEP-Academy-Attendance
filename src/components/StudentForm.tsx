import React, { useState, useEffect } from 'react';
import { Student, StudentStatus } from '../types';
import { useAttendance } from '../context/AttendanceContext';
import Button from './ui/Button';

interface Props {
  onClose: () => void;
  studentToEdit?: Student;
}

const StudentForm: React.FC<Props> = ({ onClose, studentToEdit }) => {
  const { addStudent, updateStudent, enrichedStudents } = useAttendance();

  const [form, setForm] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    campus: '',
    gradeLevel: '',
    sped504: '',
    drg: '',
    creditDays: '0',
    entryDate: new Date().toISOString().split('T')[0],
    registrationDate: new Date().toISOString().split('T')[0],
    daysAssigned: '90',
    status: StudentStatus.Active,
    comments: '',
  });
  const [extras, setExtras] = useState<{ key: string; value: string }[]>([]);
  const [idErr, setIdErr] = useState('');

  /* Fill form when editing */
  useEffect(() => {
    if (studentToEdit) {
      setForm({
        studentId: studentToEdit.studentId,
        firstName: studentToEdit.firstName,
        lastName: studentToEdit.lastName,
        campus: studentToEdit.campus || '',
        gradeLevel: studentToEdit.gradeLevel || '',
        sped504: studentToEdit.sped504 || '',
        drg: studentToEdit.drg || '',
        creditDays: String(studentToEdit.creditDays || 0),
        entryDate: studentToEdit.entryDate,
        registrationDate: studentToEdit.registrationDate,
        daysAssigned: String(studentToEdit.daysAssigned),
        status: studentToEdit.status,
        comments: studentToEdit.comments || '',
      });
      const extraArr = Object.entries(studentToEdit.customFields || {}).map(
        ([key, value]) => ({ key, value })
      );
      setExtras(extraArr);
    }
  }, [studentToEdit]);

  const change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'studentId') setIdErr('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    /* ID unique check */
    const isEditing = !!studentToEdit;
    const originalId = studentToEdit?.studentId.toLowerCase() || '';
    const exists = enrichedStudents.some(
      s =>
        s.studentId.toLowerCase() === form.studentId.toLowerCase() &&
        form.studentId.toLowerCase() !== originalId
    );
    if (exists) return setIdErr('This Student ID is already in use.');
    if (!form.studentId.trim()) return setIdErr('Student ID is required.');

    const data: Student = {
      ...form,
      daysAssigned: parseInt(form.daysAssigned, 10),
      creditDays: parseInt(form.creditDays, 10) || 0,
      customFields: extras.reduce(
        (acc, { key, value }) => (
          key.trim() ? { ...acc, [key.trim()]: value } : acc
        ),
        {}
      ),
    };

    isEditing
      ? updateStudent(studentToEdit!.studentId, data)
      : addStudent(data);

    onClose();
  };

  const input =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600';
  const label = 'block text-sm font-medium dark:text-gray-300';

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* ID */}
      <div>
        <label className={label}>Student&nbsp;ID</label>
        <input
          name="studentId"
          value={form.studentId}
          onChange={change}
          required
          className={input}
        />
        {idErr && <p className="text-red-500 text-xs mt-1">{idErr}</p>}
      </div>

      {/* names */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>First&nbsp;Name</label>
          <input
            name="firstName"
            value={form.firstName}
            onChange={change}
            required
            className={input}
          />
        </div>
        <div>
          <label className={label}>Last&nbsp;Name</label>
          <input
            name="lastName"
            value={form.lastName}
            onChange={change}
            required
            className={input}
          />
        </div>
      </div>

      {/* extra fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Campus</label>
          <input name="campus" value={form.campus} onChange={change} className={input} />
        </div>
        <div>
          <label className={label}>Grade&nbsp;Level</label>
          <input name="gradeLevel" value={form.gradeLevel} onChange={change} className={input} />
        </div>
        <div>
          <label className={label}>SPED/504</label>
          <input name="sped504" value={form.sped504} onChange={change} className={input} />
        </div>
        <div>
          <label className={label}>DRG</label>
          <input name="drg" value={form.drg} onChange={change} className={input} />
        </div>
      </div>

      {/* custom fields */}
      <div className="space-y-2">
        {extras.map((f, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2 items-center">
            <input
              placeholder="Field name"
              value={f.key}
              onChange={e =>
                setExtras(prev => {
                  const arr = [...prev];
                  arr[idx] = { ...arr[idx], key: e.target.value };
                  return arr;
                })
              }
              className={input}
            />
            <input
              placeholder="Value"
              value={f.value}
              onChange={e =>
                setExtras(prev => {
                  const arr = [...prev];
                  arr[idx] = { ...arr[idx], value: e.target.value };
                  return arr;
                })
              }
              className={input}
            />
            <button
              type="button"
              className="text-sm text-red-500"
              onClick={() =>
                setExtras(prev => prev.filter((_, i) => i !== idx))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setExtras(prev => [...prev, { key: '', value: '' }])}
        >
          Add Custom Field
        </Button>
      </div>

      <div>
        <label className={label}>Credit&nbsp;Days</label>
        <input
          type="number"
          min="0"
          name="creditDays"
          value={form.creditDays}
          onChange={change}
          className={input}
        />
      </div>

      {/* dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Registration&nbsp;Date</label>
          <input
            type="date"
            name="registrationDate"
            value={form.registrationDate}
            onChange={change}
            required
            className={input}
          />
        </div>
        <div>
          <label className={label}>Entry&nbsp;Date</label>
          <input
            type="date"
            name="entryDate"
            value={form.entryDate}
            onChange={change}
            required
            className={input}
          />
        </div>
      </div>

      {/* days */}
      <div>
        <label className={label}>Days&nbsp;Assigned</label>
        <input
          type="number"
          name="daysAssigned"
          min="1"
          value={form.daysAssigned}
          onChange={change}
          required
          className={input}
        />
      </div>

      {/* comments */}
      <div>
        <label className={label}>Comments</label>
        <textarea
          name="comments"
          rows={3}
          value={form.comments}
          onChange={change}
          className={input}
        />
      </div>

      {/* status */}
      <div>
        <label className={label}>Status</label>
        <select
          name="status"
          value={form.status}
          onChange={change}
          className={input}
        >
          {Object.values(StudentStatus).map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{studentToEdit ? 'Update' : 'Add'} Student</Button>
      </div>
    </form>
  );
};

export default StudentForm;