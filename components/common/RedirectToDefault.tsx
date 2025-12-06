import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';

export const RedirectToDefault: React.FC = () => {
    const { settings, isSettingsLoading } = useSettings();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isSettingsLoading) {
            navigate(settings.defaultRoute, { replace: true });
        }
    }, [settings.defaultRoute, navigate, isSettingsLoading]);

    return (
        <div className="flex justify-center items-center h-full">
            <p className="text-slate-500">Loading...</p>
        </div>
    );
};
