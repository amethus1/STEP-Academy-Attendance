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
  const pendingSettingsRef = useRef<AppSettings | null>(null);
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

  // Resume settings saves (call after import)
  const resumeSettingsSave = useCallback(() => {
    isPausedRef.current = false;
    // If there were pending settings, save them now
    if (pendingSettingsRef.current) {
      settingsService.saveSettings(pendingSettingsRef.current).catch(error => {
        console.error('Failed to persist pending settings:', error);
        toast.error('Failed to save settings after import. Your last change may not have persisted.');
      });
      pendingSettingsRef.current = null;
    }
  }, []);

  const handleSaveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };

      // Always update localStorage synchronously for immediate persistence
      localStorage.setItem('attendanceAppSettings', JSON.stringify(updatedSettings));

      // Skip DB save if paused (during import)
      if (isPausedRef.current) {
        pendingSettingsRef.current = updatedSettings;
        return updatedSettings;
      }

      // Debounce DB save to prevent constant writes
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      pendingSettingsRef.current = updatedSettings;
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingSettingsRef.current && !isPausedRef.current) {
          settingsService.saveSettings(pendingSettingsRef.current).catch(error => {
            console.error('Failed to persist settings:', error);
            toast.error('Failed to save settings. Your last change may not have persisted.');
          });
          pendingSettingsRef.current = null;
        }
      }, SETTINGS_SAVE_DEBOUNCE_MS);

      return updatedSettings;
    });
  }, []);

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