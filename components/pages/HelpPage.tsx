import React, { useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';

const APP_VERSION = "1.0.0"; // Should match tauri.conf.json

export const HelpPage: React.FC = () => {
  const [checking, setChecking] = useState(false);

  const handleCheckUpdate = async () => {
    setChecking(true);
    try {
      const update = await check();
      if (update && update.available) {
        const yes = await window.confirm(
          `Update to ${update.version} is available!\n\nRelease notes: ${update.body}\n\nDo you want to download and install it now?`
        );
        if (yes) {
          toast.info("Downloading update...");
          await update.downloadAndInstall();
          toast.success("Update installed! Restarting...");
          await relaunch();
        }
      } else {
        toast.success("You are on the latest version.");
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      // Ignore error if not running in Tauri (e.g. browser dev)
      if (String(error).includes('plugin not found')) {
        toast.error("Update checking requires the running app.");
      } else {
        toast.error(`Update check failed: ${String(error)}`);
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-sm">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">S.T.E.P. Academy</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Version {APP_VERSION}</p>

        <div className="mt-4">
          <button
            onClick={handleCheckUpdate}
            disabled={checking}
            className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md transition-colors"
          >
            {checking ? 'Checking...' : 'Check for Updates'}
          </button>
        </div>

        <div className="mt-6 border-t dark:border-slate-700 pt-6 space-y-4 text-slate-700 dark:text-slate-300">
          <p>
            Thank you for using the S.T.E.P. Academy Student Attendance Tracker. This application is designed to be a simple, powerful, and private way to manage student attendance records.
          </p>
          <p>
            All of your data is stored securely in your own browser, and is never sent to any external server. You have full control over your data, which can be exported at any time from the Data Management page.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">Feedback & Support</h3>
          <p className="text-slate-700 dark:text-slate-300">
            Have a feature request, a bug to report, or a question?
          </p>
          <div className="mt-4">
            <a
              href="https://github.com/google/generative-ai-docs/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm transition-colors"
            >
              Provide Feedback on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};