import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getStudentsByYear,
    createStudent,
    updateStudentEnrollment,
    getSchoolYears,
    getStudentDetails,
    updateStudent,
    deleteStudent,
    searchStudents,
    DBStudent,
    DBEnrollment,
    StudentWithEnrollment,
    StudentSearchOptions
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

export const useCreateStudent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { student: DBStudent, enrollment: DBEnrollment }) => {
            await createStudent(data.student, data.enrollment);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['students', variables.enrollment.school_year] });
            queryClient.invalidateQueries({ queryKey: ['students', 'All'] }); // Also invalidate 'All' view
        },
        onError: (error) => {
            console.error("Failed to create student:", error);
            alert("Failed to create student. Please check the console for details.");
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
        }
    });
};

export const useUpdateEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string, updates: Partial<DBEnrollment>, schoolYear: string }) => {
            await updateStudentEnrollment(data.id, data.updates);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['students', variables.schoolYear] });
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
        },
        onError: (error) => {
            console.error("Failed to delete student:", error);
            alert("Failed to delete student.");
        }
    });
};
