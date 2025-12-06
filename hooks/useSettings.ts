import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { AppSettings } from '../types';
import * as settingsService from '../services/settingsService';

interface SettingsContextType {
  settings: AppSettings;
  saveSettings: (newSettings: Partial<AppSettings>) => void;
  isSettingsLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with sync settings from localStorage for immediate render
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettingsSync());
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

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
  }, []);

  const handleSaveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };

      // Save asynchronously - fire and forget with error handling
      settingsService.saveSettings(updatedSettings).catch(error => {
        console.error('Failed to persist settings:', error);
      });

      // Also update localStorage synchronously for immediate persistence
      localStorage.setItem('attendanceAppSettings', JSON.stringify(updatedSettings));

      return updatedSettings;
    });
  }, []);

  const value = { settings, saveSettings: handleSaveSettings, isSettingsLoading };

  return React.createElement(SettingsContext.Provider, { value }, children);
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};