import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Student, StudentStatus } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { useStudents, useCreateStudent } from '../../hooks/useStudents';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { useActiveSchoolYear } from '../../hooks/useActiveSchoolYear';
import { toast } from 'sonner';
import { DBStudent, DBEnrollment, updateStudentEnrollment } from '../../db/queries';
import { getSchoolYearFromDate } from '../../services/dateUtils';

interface RolloverModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type RolloverAction = 'promote' | 'retain' | 'exit';

interface StudentRolloverState {
    studentId: string;
    firstName: string;
    lastName: string;
    currentGrade: string;
    action: RolloverAction;
    nextGrade: string;
}

export const RolloverModal: React.FC<RolloverModalProps> = ({ isOpen, onClose }) => {
    const { settings, saveSettings } = useSettings();
    const { data: schoolYears = [] } = useSchoolYears();

    // Use the system's active school year
    const activeSchoolYear = useActiveSchoolYear();
    const currentSchoolYear = activeSchoolYear || '2024-2025';

    // Fetch students for the current active year
    const { data: rawStudents = [] } = useStudents(currentSchoolYear);
    const { mutateAsync: createStudent } = useCreateStudent();
    const queryClient = useQueryClient();

    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1: Dates
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [defaultEntryDate, setDefaultEntryDate] = useState('');

    // Step 2: Students
    const [studentStates, setStudentStates] = useState<StudentRolloverState[]>([]);

    const students = useMemo(() => {
        return rawStudents.map(s => ({
            ...s,
            firstName: s.first_name,
            lastName: s.last_name,
            gradeLevel: s.grade_level,
            // ID mapping handled by rawStudents? rawStudents is StudentWithEnrollment.
            // s.id is studentId (Profile). s.enrollmentId is Enrollment.
            id: s.studentId,
            enrollmentId: s.enrollmentId, // Need this to close out old enrollment
            status: s.status as StudentStatus,
            registrationDate: s.start_date, // or use start_date for filtering?
            // Need other fields if creating new student objects
            studentNumber: s.student_number,
            photoUrl: s.photo_url,
            guardianName: s.guardian_name,
            guardianPhone: s.guardian_phone,
            emergencyContactName: s.emergency_contact_name,
            emergencyContactPhone: s.emergency_contact_phone,
            customFields: s.custom_fields ? JSON.parse(s.custom_fields) : {}
        }));
    }, [rawStudents]);

    // Initialize dates based on current settings
    React.useEffect(() => {
        if (isOpen) {
            const currentEnd = new Date(settings.schoolYearEndDate || new Date());
            const nextStart = new Date(currentEnd);
            nextStart.setDate(nextStart.getDate() + 45); // Approx mid-August

            const nextEnd = new Date(nextStart);
            nextEnd.setFullYear(nextEnd.getFullYear() + 1);
            nextEnd.setMonth(5); // June
            nextEnd.setDate(30);

            setNewStartDate(nextStart.toISOString().split('T')[0]);
            setNewEndDate(nextEnd.toISOString().split('T')[0]);
            setDefaultEntryDate(nextStart.toISOString().split('T')[0]);
            setStep(1);
        }
    }, [isOpen, settings.schoolYearEndDate]);

    // Initialize student states
    React.useEffect(() => {
        if (isOpen) {
            // Filter active students from the fetched list
            // rawStudents is already filtered by query for the School Year. 
            // We just need to check status Active.
            const currentYearStudents = students.filter(s => s.status === StudentStatus.Active);

            const states: StudentRolloverState[] = currentYearStudents.map(s => {
                const currentGradeNum = parseInt(s.gradeLevel);
                const isSenior = currentGradeNum === 12;

                return {
                    studentId: s.id,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    currentGrade: s.gradeLevel,
                    action: isSenior ? 'exit' : 'promote',
                    nextGrade: isSenior ? 'Graduated' : String(currentGradeNum + 1)
                };
            });

            // Sort by last name
            states.sort((a, b) => a.lastName.localeCompare(b.lastName));
            setStudentStates(states);
        }
    }, [isOpen, students]);

    const handleActionChange = (index: number, action: RolloverAction) => {
        const newStates = [...studentStates];
        const state = newStates[index];
        state.action = action;

        const currentGradeNum = parseInt(state.currentGrade);

        if (action === 'promote') {
            state.nextGrade = String(currentGradeNum + 1);
        } else if (action === 'retain') {
            state.nextGrade = state.currentGrade;
        } else {
            state.nextGrade = 'N/A';
        }

        setStudentStates(newStates);
    };

    const handleExecuteRollover = async () => {
        try {
            // 1. Prepare data
            const studentsToProcess = studentStates.filter(s => s.action !== 'exit');
            const studentsToExit = studentStates.filter(s => s.action === 'exit');
            const targetSchoolYear = getSchoolYearFromDate(new Date(newStartDate));

            // Calculate exit date as the day before the new year starts
            const exitDate = new Date(newStartDate);
            exitDate.setDate(exitDate.getDate() - 1);
            const exitDateStr = exitDate.toISOString().split('T')[0];

            // 2. Close out ALL old enrollments (both exiting AND promoted/retained students)
            const closeOutPromises = students.map(async (student) => {
                const state = studentStates.find(s => s.studentId === student.id);
                if (!state) return;

                // Determine the final status
                const finalStatus = state.action === 'exit' ? 'Completed' : 'Completed';

                // Update old enrollment: set status to Completed and add exit date
                await updateStudentEnrollment(student.enrollmentId, {
                    status: finalStatus,
                    end_date: exitDateStr
                });
            });

            await Promise.all(closeOutPromises);

            // 3. Create NEW enrollments for promoted/retained students ONLY
            const createPromises = studentsToProcess.map(async (state) => {
                const originalStudent = students.find(s => s.id === state.studentId);
                if (!originalStudent) return;

                // Create Enrollment
                const enrollment: DBEnrollment = {
                    id: crypto.randomUUID(),
                    student_id: originalStudent.id,
                    school_year: targetSchoolYear,
                    start_date: defaultEntryDate,
                    end_date: null, // Active
                    grade_level: state.nextGrade,
                    campus: originalStudent.campus || '',
                    status: 'Active',
                    sped_504: originalStudent.sped504 || null,
                    drg_offense: null,
                    days_assigned: 45,
                    credit_days: 0,
                    comments: `Rollover from ${currentSchoolYear}`
                };

                const profile: DBStudent = {
                    id: originalStudent.id,
                    student_number: originalStudent.studentNumber || null,
                    first_name: originalStudent.firstName,
                    last_name: originalStudent.lastName,
                    dob: null,
                    guardian_name: originalStudent.guardianName,
                    guardian_phone: originalStudent.guardianPhone,
                    emergency_contact_name: originalStudent.emergencyContactName,
                    emergency_contact_phone: originalStudent.emergencyContactPhone,
                    photo_url: originalStudent.photoUrl,
                    custom_fields: JSON.stringify(originalStudent.customFields)
                };

                await createStudent({ student: profile, enrollment });
            });

            await Promise.all(createPromises);

            // 4. Update School Year Settings including active year
            saveSettings({
                schoolYearStartDate: newStartDate,
                schoolYearEndDate: newEndDate,
                activeSchoolYear: targetSchoolYear
            });

            // 5. Invalidate queries so the new school year appears in filters
            await queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
            await queryClient.invalidateQueries({ queryKey: ['students'] });
            await queryClient.invalidateQueries({ queryKey: ['studentEnrollments'] });

            const exitCount = studentsToExit.length;
            toast.success(`Rollover Complete! Enrolled ${studentsToProcess.length} students for ${targetSchoolYear}. ${exitCount} students marked completed.`);
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Rollover failed. Check console for details.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">End of Year Rollover</h2>
                    <p className="text-slate-500 dark:text-slate-400">Step {step} of 3</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800">
                                <p className="text-blue-800 dark:text-blue-200">
                                    This process will create new enrollment records for the upcoming school year.
                                    Student profiles are preserved.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New School Year Start</label>
                                    <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New School Year End</label>
                                    <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Entry Date for Students</label>
                                    <input type="date" value={defaultEntryDate} onChange={e => setDefaultEntryDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <p className="mb-4 text-slate-600 dark:text-slate-300">Review and adjust the action for each student.</p>
                            <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Current Grade</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Next Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                        {studentStates.map((state, idx) => (
                                            <tr key={state.studentId}>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                                    {state.lastName}, {state.firstName}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                                                    {state.currentGrade}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={state.action}
                                                        onChange={(e) => handleActionChange(idx, e.target.value as RolloverAction)}
                                                        className="p-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                    >
                                                        <option value="promote">Promote</option>
                                                        <option value="retain">Retain</option>
                                                        <option value="exit">Exit / Graduate</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-brand dark:text-brand-light">
                                                    {state.nextGrade}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 text-center">
                            <div className="py-8">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Ready to Rollover</h3>
                                <p className="text-slate-600 dark:text-slate-300">
                                    You are about to create <strong>{studentStates.filter(s => s.action !== 'exit').length}</strong> new enrollments
                                    for the <strong>{newStartDate.split('-')[0]}-{newEndDate.split('-')[0]}</strong> school year.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {studentStates.filter(s => s.action === 'promote').length}
                                    </div>
                                    <div className="text-xs text-green-800 dark:text-green-300 uppercase font-bold">Promoted</div>
                                </div>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                        {studentStates.filter(s => s.action === 'retain').length}
                                    </div>
                                    <div className="text-xs text-yellow-800 dark:text-yellow-300 uppercase font-bold">Retained</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                                        {studentStates.filter(s => s.action === 'exit').length}
                                    </div>
                                    <div className="text-xs text-slate-800 dark:text-slate-300 uppercase font-bold">Exiting</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t dark:border-slate-700 flex justify-between">
                    {step === 1 ? (
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
                    ) : (
                        <button onClick={() => setStep(prev => (prev - 1) as any)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md">Back</button>
                    )}

                    {step < 3 ? (
                        <button onClick={() => setStep(prev => (prev + 1) as any)} className="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand-dark">Next</button>
                    ) : (
                        <button onClick={handleExecuteRollover} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold">Start Rollover</button>
                    )}
                </div>
            </div>
        </div>
    );
};
