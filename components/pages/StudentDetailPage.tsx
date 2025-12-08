import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useStudentDetails, useUpdateStudent, useUpdateEnrollment, useCreateStudent, useStudentEnrollments } from '../../hooks/useStudents';
import { StudentProgressReport } from '../reports/StudentProgressReport';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { useSettings } from '../../hooks/useSettings';
import { useHolidays, useStudentAttendanceWithComments } from '../../hooks/useAttendance';
import { Student, StudentStatus, CustomFieldDefinition } from '../../types';
import { toISODateString, formatDateForDisplay, getSchoolYearFromDate } from '../../services/dateUtils';
import { calculateDaysRemaining, calculateProjectedReleaseDate } from '../../services/studentLogic';
import { mapDBHolidaysToHolidays, mapEnrollmentToUI, EnrollmentUI } from '../../services/mappers';
import { StudentFormModal } from '../common/StudentFormModal';
import { AttendanceCalendar } from '../common/AttendanceCalendar';
import { PrintOptionsModal, PrintOptions } from '../common/PrintOptionsModal';
import { EnrollmentHistorySection } from './EnrollmentHistorySection';
import { PencilIcon, PrinterIcon, UserCircleIcon, PhoneIcon, ArrowPathIcon } from '../icons/Icons';
import { DBStudent, DBEnrollment } from '../../db/queries';
import { AttendanceList } from '../student/AttendanceList';

const StatCard: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg text-center shadow-sm print:shadow-none print:border print:border-slate-200">
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
  </div>
);

const ContactInfoCard: React.FC<{ student: Student }> = ({ student }) => (
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
);

const DailyNotesSection: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { data: notesRecords = [], isLoading } = useStudentAttendanceWithComments(studentId);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Daily Notes</h3>
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (notesRecords.length === 0) {
    return null; // Don't show section if no notes
  }

  const getPresenceBadge = (presence: string) => {
    switch (presence) {
      case 'Present':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Present</span>;
      case 'Absent':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Absent</span>;
      case 'Tardy':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Tardy</span>;
      case 'Excused':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Excused</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">{presence}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Daily Notes</h3>
      <div className="space-y-3">
        {notesRecords.map((record) => (
          <div key={record.id} className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex-shrink-0 text-sm">
              <div className="font-medium text-slate-700 dark:text-slate-200">{formatDateForDisplay(record.date)}</div>
              <div className="mt-1">{getPresenceBadge(record.presence)}</div>
            </div>
            <div className="flex-1 text-sm text-slate-600 dark:text-slate-300">
              {record.comment}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  // Use new hook
  const { data: studentDetails, isLoading: loading } = useStudentDetails(studentId || '');
  const { settings } = useSettings();
  const { data: holidays = [] } = useHolidays();
  const { data: schoolYears = [] } = useSchoolYears();

  const { mutate: updateProfile } = useUpdateStudent();
  const { mutate: updateEnrollment } = useUpdateEnrollment();
  const { mutateAsync: createStudent } = useCreateStudent();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReenrollModal, setShowReenrollModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions | null>(null);
  const [projectionMethod, setProjectionMethod] = useState<'entryDate' | 'today'>('today');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const shouldPrintRef = useRef(false);

  // Controlled state for re-enroll form
  const [reenrollEntryDate, setReenrollEntryDate] = useState(toISODateString(new Date()));
  const [reenrollGrade, setReenrollGrade] = useState('9');
  const [reenrollDays, setReenrollDays] = useState(45);

  const queryClient = useQueryClient();

  const customFieldDefinitions = settings.customFieldDefinitions || [];

  // Logic to determine "Active" View
  const { activeEnrollment, uiStudent, relatedEnrollments, studentAttendance } = useMemo(() => {
    if (!studentDetails) return { activeEnrollment: null, uiStudent: null, relatedEnrollments: [], studentAttendance: [] };

    const { student: profile, enrollments, attendance } = studentDetails;

    // Default to latest enrollment (first in list as it is sorted DESC by start_date)
    // IMPROVEMENT: If we had current school year from settings context easily, we could prefer that.
    // For now, latest is a safe default for a detail page.
    const active = enrollments[0];

    if (!active) return { activeEnrollment: null, uiStudent: null, relatedEnrollments: [], studentAttendance: [] };

    // Parse custom fields
    let parsedCustomFields = {};
    try {
      parsedCustomFields = profile.custom_fields ? JSON.parse(profile.custom_fields) : {};
    } catch (e) {
      console.error("Failed to parse", e);
    }

    // Map DB to UI Student
    // We define a composite object
    const student: Student = {
      id: profile.id, // Profile ID
      studentNumber: profile.student_number || profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,

      // Enrollment specific
      campus: active.campus || '',
      gradeLevel: active.grade_level,
      status: active.status as StudentStatus,
      entryDate: active.start_date,
      registrationDate: active.start_date, // or keep separate if needed?
      exitDate: active.end_date || '',
      daysAssigned: active.days_assigned,
      creditDays: active.credit_days,
      sped504: active.sped_504 || 'None',
      drgOffense: active.drg_offense || '',
      comments: active.comments || '',

      // Profile specific
      photoUrl: profile.photo_url,
      guardianName: profile.guardian_name || '',
      guardianPhone: profile.guardian_phone || '',
      emergencyContactName: profile.emergency_contact_name || '',
      emergencyContactPhone: profile.emergency_contact_phone || '',
      customFields: parsedCustomFields,
      masterId: profile.id // Self ref
    };

    const related = enrollments.filter(e => e.id !== active.id).map(e => ({
      ...e,
      // We might need formatted display data
      id: e.id,
      registrationDate: e.start_date
    }));

    // Filter attendance for this enrollment by date range instead of strict ID match
    // This handles cases where records might be linked to a legacy enrollment ID but clearly belong to this period
    const att = attendance.filter(a => a.date >= active.start_date && (!active.end_date || a.date <= active.end_date));

    return { activeEnrollment: active, uiStudent: student, relatedEnrollments: related, studentAttendance: att };
  }, [studentDetails]);

  // Map all enrollments to UI format for the EnrollmentHistorySection
  const enrollmentHistory: EnrollmentUI[] = useMemo(() => {
    if (!studentDetails) return [];
    const holidaysUIForMapper = mapDBHolidaysToHolidays(holidays);
    return studentDetails.enrollments.map(enrollment =>
      mapEnrollmentToUI(enrollment, holidaysUIForMapper)
    );
  }, [studentDetails, holidays]);

  // Select the first enrollment by default if none selected
  useMemo(() => {
    if (enrollmentHistory.length > 0 && !selectedEnrollmentId) {
      setSelectedEnrollmentId(enrollmentHistory[0].id);
    }
  }, [enrollmentHistory, selectedEnrollmentId]);

  // Filter attendance based on selected enrollment
  const filteredAttendance = useMemo(() => {
    if (!studentDetails || !selectedEnrollmentId) return studentAttendance;

    const selectedEnrollment = studentDetails.enrollments.find(e => e.id === selectedEnrollmentId);
    if (!selectedEnrollment) return studentAttendance;

    // Filter attendance to the selected enrollment's date range
    return studentDetails.attendance.filter(a =>
      a.date >= selectedEnrollment.start_date &&
      (!selectedEnrollment.end_date || a.date <= selectedEnrollment.end_date)
    );
  }, [studentDetails, selectedEnrollmentId, studentAttendance]);

  // Get entry date for the selected enrollment (for calendar display)

  const selectedEnrollment = useMemo(() => {
    if (!studentDetails || !selectedEnrollmentId) return activeEnrollment;
    return studentDetails.enrollments.find(e => e.id === selectedEnrollmentId) || activeEnrollment;
  }, [studentDetails, selectedEnrollmentId, activeEnrollment]);

  // Effect to trigger print after printOptions state is updated
  // Must be before early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (shouldPrintRef.current && printOptions) {
      shouldPrintRef.current = false;

      // Use requestAnimationFrame to ensure DOM has painted
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          try {
            const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
            const webviewWindow = getCurrentWebviewWindow();
            await (webviewWindow as any).print();
          } catch (e) {
            console.warn("Tauri print failed, trying window.print()", e);
            window.print();
          }

          // Don't reset options automatically to avoid race condition with print dialog
          // setPrintOptions(null);
        });
      });
    }
  }, [printOptions]);

  if (loading) return <div className="text-center p-8">Loading student data...</div>;
  if (!uiStudent || !activeEnrollment) return <div className="text-center p-8 text-rose-500 font-bold">Student not found.</div>;

  const displayEntryDate = selectedEnrollment?.start_date || uiStudent.entryDate || '';

  const daysAttended = filteredAttendance.filter(a => a.presence === 'Present').length;
  const creditDays = uiStudent.creditDays || 0;
  const daysRemaining = calculateDaysRemaining(uiStudent.daysAssigned, daysAttended, creditDays);

  // Convert DB holidays to UI format using centralized mapper
  const holidaysUI = mapDBHolidaysToHolidays(holidays);

  const projectionStartDate = projectionMethod === 'today' ? toISODateString(new Date()) : displayEntryDate;
  const projectedReleaseDateISO = calculateProjectedReleaseDate(daysRemaining, holidaysUI, projectionStartDate, uiStudent.status);
  const projectedReleaseDate = projectedReleaseDateISO !== 'N/A' && projectedReleaseDateISO !== 'Completed' ? formatDateForDisplay(projectedReleaseDateISO) : projectedReleaseDateISO;

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const executePrint = (options: PrintOptions) => {
    setPrintOptions(options);
    shouldPrintRef.current = true;
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    // 1. Update Profile
    const profileUpdates: DBStudent = {
      id: updatedStudent.id,
      student_number: updatedStudent.studentNumber || null,
      first_name: updatedStudent.firstName,
      last_name: updatedStudent.lastName,
      dob: null,
      guardian_name: updatedStudent.guardianName,
      guardian_phone: updatedStudent.guardianPhone,
      emergency_contact_name: updatedStudent.emergencyContactName,
      emergency_contact_phone: updatedStudent.emergencyContactPhone,
      photo_url: updatedStudent.photoUrl,
      custom_fields: JSON.stringify(updatedStudent.customFields)
    };
    updateProfile(profileUpdates);

    // 2. Update Enrollment
    const enrollmentUpdates: Partial<DBEnrollment> = {
      grade_level: updatedStudent.gradeLevel,
      campus: updatedStudent.campus,
      status: updatedStudent.status,
      start_date: updatedStudent.entryDate,
      end_date: updatedStudent.exitDate || null,
      days_assigned: updatedStudent.daysAssigned,
      credit_days: updatedStudent.creditDays,
      sped_504: updatedStudent.sped504,
      drg_offense: updatedStudent.drgOffense,
      comments: updatedStudent.comments
    };
    updateEnrollment({
      id: activeEnrollment.id,
      updates: enrollmentUpdates,
      schoolYear: activeEnrollment.school_year
    });

    setIsModalOpen(false);
  };

  const handleEditEnrollment = (enrollmentId: string, updates: Partial<import('../../services/mappers').EnrollmentUI>) => {
    // Map UI fields to DB fields
    const dbUpdates: Partial<DBEnrollment> = {};

    if (updates.gradeLevel !== undefined) dbUpdates.grade_level = updates.gradeLevel;
    if (updates.campus !== undefined) dbUpdates.campus = updates.campus;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;
    if (updates.daysAssigned !== undefined) dbUpdates.days_assigned = updates.daysAssigned;
    if (updates.creditDays !== undefined) dbUpdates.credit_days = updates.creditDays;
    if (updates.sped504 !== undefined) dbUpdates.sped_504 = updates.sped504;
    if (updates.drgOffense !== undefined) dbUpdates.drg_offense = updates.drgOffense;
    if (updates.comments !== undefined) dbUpdates.comments = updates.comments;

    // Find the enrollment to get its current school_year
    const enrollment = studentDetails?.enrollments.find(e => e.id === enrollmentId);
    if (!enrollment) return;

    // If the registration date changed, recalculate the school year
    let schoolYearToUse = enrollment.school_year;
    if (updates.startDate && updates.startDate !== enrollment.start_date) {
      schoolYearToUse = getSchoolYearFromDate(new Date(updates.startDate + 'T12:00:00Z'), schoolYears);
      dbUpdates.school_year = schoolYearToUse;
    }

    updateEnrollment({
      id: enrollmentId,
      updates: dbUpdates,
      schoolYear: schoolYearToUse,
      studentId: studentId || uiStudent?.id
    });

    toast.success('Enrollment updated successfully');
  };

  const customFields = customFieldDefinitions
    .map(def => ({ ...def, value: uiStudent.customFields ? uiStudent.customFields[def.id] : undefined }))
    .filter(field => field.value !== undefined && field.value !== '');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 printable-content">
      {/* Screen Layout - Hidden on Print */}
      <div className="print:hidden space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StudentFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleUpdateStudent}
          studentToEdit={uiStudent}
          customFieldDefinitions={customFieldDefinitions}
          existingStudents={[]}
        />

        <PrintOptionsModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          onPrint={executePrint}
          studentName={`${uiStudent.firstName} ${uiStudent.lastName}`}
        />

        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {uiStudent.photoUrl ? <img src={uiStudent.photoUrl} alt={`${uiStudent.firstName} ${uiStudent.lastName}`} className="w-full h-full object-cover" /> : <UserCircleIcon className="w-20 h-20 text-slate-400" />}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{uiStudent.firstName} {uiStudent.lastName}</h2>
                <p className="text-slate-500 dark:text-slate-400">ID: {uiStudent.studentNumber || uiStudent.id}</p>
                <p className="text-slate-500 dark:text-slate-400">Status: <span className="font-semibold">{uiStudent.status}</span></p>
                {uiStudent.exitDate && (
                  <p className="text-slate-500 dark:text-slate-400">
                    {uiStudent.status === StudentStatus.Withdrawn ? 'Withdrawn' : 'Completed'}: {formatDateForDisplay(uiStudent.exitDate)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                <PrinterIcon /> Print
              </button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                <PencilIcon /> Edit
              </button>
              {(uiStudent.status === StudentStatus.Withdrawn || uiStudent.status === StudentStatus.Completed) && (
                <button
                  onClick={() => setShowReenrollModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-sm"
                >
                  <ArrowPathIcon className="h-5 w-5" /> Re-enroll
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 stats-grid"
          data-print-hide={printOptions && !printOptions.includeStats ? "true" : undefined}
        >
          <StatCard label="Days Attended" value={daysAttended} />
          <StatCard label="Days Remaining" value={daysRemaining} />
          <StatCard label="Entry Date" value={formatDateForDisplay(uiStudent.entryDate)} />
          <StatCard label="Projected Release" value={projectedReleaseDate} />
        </div>

        {/* Projection Method Toggle */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-center items-center gap-4 print:hidden">
          <span className="text-sm font-medium">Projection Method:</span>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button onClick={() => setProjectionMethod('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${projectionMethod === 'today' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>From Today</button>
            <button onClick={() => setProjectionMethod('entryDate')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${projectionMethod === 'entryDate' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>From Entry</button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Calendar */}
          <div className="xl:col-span-2 space-y-6">
            <div data-print-hide={printOptions && !printOptions.includeCalendar ? "true" : undefined}>
              <AttendanceCalendar attendanceRecords={filteredAttendance} holidays={holidays} entryDateStr={displayEntryDate} registrationDateStr={uiStudent.registrationDate} />
            </div>
            <div
              className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200"
              data-print-hide={printOptions && !printOptions.includeComments ? "true" : undefined}
            >
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Comments</h3>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm">{uiStudent.comments || "No comments."}</p>
            </div>

            <div data-print-hide={printOptions && !printOptions.includeAttendanceLog ? "true" : undefined}>
              <AttendanceList attendance={filteredAttendance} printColumns={printOptions?.attendanceLogColumns || 1} />
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <div
              className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200"
              data-print-hide={printOptions && !printOptions.includeDetails ? "true" : undefined}
            >
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Details</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-slate-600 dark:text-slate-400">Campus</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{uiStudent.campus || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600 dark:text-slate-400">Grade Level</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{uiStudent.gradeLevel || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600 dark:text-slate-400">SPED/504</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{uiStudent.sped504 || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600 dark:text-slate-400">DRG Offense</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{uiStudent.drgOffense || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600 dark:text-slate-400">Credit Days</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{uiStudent.creditDays || 0}</dd>
                </div>
              </dl>
            </div>

            {/* Enrollment History - Interactive - Hide in print */}
            {enrollmentHistory.length > 0 && (
              <div className="print:hidden">
                <EnrollmentHistorySection
                  enrollments={enrollmentHistory}
                  selectedEnrollmentId={selectedEnrollmentId}
                  onSelectEnrollment={setSelectedEnrollmentId}
                  onEditEnrollment={handleEditEnrollment}
                />
              </div>
            )}

            <div data-print-hide={printOptions && !printOptions.includeContact ? "true" : undefined}>
              <ContactInfoCard student={uiStudent} />
            </div>

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

            {/* Daily Notes Section */}
            <div data-print-hide={printOptions && !printOptions.includeNotes ? "true" : undefined}>
              <DailyNotesSection studentId={studentId!} />
            </div>
          </div>
        </div>

        {/* Re-enroll Modal */}
        {showReenrollModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Re-enroll Student</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Create a new enrollment for <strong>{uiStudent.firstName} {uiStudent.lastName}</strong>
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Entry Date</label>
                  <input
                    type="date"
                    value={reenrollEntryDate}
                    onChange={(e) => setReenrollEntryDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grade Level</label>
                  <select
                    value={reenrollGrade}
                    onChange={(e) => setReenrollGrade(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                  >
                    {['6', '7', '8', '9', '10', '11', '12'].map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Days Assigned</label>
                  <input
                    type="number"
                    value={reenrollDays}
                    onChange={(e) => setReenrollDays(parseInt(e.target.value) || 45)}
                    min={1}
                    max={365}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowReenrollModal(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const schoolYear = getSchoolYearFromDate(new Date(reenrollEntryDate), schoolYears);

                      const profile: DBStudent = {
                        id: uiStudent.id,
                        student_number: uiStudent.studentNumber || null,
                        first_name: uiStudent.firstName,
                        last_name: uiStudent.lastName,
                        dob: null,
                        guardian_name: uiStudent.guardianName,
                        guardian_phone: uiStudent.guardianPhone,
                        emergency_contact_name: uiStudent.emergencyContactName,
                        emergency_contact_phone: uiStudent.emergencyContactPhone,
                        photo_url: uiStudent.photoUrl,
                        custom_fields: JSON.stringify(uiStudent.customFields)
                      };

                      const enrollment: DBEnrollment = {
                        id: crypto.randomUUID(),
                        student_id: uiStudent.id,
                        school_year: schoolYear,
                        start_date: reenrollEntryDate,
                        end_date: null,
                        grade_level: reenrollGrade,
                        campus: uiStudent.campus || '',
                        status: 'Active',
                        sped_504: uiStudent.sped504 || null,
                        drg_offense: uiStudent.drgOffense || null,
                        days_assigned: reenrollDays,
                        credit_days: 0,
                        comments: `Re-enrolled on ${reenrollEntryDate}`
                      };

                      await createStudent({ student: profile, enrollment });
                      toast.success(`${uiStudent.firstName} ${uiStudent.lastName} has been re-enrolled!`);
                      setShowReenrollModal(false);
                      // Invalidate queries to refresh data instead of full page reload
                      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
                      queryClient.invalidateQueries({ queryKey: ['students'] });
                    } catch (e) {
                      console.error('Re-enroll failed:', e);
                      toast.error('Failed to re-enroll student. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md"
                >
                  Re-enroll Student
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Print Report (Visible only in Print) */}
      {printOptions && (
        <StudentProgressReport
          student={uiStudent}
          attendance={filteredAttendance}
          holidays={holidaysUI}
          stats={{
            daysAttended,
            daysRemaining,
            projectedRelease: projectedReleaseDate,
            entryDate: displayEntryDate,
            creditDays
          }}
          options={printOptions}
          customFields={customFields as any}
        />
      )}
    </div>
  );
};
