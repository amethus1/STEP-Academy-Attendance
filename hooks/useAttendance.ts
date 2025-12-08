import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAttendanceByDate,
    getAttendanceByDateRange,
    saveAttendance,
    deleteAttendance,
    saveAttendanceComment,
    getStudentAttendanceWithComments,
    getHolidays,
    saveHoliday,
    deleteHoliday,
    createAuditLog,
    DBAttendance
} from '../db/queries';

export const useAttendance = (date: string) => {
    return useQuery({
        queryKey: ['attendance', date],
        queryFn: () => getAttendanceByDate(date),
        staleTime: 30 * 1000,
    });
};

export const useAttendanceRange = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: ['attendance', startDate, endDate],
        queryFn: () => getAttendanceByDateRange(startDate, endDate),
        staleTime: 30 * 1000,
    });
};

export const useSaveAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (records: DBAttendance[]) => {
            await saveAttendance(records);
        },
        onSuccess: async (_, records) => {
            // Invalidate all attendance queries to ensure Daily (single date) and Weekly (range) views both update
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            await createAuditLog('Save Attendance', 'Attendance', 'Batch', `Saved ${records.length} records`);
        }
    });
};

export const useDeleteAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { studentId: string, date: string }) => {
            await deleteAttendance(data.studentId, data.date);
        },
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            await createAuditLog('Delete Attendance', 'Attendance', variables.studentId, `Date: ${variables.date}`);
        }
    });
};

export const useHolidays = () => {
    return useQuery({
        queryKey: ['holidays'],
        queryFn: () => getHolidays(),
        staleTime: 5 * 60 * 1000, // 5 minutes - holidays don't change often
    });
};

export const useAddHoliday = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (holiday: { date: string; name: string }) => {
            await saveHoliday({ ...holiday, school_year: null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
        }
    });
};

export const useDeleteHoliday = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (date: string) => {
            await deleteHoliday(date);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
        }
    });
};

export const useSaveAttendanceComment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { studentId: string; date: string; comment: string | null }) => {
            await saveAttendanceComment(data.studentId, data.date, data.comment);
        },
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            await createAuditLog('Save Comment', 'Attendance', variables.studentId, `Date: ${variables.date}, Comment length: ${variables.comment?.length || 0}`);
        }
    });
};

export const useStudentAttendanceWithComments = (studentId: string) => {
    return useQuery({
        queryKey: ['attendanceComments', studentId],
        queryFn: () => getStudentAttendanceWithComments(studentId),
        enabled: !!studentId,
        staleTime: 30 * 1000,
    });
};
