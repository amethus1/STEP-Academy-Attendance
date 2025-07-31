import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Student, StudentStatus, Presence } from '../../types';
import { calculateProjectedReleaseDate, getDaysAttended, toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { StudentFormModal } from '../common/StudentFormModal';
import { AttendanceCalendar } from '../common/AttendanceCalendar';
import { PencilIcon, PrinterIcon, UserCircleIcon, PhoneIcon } from '../icons/Icons';

const StatCard: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg text-center shadow-sm print:shadow-none print:border print:border-slate-200">
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
  </div>
);

const ContactInfoCard: React.FC<{student: Student}> = ({ student }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Contact Information</h3>
       <div className="space-y-4 text-sm">
            <div>
               <dt className="font-semibold text-slate-600 dark:text-slate-400">Guardian</dt>
               <dd className="text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-1">
                <span>{student.guardianName || 'N/A'}</span>
                {student.guardianPhone && <span className="flex items-center gap-1 text-slate-500"><PhoneIcon className="h-4 w-4" /> {student.guardianPhone}</span>}
                </dd>
           </div>
           <div>
               <dt className="font-semibold text-slate-600 dark:text-slate-400">Emergency Contact</dt>
               <dd className="text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-1">
                <span>{student.emergencyContactName || 'N/A'}</span>
                {student.emergencyContactPhone && <span className="flex items-center gap-1 text-slate-500"><PhoneIcon className="h-4 w-4" /> {student.emergencyContactPhone}</span>}
                </dd>
           </div>
       </div>
    </div>
)


export const StudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { students, attendance, holidays, customFieldDefinitions, updateStudent, loading } = useAppData();
  const { settings } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectionMethod, setProjectionMethod] = useState<'entryDate' | 'today'>('today');

  const student = useMemo(
    () => students.find(s =>
      s.id === studentId &&
      s.registrationDate >= settings.schoolYearStartDate &&
      s.registrationDate <= settings.schoolYearEndDate
    ),
    [students, studentId, settings.schoolYearStartDate, settings.schoolYearEndDate]
  );

  if (loading) return <div className="text-center p-8">Loading student data...</div>;
  if (!student) return <div className="text-center p-8 text-rose-500 font-bold">Student not found.</div>;

  const daysAttended = getDaysAttended(student.id, attendance);
  const creditDays = student.creditDays || 0;
  const daysRemaining = Math.max(0, student.daysAssigned - daysAttended - creditDays);
  
  const projectionStartDate = projectionMethod === 'today' ? toISODateString(new Date()) : student.entryDate;
  const projectedReleaseDateISO = calculateProjectedReleaseDate(student, attendance, holidays, projectionStartDate);
  const projectedReleaseDate = projectedReleaseDateISO !== 'N/A' && projectedReleaseDateISO !== 'Completed' ? formatDateForDisplay(projectedReleaseDateISO) : projectedReleaseDateISO;
  
  const handlePrint = () => {
    window.print();
  };

  const customFields = customFieldDefinitions
      .map(def => ({...def, value: student.customFields ? student.customFields[def.id] : undefined}))
      .filter(field => field.value !== undefined && field.value !== '');

  const studentAttendance = attendance.filter(a => a.studentId === student.id);

  return (
    <>
    <div className="space-y-6 printable-content">
      <StudentFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={updateStudent} studentToEdit={student} existingIds={[]} customFieldDefinitions={customFieldDefinitions} />

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {student.photoUrl ? <img src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} className="w-full h-full object-cover" /> : <UserCircleIcon className="w-20 h-20 text-slate-400" />}
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{student.firstName} {student.lastName}</h2>
                    <p className="text-slate-500 dark:text-slate-400">ID: {student.id}</p>
                     <p className="text-slate-500 dark:text-slate-400">Status: <span className="font-semibold">{student.status}</span></p>
                </div>
            </div>
            <div className="flex gap-2 print:hidden">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                    <PrinterIcon /> Print
                </button>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                    <PencilIcon /> Edit
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard label="Days Attended" value={daysAttended} />
        <StatCard label="Days Remaining" value={daysRemaining} />
        <StatCard label="Entry Date" value={formatDateForDisplay(student.entryDate)} />
        <StatCard label="Projected Release" value={projectedReleaseDate} />
      </div>

       <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-center items-center gap-4 print:hidden">
            <span className="text-sm font-medium">Projection Method:</span>
           <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button onClick={() => setProjectionMethod('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${projectionMethod === 'today' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>From Today</button>
              <button onClick={() => setProjectionMethod('entryDate')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${projectionMethod === 'entryDate' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>From Entry</button>
           </div>
       </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
            <AttendanceCalendar attendanceRecords={studentAttendance} holidays={holidays} entryDateStr={student.entryDate} registrationDateStr={student.registrationDate} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Comments</h3>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm">{student.comments || "No comments."}</p>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Details</h3>
               <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                   <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">Campus</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.campus || 'N/A'}</dd>
                   </div>
                   <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">Grade Level</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.gradeLevel || 'N/A'}</dd>
                   </div>
                    <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">SPED/504</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.sped504 || 'N/A'}</dd>
                   </div>
                   <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">DRG Offense</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.drgOffense || 'N/A'}</dd>
                   </div>
                   <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">Credit Days</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.creditDays || 0}</dd>
                   </div>
               </dl>
            </div>

            <ContactInfoCard student={student} />

            {customFields.length > 0 &&
                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Additional Info</h3>
                   <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                       {customFields.map(field => (
                           <div key={field.id}>
                               <dt className="font-semibold text-slate-600 dark:text-slate-400">{field.name}</dt>
                               <dd className="text-slate-800 dark:text-slate-200">{String(field.value)}</dd>
                           </div>
                       ))}
                   </dl>
                </div>
            }
        </div>
      </div>
    </div>
    </>
  );
};