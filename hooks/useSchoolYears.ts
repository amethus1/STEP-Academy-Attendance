import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SchoolYear } from '../types';
import {
    getSchoolYears,
    createSchoolYear,
    updateSchoolYear,
    deleteSchoolYear
} from '../db/queries';

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
    });
};

export const useDeleteSchoolYear = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteSchoolYear,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
        },
    });
};
