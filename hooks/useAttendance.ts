import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAttendanceByDate,
    getAttendanceByDateRange,
    saveAttendance,
    deleteAttendance,
    getHolidays,
    saveHoliday,
    deleteHoliday,
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
        onSuccess: (_, records) => {
            // Invalidate all attendance queries to ensure Daily (single date) and Weekly (range) views both update
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        }
    });
};

export const useDeleteAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { studentId: string, date: string }) => {
            await deleteAttendance(data.studentId, data.date);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
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
