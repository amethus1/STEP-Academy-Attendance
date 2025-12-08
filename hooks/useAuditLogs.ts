// React Query hooks for audit logs
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, getDistinctAuditActions, getDistinctAuditEntityTypes, GetAuditLogsOptions } from '../db/auditQueries';

export const useAuditLogs = (options: GetAuditLogsOptions) => {
    return useQuery({
        queryKey: ['auditLogs', options],
        queryFn: () => getAuditLogs(options),
        staleTime: 30 * 1000, // 30 seconds
    });
};

export const useDistinctAuditActions = () => {
    return useQuery({
        queryKey: ['auditActions'],
        queryFn: getDistinctAuditActions,
        staleTime: 60 * 1000, // 1 minute
    });
};

export const useDistinctAuditEntityTypes = () => {
    return useQuery({
        queryKey: ['auditEntityTypes'],
        queryFn: getDistinctAuditEntityTypes,
        staleTime: 60 * 1000, // 1 minute
    });
};

export const useLogAction = () => {
    return async (action: string, entityType: string, entityId: string | null, details: string | null) => {
        const { createAuditLog } = await import('../db/auditQueries');
        await createAuditLog(action, entityType, entityId, details);
    };
};
