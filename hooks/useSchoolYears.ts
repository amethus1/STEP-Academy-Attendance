import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SchoolYear } from '../types';
import {
    getSchoolYears,
    createSchoolYear,
    updateSchoolYear,
    deleteSchoolYear
} from '../db/queries';

const reportWriteFailure = (what: string) => (error: unknown) => {
    console.error(`Failed to ${what}:`, error);
    toast.error(`Could not save ${what}. Your change was not recorded — please try again.`);
};

export const useSchoolYears = () => {
    return useQuery({
        queryKey: ['schoolYears'],
        queryFn: getSchoolYears,
        staleTime: 300 * 1000, // 5 minutes
    });
};

export const useCreateSchoolYear = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSchoolYear,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
            // Also invalidate the simple list of year strings if we keep using it separately?
            // Ideally we unify, but for strict types let's stick to this new key.
        },
        onError: reportWriteFailure('the school year'),
    });
};

export const useUpdateSchoolYear = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<SchoolYear> }) =>
            updateSchoolYear(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
        },
        onError: reportWriteFailure('the school year'),
    });
};

export const useDeleteSchoolYear = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteSchoolYear,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
        },
        onError: reportWriteFailure('the school year removal'),
    });
};
