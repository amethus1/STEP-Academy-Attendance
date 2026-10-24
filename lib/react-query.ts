import { QueryClient, DefaultOptions, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

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
    // Every successful write funnels through here, which is what powers the
    // "On Data Change" backup setting. The backup service collapses a burst of
    // writes into one backup and does nothing unless that setting is chosen.
    mutationCache: new MutationCache({
        onSuccess: () => {
            import('../services/backupService')
                .then(({ runBackupOnDataChange }) =>
                    runBackupOnDataChange(error =>
                        toast.error(`Automatic backup failed: ${error}. Check the backup folder in Settings.`, { duration: 15000 })
                    )
                )
                .catch(err => console.error('Could not schedule backup after change:', err));
        }
    })
});
