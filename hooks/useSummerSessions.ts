import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getSummerSessions,
    saveSummerSession,
    deleteSummerSession,
    getSummerSessionStudentIds,
    setSummerSessionStudents,
    type SummerSession
} from '../db/queries';
import { useHolidays } from './useAttendance';
import { useSchoolYears } from './useSchoolYears';
import { mapDBHolidaysToHolidays } from '../services/mappers';
import type { CalendarInput } from '../services/schoolCalendar';

export const useSummerSessions = () =>
    useQuery({ queryKey: ['summerSessions'], queryFn: getSummerSessions, staleTime: 5 * 60 * 1000 });

export const useSummerSessionStudents = (sessionId: string | null) =>
    useQuery({
        queryKey: ['summerSessionStudents', sessionId],
        queryFn: () => getSummerSessionStudentIds(sessionId as string),
        enabled: !!sessionId
    });

/** Sessions decide who is expected on summer days and every projected release date. */
const invalidateSessionDependents = (queryClient: QueryClient) => {
    for (const key of ['summerSessions', 'summerSessionStudents', 'students', 'uniqueStudents', 'student']) {
        queryClient.invalidateQueries({ queryKey: [key] });
    }
};

const reportFailure = (what: string) => (error: unknown) => {
    console.error(`Failed to ${what}:`, error);
    toast.error(`Could not ${what}. ${error instanceof Error ? error.message : ''}`.trim());
};

export const useSaveSummerSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (session: Omit<SummerSession, 'studentCount'>) => saveSummerSession(session),
        onSuccess: () => invalidateSessionDependents(queryClient),
        onError: reportFailure('save the summer session')
    });
};

export const useDeleteSummerSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteSummerSession(id),
        onSuccess: () => invalidateSessionDependents(queryClient),
        onError: reportFailure('delete the summer session')
    });
};

export const useSetSummerSessionStudents = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ sessionId, studentIds }: { sessionId: string; studentIds: string[] }) =>
            setSummerSessionStudents(sessionId, studentIds),
        onSuccess: () => invalidateSessionDependents(queryClient),
        onError: reportFailure('update the session roster')
    });
};

/**
 * Everything that decides when school is in session: holidays, school years
 * (first to last day of school) and summer sessions. One place, so every view
 * and every release date uses the same calendar.
 */
export const useSchoolCalendar = () => {
    const { data: holidays = [] } = useHolidays();
    const { data: schoolYears = [] } = useSchoolYears();
    const { data: summerSessions = [] } = useSummerSessions();

    return useMemo(() => {
        const holidaysUI = mapDBHolidaysToHolidays(holidays);
        const calendar: CalendarInput = {
            holidayDates: new Set(holidays.map(h => h.date)),
            schoolYears,
            summerSessions
        };
        return {
            holidays,
            holidaysUI,
            schoolYears,
            summerSessions,
            calendar,
            /** Pass to mappers / projectReleaseDate. */
            projection: { schoolYears, summerSessions }
        };
    }, [holidays, schoolYears, summerSessions]);
};
