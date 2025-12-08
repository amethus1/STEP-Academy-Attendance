import { QueryClient, DefaultOptions } from '@tanstack/react-query';

// Default query options - exported so they can be restored after import
export const defaultQueryOptions: DefaultOptions = {
    queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60, // 1 hour
        retry: 1,
        refetchOnWindowFocus: true,
    },
};

export const queryClient = new QueryClient({
    defaultOptions: defaultQueryOptions,
});
