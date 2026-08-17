import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';

/** Where "/" lands when the configured default cannot be used. */
export const FALLBACK_ROUTE = '/dashboard';

export const RedirectToDefault: React.FC = () => {
    const { settings, isSettingsLoading } = useSettings();

    if (isSettingsLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <p className="text-slate-500">Loading…</p>
            </div>
        );
    }

    // Settings saved before the dashboard moved to its own path stored "/",
    // which would redirect to itself forever.
    const target = !settings.defaultRoute || settings.defaultRoute === '/'
        ? FALLBACK_ROUTE
        : settings.defaultRoute;

    return <Navigate to={target} replace />;
};
