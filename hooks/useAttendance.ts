import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

/**
 * Write an audit entry without letting a logging failure surface as a failed
 * write. The user's data is already saved at this point; losing the audit row
 * is not worth showing them an error that implies otherwise.
 */
const auditQuietly = async (...args: Parameters<typeof createAuditLog>) => {
    try {
        await createAuditLog(...args);
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
};

/**
 * Attendance writes must never fail silently — a teacher who sees no error
 * assumes the record saved. Report the failure and tell them what to do.
 */
const reportWriteFailure = (what: string) => (error: unknown) => {
    console.error(`Failed to ${what}:`, error);
    toast.error(`Could not save ${what}. Your change was not recorded — please try again.`);
};

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
            await auditQuietly('Save Attendance', 'Attendance', 'Batch', `Saved ${records.length} records`);
        },
        onError: reportWriteFailure('attendance')
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
            await auditQuietly('Delete Attendance', 'Attendance', variables.studentId, `Date: ${variables.date}`);
        },
        onError: reportWriteFailure('the attendance change')
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
        },
        onError: reportWriteFailure('the holiday')
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
        },
        onError: reportWriteFailure('the holiday removal')
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
            await auditQuietly('Save Comment', 'Attendance', variables.studentId, `Date: ${variables.date}, Comment length: ${variables.comment?.length || 0}`);
        },
        onError: reportWriteFailure('the note')
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
