import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { AppSettings } from '../types';
import * as settingsService from '../services/settingsService';

interface SettingsContextType {
  settings: AppSettings;
  saveSettings: (newSettings: Partial<AppSettings>) => void;
  isSettingsLoading: boolean;
  pauseSettingsSave: () => void;
  resumeSettingsSave: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Debounce delay for settings saves (prevents constant DB writes)
const SETTINGS_SAVE_DEBOUNCE_MS = 2000;

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with sync settings from localStorage for immediate render
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettingsSync());
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // Refs for debouncing and pause control
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Partial<AppSettings> | null>(null);
  const isPausedRef = useRef(false);

  // Load settings from SQLite asynchronously
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await settingsService.getSettings();
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Keep the sync-loaded settings as fallback
      } finally {
        setIsSettingsLoading(false);
      }
    };

    loadSettings();

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Pause settings saves (call before import)
  const pauseSettingsSave = useCallback(() => {
    isPausedRef.current = true;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Changes waiting to be written. Only the keys the user actually changed are
  // saved: writing the whole in-memory settings object overwrote values that
  // were stored elsewhere since startup, such as the last-backup date or
  // settings restored by an import.
  const flushPendingChanges = useCallback((failureMessage: string) => {
    const changes = pendingChangesRef.current;
    pendingChangesRef.current = null;
    if (!changes) return;
    settingsService.updateSettings(changes).catch(error => {
      console.error('Failed to persist settings:', error);
      toast.error(failureMessage);
    });
  }, []);

  // Resume settings saves (call after import)
  const resumeSettingsSave = useCallback(() => {
    isPausedRef.current = false;
    flushPendingChanges('Failed to save settings after import. Your last change may not have persisted.');
  }, [flushPendingChanges]);

  const handleSaveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prevSettings => ({ ...prevSettings, ...newSettings }));

    // Keep the synchronous cache current for the next launch's first render.
    try {
      localStorage.setItem('attendanceAppSettings', JSON.stringify({ ...settingsService.getSettingsSync(), ...newSettings }));
    } catch {
      // The cache is a convenience; the database is the source of truth.
    }

    pendingChangesRef.current = { ...pendingChangesRef.current, ...newSettings };

    // Held until resumeSettingsSave while an import is running.
    if (isPausedRef.current) return;

    // Debounce DB writes to prevent constant writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!isPausedRef.current) {
        flushPendingChanges('Failed to save settings. Your last change may not have persisted.');
      }
    }, SETTINGS_SAVE_DEBOUNCE_MS);
  }, [flushPendingChanges]);

  const value = { settings, saveSettings: handleSaveSettings, isSettingsLoading, pauseSettingsSave, resumeSettingsSave };

  return React.createElement(SettingsContext.Provider, { value }, children);
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};