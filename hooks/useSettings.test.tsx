import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../services/settingsService', async () => {
    const actual = await vi.importActual<typeof import('../services/settingsService')>('../services/settingsService');
    return {
        ...actual,
        getSettings: vi.fn(async () => actual.defaultSettings),
        getSettingsSync: vi.fn(() => actual.defaultSettings),
        saveSettings: vi.fn(async () => undefined),
        updateSettings: vi.fn(async () => undefined)
    };
});

import * as settingsService from '../services/settingsService';
import { SettingsProvider, useSettings } from './useSettings';

const mount = async () => {
    const hook = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    await act(async () => { await Promise.resolve(); }); // let the initial load settle
    return hook.result;
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(settingsService.updateSettings).mockClear();
    vi.mocked(settingsService.saveSettings).mockClear();
});
afterEach(() => vi.useRealTimers());

describe('SettingsProvider', () => {
    // Regression: the provider wrote its whole in-memory settings object, which
    // reset keys stored elsewhere since startup, such as the last backup date,
    // so "daily" backups ran on every launch.
    it('writes only the keys that changed', async () => {
        const api = await mount();
        act(() => api.current.saveSettings({ theme: 'dark' }));
        await act(async () => { vi.advanceTimersByTime(2000); });

        expect(settingsService.updateSettings).toHaveBeenCalledTimes(1);
        expect(settingsService.updateSettings).toHaveBeenCalledWith({ theme: 'dark' });
        expect(settingsService.saveSettings).not.toHaveBeenCalled();
    });

    it('combines quick successive changes into one write', async () => {
        const api = await mount();
        act(() => api.current.saveSettings({ theme: 'dark' }));
        act(() => api.current.saveSettings({ dateFormat: 'YYYY-MM-DD' }));
        await act(async () => { vi.advanceTimersByTime(2000); });

        expect(settingsService.updateSettings).toHaveBeenCalledTimes(1);
        expect(settingsService.updateSettings).toHaveBeenCalledWith({ theme: 'dark', dateFormat: 'YYYY-MM-DD' });
    });

    it('holds changes while paused and writes them on resume', async () => {
        const api = await mount();
        act(() => api.current.pauseSettingsSave());
        act(() => api.current.saveSettings({ theme: 'light' }));
        await act(async () => { vi.advanceTimersByTime(5000); });
        expect(settingsService.updateSettings).not.toHaveBeenCalled();

        act(() => api.current.resumeSettingsSave());
        expect(settingsService.updateSettings).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('updates the in-memory value immediately', async () => {
        const api = await mount();
        act(() => api.current.saveSettings({ theme: 'dark' }));
        expect(api.current.settings.theme).toBe('dark');
    });
});
