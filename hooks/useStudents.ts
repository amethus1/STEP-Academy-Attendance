import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getStudentsByYear,
    createStudent,
    updateStudentEnrollment,
    getSchoolYears,
    getStudentDetails,
    updateStudent,
    deleteStudent,
    searchStudents,
    getUniqueStudents,
    getStudentEnrollments,
    DBStudent,
    DBEnrollment,
    StudentWithEnrollment,
    StudentSearchOptions,
    UniqueStudentSearchOptions
} from '../db/queries';

export const useSchoolYears = () => {
    return useQuery({
        queryKey: ['schoolYears'],
        queryFn: getSchoolYears,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useStudents = (options: string | StudentSearchOptions) => {
    const isLegacy = typeof options === 'string';
    const schoolYear = isLegacy ? options : options.schoolYear;

    return useQuery({
        queryKey: isLegacy ? ['students', schoolYear] : ['students', schoolYear, options],
        queryFn: () => isLegacy ? searchStudents({ schoolYear: options }) : searchStudents(options),
        enabled: !!schoolYear,
        staleTime: 30 * 1000, // 30 seconds
    });
};

/**
 * Hook for fetching unique students (one row per student, not per enrollment).
 * Use this for roster views to avoid duplicate student rows.
 */
export const useUniqueStudents = (options: UniqueStudentSearchOptions) => {
    return useQuery({
        queryKey: ['uniqueStudents', options],
        queryFn: () => getUniqueStudents(options),
        staleTime: 30 * 1000,
    });
};

/**
 * Hook for fetching all enrollments for a specific student.
 * Use this for student detail page enrollment history.
 */
export const useStudentEnrollments = (studentId: string) => {
    return useQuery({
        queryKey: ['studentEnrollments', studentId],
        queryFn: () => getStudentEnrollments(studentId),
        enabled: !!studentId,
        staleTime: 30 * 1000,
    });
};

export const useCreateStudent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { student: DBStudent, enrollment: DBEnrollment }) => {
            await createStudent(data.student, data.enrollment);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['students', variables.enrollment.school_year] });
            queryClient.invalidateQueries({ queryKey: ['students', 'All'] }); // Also invalidate 'All' view
            queryClient.invalidateQueries({ queryKey: ['uniqueStudents'] }); // Invalidate unified view
        },
        onError: (error) => {
            console.error("Failed to create student:", error);
            toast.error("Failed to create student. Please check the console for details.");
        }
    });
};

export const useStudentDetails = (studentId: string) => {
    return useQuery({
        queryKey: ['student', studentId],
        queryFn: () => getStudentDetails(studentId),
        enabled: !!studentId,
        staleTime: 30 * 1000,
    });
};

export const useUpdateStudent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (student: DBStudent) => {
            await updateStudent(student);
        },
        onSuccess: (_, student) => {
            queryClient.invalidateQueries({ queryKey: ['student', student.id] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['uniqueStudents'] }); // Invalidate unified view
        }
    });
};

export const useUpdateEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string, updates: Partial<DBEnrollment>, schoolYear: string, studentId?: string }) => {
            await updateStudentEnrollment(data.id, data.updates);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['students', variables.schoolYear] });
            queryClient.invalidateQueries({ queryKey: ['uniqueStudents'] }); // Invalidate unified view
            queryClient.invalidateQueries({ queryKey: ['studentEnrollments'] }); // Invalidate enrollment history
            // Also invalidate the specific student's detail page
            if (variables.studentId) {
                queryClient.invalidateQueries({ queryKey: ['student', variables.studentId] });
            }
            // Invalidate all student detail queries as fallback
            queryClient.invalidateQueries({ queryKey: ['student'] });
        },
        onError: (error) => {
            console.error("Failed to update enrollment:", error);
            toast.error("Failed to update enrollment. Check console for details.");
        },
    });
};

export const useDeleteStudent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (studentId: string) => {
            await deleteStudent(studentId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['student'] }); // If viewing detail
            queryClient.invalidateQueries({ queryKey: ['uniqueStudents'] }); // Invalidate unified view
        },
        onError: (error) => {
            console.error("Failed to delete student:", error);
            toast.error("Failed to delete student.");
        }
    });
};
