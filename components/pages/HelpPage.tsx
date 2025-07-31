import React from 'react';

const APP_VERSION = "1.1.0"; // Example version

export const HelpPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-sm">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">S.T.E.P. Academy</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Version {APP_VERSION}</p>
        
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