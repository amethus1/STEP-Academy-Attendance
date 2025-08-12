# Code Listing

The following sections contain the full source code of each file in the repository.

## .gitignore

```
# Dependency directories
node_modules/

# Production build output
/dist/

# System files
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local

# IDE/Editor directories and files
.vscode/
.idea/

# Misc
*.log

```

## package.json

```
{
  "name": "s.t.e.p.-academy",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron:dev": "npm run build && electron .",
    "electron:pack": "npm run build && electron-builder --dir",
    "electron:dist": "npm run build && electron-builder"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.7.1"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "electron": "^30.0.0",
    "electron-builder": "^24.13.3"
  },
  "main": "main.cjs",
  "build": {
    "appId": "com.step.attendance",
    "files": [
      "dist/**/*",
      "main.cjs"
    ],
    "asar": true
  }
}

```

## tsconfig.json

```
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

## vite.config.ts

```
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

```

## index.html

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>S.T.E.P. Academy</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            'brand': {
              'light': '#e0f2fe',
              'DEFAULT': '#0ea5e9',
              'dark': '#0369a1',
            },
          },
        }
      }
    }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
      @media print {
        body {
          background-color: white !important;
        }
        /* Hide everything by default */
        body * {
          visibility: hidden;
        }
        /* Make the printable content and its children visible */
        .printable-content, .printable-content * {
          visibility: visible;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /* Position the printable content to take up the whole page */
        .printable-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          margin: 0;
          padding: 0;
          box-shadow: none !important;
          border: none !important;
        }
      }
    </style>
  <script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@^19.1.1",
    "react-dom/": "https://esm.sh/react-dom@^19.1.1/",
    "react/": "https://esm.sh/react@^19.1.1/",
    "react-router-dom": "https://esm.sh/react-router-dom@^7.7.1"
  }
}
</script>
</head>
  <body class="bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

## index.tsx

```
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { SettingsProvider } from './hooks/useSettings';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </HashRouter>
  </React.StrictMode>
);
```

## App.tsx

```
import React, { useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { WeeklyView } from './components/pages/WeeklyView';
import { DailyView } from './components/pages/DailyView';
import { RosterPage } from './components/pages/RosterPage';
import { StudentDetailPage } from './components/pages/StudentDetailPage';
import { HolidaysPage } from './components/pages/HolidaysPage';
import { DataManagementPage } from './components/pages/DataManagementPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { HelpPage } from './components/pages/HelpPage';
import { ReportingPage } from './components/pages/ReportingPage';
import { RedirectToDefault } from './components/common/RedirectToDefault';
import { useSettings } from './hooks/useSettings';
import { CalendarDaysIcon, ListBulletIcon, UserGroupIcon, Cog6ToothIcon, SunIcon, ArchiveBoxArrowDownIcon, QuestionMarkCircleIcon, ChartBarIcon, StepAcademyLogo } from './components/icons/Icons';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; children: React.ReactNode }> = ({ to, icon, children }) => {
  const baseClasses = "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200";
  const inactiveClasses = "text-slate-600 hover:bg-sky-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white";
  const activeClasses = "bg-brand text-white shadow-md";

  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      <span className="mr-3">{icon}</span>
      {children}
    </NavLink>
  );
};

const App: React.FC = () => {
  const location = useLocation();
  const { settings } = useSettings();
  
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
  }, [settings.theme]);


  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'S.T.E.P. Academy';
      case '/attendance': return 'Weekly View';
      case '/daily': return 'Daily Attendance';
      case '/roster': return 'Student Roster';
      case '/holidays': return 'Manage Holidays';
      case '/reports': return 'Reporting & Analytics';
      case '/data': return 'Data Management';
      case '/settings': return 'Settings';
      case '/help': return 'Help & About';
      default:
        if (location.pathname.startsWith('/student/')) return 'Student Detail';
        return 'S.T.E.P. Academy';
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-800 font-sans">
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between print-hidden">
        <div>
          <div className="flex items-center justify-center mb-8 px-2">
            <StepAcademyLogo className="h-24 w-auto" />
          </div>
          <nav className="space-y-2">
            <NavItem to="/attendance" icon={<CalendarDaysIcon />}>Weekly View</NavItem>
            <NavItem to="/daily" icon={<SunIcon />}>Daily View</NavItem>
            <NavItem to="/roster" icon={<UserGroupIcon />}>Student Roster</NavItem>
            <NavItem to="/reports" icon={<ChartBarIcon />}>Reporting</NavItem>
            <NavItem to="/holidays" icon={<ListBulletIcon />}>Holidays</NavItem>
            <NavItem to="/data" icon={<ArchiveBoxArrowDownIcon />}>Data Management</NavItem>
            <NavItem to="/settings" icon={<Cog6ToothIcon />}>Settings</NavItem>
          </nav>
        </div>
        <nav>
           <NavItem to="/help" icon={<QuestionMarkCircleIcon />}>Help & About</NavItem>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
         <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 print-hidden">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{getTitle()}</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800">
          <Routes>
            <Route path="/" element={<RedirectToDefault />} />
            <Route path="/attendance" element={<WeeklyView />} />
            <Route path="/daily" element={<DailyView />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/student/:studentId" element={<StudentDetailPage />} />
            <Route path="/holidays" element={<HolidaysPage />} />
            <Route path="/reports" element={<ReportingPage />} />
            <Route path="/data" element={<DataManagementPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
```

## main.cjs

```
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

```

## metadata.json

```
{
  "name": "S.T.E.P. Academy",
  "description": "A comprehensive tool for tracking student attendance, managing rosters, and calculating program completion dates. Features include weekly and daily views, holiday management, and data import/export capabilities.",
  "requestFramePermissions": [
    "camera"
  ],
  "prompt": ""
}
```

## types.ts

```
export enum StudentStatus {
  Active = "Active",
  Completed = "Completed",
  Withdrawn = "Withdrawn",
}

export interface CustomFieldDefinition {
  id: string; // e.g., 'homeroom'
  name: string; // e.g., 'Homeroom'
  type: 'text' | 'number' | 'date';
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  registrationDate: string; // ISO string YYYY-MM-DD
  entryDate: string; // ISO string YYYY-MM-DD
  campus: string;
  gradeLevel: string;
  sped504: string; // 'None', 'SPED', '504'
  drgOffense: string;
  creditDays: number;
  daysAssigned: number;
  status: StudentStatus;
  comments: string;
  customFields: Record<string, string | number>;
  // New fields for enhanced profile
  photoUrl: string | null;
  guardianName: string;
  guardianPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export enum Presence {
  Present = "Present",
  Absent = "Absent",
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // ISO string YYYY-MM-DD
  presence: Presence;
}

export interface Holiday {
  date: string; // ISO string YYYY-MM-DD
  name: string;
}

export interface AppData {
  students: Student[];
  attendance: AttendanceRecord[];
  holidays: Holiday[];
  customFieldDefinitions: CustomFieldDefinition[];
}

// --- App Settings ---
export type Theme = 'light' | 'dark' | 'system';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

export interface AppSettings {
  theme: Theme;
  defaultRoute: string;
  dateFormat: DateFormat;
  showConfirmations: boolean;
  rosterVisibleColumns: string[];
  rosterColumnOrder: string[];
  schoolYearStartDate: string; // ISO Date
  schoolYearEndDate: string; // ISO Date
}
```

## hooks/useSettings.ts

```
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
  const [settings, setSettings] = useState<AppSettings>(settingsService.defaultSettings);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    const loadedSettings = settingsService.getSettings();
    setSettings(loadedSettings);
    setIsSettingsLoading(false);
  }, []);

  const handleSaveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      settingsService.saveSettings(updatedSettings);
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
```

## hooks/useAppData.ts

```

import { useState, useCallback, useEffect } from 'react';
import { AppData, Student, AttendanceRecord, Holiday, Presence, CustomFieldDefinition } from '../types';
import * as storageService from '../services/storageService';

export const useAppData = () => {
  const [data, setData] = useState<AppData>({ students: [], attendance: [], holidays: [], customFieldDefinitions: [] });
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(() => {
    setLoading(true);
    const appData = storageService.getAppData();
    setData(appData);
    setLoading(false);
  }, []);
  
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateStudent = useCallback((studentToUpdate: Student) => {
    const currentData = storageService.getAppData();
    const students = currentData.students.map(s => s.id === studentToUpdate.id ? studentToUpdate : s);
    storageService.saveStudents(students);
    refreshData();
  }, [refreshData]);
  
  const addStudent = useCallback((newStudent: Student) => {
    const currentData = storageService.getAppData();
    const students = [...currentData.students, newStudent];
    storageService.saveStudents(students);
    refreshData();
  }, [refreshData]);

  const markAttendance = useCallback((studentId: string, date: string, presence: Presence | null) => {
    const currentData = storageService.getAppData();
    let attendance = currentData.attendance.filter(a => !(a.studentId === studentId && a.date === date));
    if (presence) {
      attendance.push({ studentId, date, presence });
    }
    storageService.saveAttendance(attendance);
    refreshData();
  }, [refreshData]);

  const addHoliday = useCallback((holiday: Holiday) => {
    const currentData = storageService.getAppData();
    if (currentData.holidays.some(h => h.date === holiday.date)) return;
    const holidays = [...currentData.holidays, holiday].sort((a,b) => a.date.localeCompare(b.date));
    storageService.saveHolidays(holidays);
    refreshData();
  }, [refreshData]);

  const removeHoliday = useCallback((holidayDate: string) => {
    const currentData = storageService.getAppData();
    const holidays = currentData.holidays.filter(h => h.date !== holidayDate);
    storageService.saveHolidays(holidays);
    refreshData();
  }, [refreshData]);
  
  const addCustomFieldDefinition = useCallback((definition: CustomFieldDefinition) => {
    const currentData = storageService.getAppData();
    const definitions = [...currentData.customFieldDefinitions, definition];
    storageService.saveCustomFieldDefinitions(definitions);
    refreshData();
  }, [refreshData]);

  const removeCustomFieldDefinition = useCallback((fieldId: string) => {
    const currentData = storageService.getAppData();
    const definitions = currentData.customFieldDefinitions.filter(f => f.id !== fieldId);
    const students = currentData.students.map(s => {
        const newCustomFields = { ...s.customFields };
        delete newCustomFields[fieldId];
        return { ...s, customFields: newCustomFields };
    });
    storageService.saveAppData({ ...currentData, students, customFieldDefinitions: definitions });
    refreshData();
  }, [refreshData]);

  return { ...data, loading, refreshData, updateStudent, addStudent, markAttendance, addHoliday, removeHoliday, addCustomFieldDefinition, removeCustomFieldDefinition };
};

```

## services/settingsService.ts

```
import { AppSettings } from "../types";

const SETTINGS_KEY = 'attendanceAppSettings';

// A more logical default order for all permanent columns.
const DEFAULT_COLUMN_ORDER = [
    'lastName', 'firstName', 'id', 'status', 
    'daysRemaining', 'projectedReleaseDate', 
    'daysAttended', 'daysAssigned', 'creditDays',
    'campus', 'gradeLevel', 'sped504', 'drgOffense',
    'entryDate', 'registrationDate', 'comments'
];

export const defaultSettings: AppSettings = {
  theme: 'system',
  defaultRoute: '/attendance',
  dateFormat: 'MM/DD/YYYY',
  showConfirmations: true,
  // By default, all permanent columns are now visible.
  rosterVisibleColumns: DEFAULT_COLUMN_ORDER,
  rosterColumnOrder: DEFAULT_COLUMN_ORDER,
  schoolYearStartDate: `${new Date().getFullYear()}-08-01`,
  schoolYearEndDate: `${new Date().getFullYear() + 1}-07-31`,
};

export const getSettings = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // Merge with defaults to ensure all keys are present
      return { ...defaultSettings, ...parsed };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Failed to parse settings from localStorage', error);
    return defaultSettings;
  }
};

export const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage', error);
  }
};
```

## services/storageService.ts

```
import { AppData, Student, AttendanceRecord, Holiday, CustomFieldDefinition, StudentStatus, Presence } from '../types';

const APP_DATA_KEY = 'attendanceAppData';

const generateSampleData = (): AppData => {
  const localToISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const firstNames = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia", "James", "Amelia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Alexander", "Harper", "Michael", "Camila", "Daniel", "Gianna", "Mateo", "Abigail", "Logan", "Luna", "Jackson", "Ella"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

  const students: Student[] = [];
  for (let i = 1; i <= 30; i++) {
    const firstName = firstNames[i - 1];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    students.push({
      id: `SS${202400 + i}`,
      firstName: firstName,
      lastName: lastName,
      registrationDate: '2024-05-15',
      entryDate: '2024-06-03',
      campus: `Campus ${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      gradeLevel: `${Math.floor(Math.random() * 4) + 9}`, // 9, 10, 11, 12
      sped504: ['None', 'SPED', '504'][Math.floor(Math.random() * 3)],
      drgOffense: ['Yes', 'No'][Math.floor(Math.random() * 2)],
      creditDays: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
      daysAssigned: 40,
      status: StudentStatus.Active,
      comments: `Summer session student.`,
      customFields: {},
      photoUrl: null,
      guardianName: `${firstName}'s Guardian`,
      guardianPhone: '555-123-4567',
      emergencyContactName: `Emergency Contact`,
      emergencyContactPhone: '555-987-6543'
    });
  }

  const attendance: AttendanceRecord[] = [];
  const startDate = new Date('2024-06-03T12:00:00Z');
  const today = new Date();
  for (const student of students) {
    let currentDate = new Date(startDate);
    // Only generate attendance up to today
    const endDate = today > currentDate ? today : currentDate;

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays only
        const presence = Math.random() > 0.1 ? Presence.Present : Presence.Absent; // 10% absence rate
        attendance.push({
          studentId: student.id,
          date: localToISODateString(currentDate),
          presence: presence
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const holidays: Holiday[] = [{ date: '2024-07-04', name: 'Independence Day'}];
  
  return { students, attendance, holidays, customFieldDefinitions: [] };
};

const emptyData: AppData = {
  students: [],
  attendance: [],
  holidays: [],
  customFieldDefinitions: [],
};

export const getAppData = (): AppData => {
  try {
    const data = localStorage.getItem(APP_DATA_KEY);
    if (data) {
      const parsedData = JSON.parse(data);
      // Ensure new fields exist for backward compatibility
      if (!parsedData.customFieldDefinitions) {
        parsedData.customFieldDefinitions = [];
      }
      if (parsedData.students) {
          parsedData.students = parsedData.students.map((s: any) => ({
              ...s,
              campus: s.campus || '',
              gradeLevel: s.gradeLevel || '',
              sped504: s.sped504 || 'None',
              drgOffense: s.drgOffense || '',
              creditDays: s.creditDays || 0,
              customFields: s.customFields || {},
              photoUrl: s.photoUrl || null,
              guardianName: s.guardianName || '',
              guardianPhone: s.guardianPhone || '',
              emergencyContactName: s.emergencyContactName || '',
              emergencyContactPhone: s.emergencyContactPhone || '',
          }));
      }
      return parsedData;
    } else {
      const sampleData = generateSampleData();
      localStorage.setItem(APP_DATA_KEY, JSON.stringify(sampleData));
      return sampleData;
    }
  } catch (error) {
    console.error("Failed to parse app data from localStorage", error);
    return emptyData;
  }
};

export const saveAppData = (data: AppData) => {
  try {
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save app data to localStorage", error);
  }
};

export const saveStudents = (students: Student[]) => {
  const data = getAppData();
  data.students = students;
  saveAppData(data);
};

export const saveAttendance = (attendance: AttendanceRecord[]) => {
  const data = getAppData();
  data.attendance = attendance;
  saveAppData(data);
};

export const saveHolidays = (holidays: Holiday[]) => {
  const data = getAppData();
  data.holidays = holidays;
  saveAppData(data);
};

export const saveCustomFieldDefinitions = (definitions: CustomFieldDefinition[]) => {
  const data = getAppData();
  data.customFieldDefinitions = definitions;
  saveAppData(data);
};
```

## services/csvService.ts

```
const convertToCsv = (data: any[], headers: {key: string, label: string}[]): string => {
    const headerRow = headers.map(h => `"${h.label}"`).join(',');
    const rows = data.map(row => {
        return headers.map(header => {
            const value = row[header.key as keyof typeof row] ?? '';
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        }).join(',');
    });
    return [headerRow, ...rows].join('\n');
};

export const exportToCsv = (filename: string, data: any[], headers: {key: string, label: string}[]) => {
    if (!data || data.length === 0) {
        alert("No data to export.");
        return;
    }
    const csvString = convertToCsv(data, headers);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

```

## services/dateUtils.ts

```
import { Student, AttendanceRecord, Holiday, Presence } from '../types';
import { getSettings } from './settingsService';

export const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateForDisplay = (date: Date | string): string => {
    const { dateFormat } = getSettings();
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00Z') : new Date(date);
    
    // Ensure we are working with UTC dates to prevent timezone-off-by-one errors
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');

    switch (dateFormat) {
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
        default:
            return `${month}/${day}/${year}`;
    }
};

export const getDaysAttended = (studentId: string, attendance: AttendanceRecord[]): number => {
  return attendance.filter(a => a.studentId === studentId && a.presence === Presence.Present).length;
};

export const calculateProjectedReleaseDate = (
  student: Student,
  attendance: AttendanceRecord[],
  holidays: Holiday[],
  projectionStartDateStr: string,
): string => {
  if (student.status !== 'Active') {
    return 'N/A';
  }

  const daysAttended = getDaysAttended(student.id, attendance);
  const creditDays = student.creditDays || 0;
  const daysRemaining = student.daysAssigned - daysAttended - creditDays;

  if (daysRemaining <= 0) {
    return 'Completed';
  }

  let projectedDate = new Date(projectionStartDateStr + 'T12:00:00Z'); // Use UTC to avoid timezone issues
  let daysAdded = 0;
  const holidayDates = new Set(holidays.map(h => h.date));
  
  while (daysAdded < daysRemaining) {
    projectedDate.setDate(projectedDate.getDate() + 1);
    const dayOfWeek = projectedDate.getUTCDay();
    const dateStr = toISODateString(projectedDate);

    // Skip weekends and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
      daysAdded++;
    }
  }

  return toISODateString(projectedDate);
};


export const getWeekDays = (startDate: Date): Date[] => {
  const days = [];
  for (let i = 0; i < 5; i++) {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + i);
    days.push(newDate);
  }
  return days;
};

export const getStartOfWeek = (date: Date, weekStartDay: 'sunday' | 'monday' = 'monday'): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  let diff;
  if (weekStartDay === 'monday') {
    // if day is Sunday (0), we want to go back 6 days to Monday. Otherwise, go back (day - 1) days.
    diff = d.getDate() - day + (day === 0 ? -6 : 1);
  } else { // Sunday start
    diff = d.getDate() - day;
  }
  return new Date(d.setDate(diff));
};

```

## components/common/StudentFormModal.tsx

```
import React, { useState, useEffect, useRef } from 'react';
import { Student, StudentStatus, CustomFieldDefinition } from '../../types';
import { toISODateString } from '../../services/dateUtils';
import { CameraIcon, UserCircleIcon } from '../icons/Icons';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  studentToEdit?: Student | null;
  existingIds: string[];
  customFieldDefinitions: CustomFieldDefinition[];
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({ isOpen, onClose, onSave, studentToEdit, existingIds, customFieldDefinitions }) => {
  const initialFormState: Student = {
    id: '',
    firstName: '',
    lastName: '',
    registrationDate: toISODateString(new Date()),
    entryDate: toISODateString(new Date()),
    daysAssigned: 0,
    status: StudentStatus.Active,
    comments: '',
    campus: '',
    gradeLevel: '',
    sped504: 'None',
    drgOffense: '',
    creditDays: 0,
    customFields: {},
    photoUrl: null,
    guardianName: '',
    guardianPhone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  };
  
  const [formData, setFormData] = useState<Student>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!studentToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && studentToEdit) {
        setFormData({ ...initialFormState, ...studentToEdit, customFields: studentToEdit.customFields || {} });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [studentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'daysAssigned' || name === 'creditDays') ? parseInt(value, 10) || 0 : value }));
  };
  
  const handleCustomFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [name]: type === 'number' ? parseInt(value, 10) || 0 : value
      }
    }));
  };
  
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL(file.type);
            setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.id.trim()) newErrors.id = 'Student ID is required.';
    if (!isEditMode && existingIds.includes(formData.id.trim())) newErrors.id = 'Student ID must be unique.';
    if (!formData.firstName.trim()) newErrors.firstName = 'First Name is required.';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last Name is required.';
    if (formData.daysAssigned <= 0) newErrors.daysAssigned = 'Assigned days must be positive.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col dark:bg-slate-800">
        <header className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{isEditMode ? 'Edit Student' : 'Add New Student'}</h2>
        </header>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Photo Section */}
            <div className="md:col-span-1 flex flex-col items-center">
              <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />
              <div className="w-40 h-40 rounded-full bg-slate-200 dark:bg-slate-700 mb-2 flex items-center justify-center overflow-hidden">
                {formData.photoUrl ? <img src={formData.photoUrl} alt="Student" className="w-full h-full object-cover" /> : <UserCircleIcon className="w-24 h-24 text-slate-400" />}
              </div>
              <button type="button" onClick={() => photoInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                 <CameraIcon className="h-4 w-4" /> {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
            </div>
            
            {/* Form Fields Section */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="md:col-span-2">
                <label htmlFor="id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Student ID</label>
                <input type="text" name="id" value={formData.id} onChange={handleChange} disabled={isEditMode} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.id ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} ${isEditMode ? 'bg-slate-100 dark:bg-slate-700' : ''}`} />
                {errors.id && <p className="text-red-500 text-xs mt-1">{errors.id}</p>}
              </div>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.firstName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.lastName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label htmlFor="campus" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Campus</label>
                <input type="text" name="campus" value={formData.campus} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="gradeLevel" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Grade Level</label>
                <input type="text" name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="drgOffense" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">DRG Offense</label>
                <input type="text" name="drgOffense" value={formData.drgOffense} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="sped504" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">SPED/504</label>
                <select name="sped504" value={formData.sped504} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                  <option value="None">None</option>
                  <option value="SPED">SPED</option>
                  <option value="504">504</option>
                </select>
              </div>
              <div>
                <label htmlFor="registrationDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Registration Date</label>
                <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="entryDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Entry Date</label>
                <input type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label htmlFor="daysAssigned" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Days Assigned</label>
                <input type="number" name="daysAssigned" value={formData.daysAssigned} onChange={handleChange} className={`w-full p-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.daysAssigned ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                {errors.daysAssigned && <p className="text-red-500 text-xs mt-1">{errors.daysAssigned}</p>}
              </div>
              <div>
                <label htmlFor="creditDays" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Credit Days</label>
                <input type="number" name="creditDays" value={formData.creditDays} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
              </div>
            </div>
            {/* Contact & Other Info */}
            <div className="md:col-span-3 border-t pt-4 mt-4 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                <h4 className="md:col-span-2 text-lg font-semibold text-slate-700 dark:text-slate-200">Contact Information</h4>
                <div>
                  <label htmlFor="guardianName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Guardian Name</label>
                  <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                 <div>
                  <label htmlFor="guardianPhone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Guardian Phone</label>
                  <input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                 <div>
                  <label htmlFor="emergencyContactName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Emergency Contact</label>
                  <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                 <div>
                  <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Emergency Phone</label>
                  <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
                </div>
            </div>
            <div className="md:col-span-3">
              <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                {Object.values(StudentStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label htmlFor="comments" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Comments</label>
              <textarea name="comments" value={formData.comments} onChange={handleChange} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"></textarea>
            </div>
            {customFieldDefinitions.length > 0 && <hr className="md:col-span-3 dark:border-slate-700" />}
            {customFieldDefinitions.map(field => (
                 <div key={field.id} className="md:col-span-3">
                     <label htmlFor={field.id} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{field.name}</label>
                     <input
                         type={field.type}
                         name={field.id}
                         value={formData.customFields[field.id] || ''}
                         onChange={handleCustomFieldChange}
                         className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                     />
                 </div>
            ))}
          </div>
        </form>
        <footer className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" onClick={handleSubmit} className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm">Save Student</button>
        </footer>
      </div>
    </div>
  );
};
```

## components/common/AttendanceCalendar.tsx

```
import React, { useMemo } from 'react';
import { AttendanceRecord, Holiday, Presence } from '../../types';
import { getStartOfWeek, toISODateString, formatDateForDisplay } from '../../services/dateUtils';

interface AttendanceCalendarProps {
    attendanceRecords: AttendanceRecord[];
    holidays: Holiday[];
    entryDateStr: string;
    registrationDateStr: string;
}

const CalendarDay: React.FC<{
    day: Date;
    isCurrentMonth: boolean;
    presence?: Presence;
    isHoliday: boolean;
    isBeforeEntry: boolean;
    isFuture: boolean;
    isRegistrationDay: boolean;
}> = ({ day, isCurrentMonth, presence, isHoliday, isBeforeEntry, isFuture, isRegistrationDay }) => {
    if (!isCurrentMonth) {
        return <div className="w-full h-6 rounded-md bg-slate-50 dark:bg-slate-800/50" />;
    }

    let colorClass = "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
    let tooltipText = day.toLocaleDateString();

    if (isFuture) {
        colorClass = "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500";
        tooltipText += " (Future)";
    } else if (isBeforeEntry) {
        colorClass = "bg-slate-100 dark:bg-slate-800";
        tooltipText += " (Before Entry)";
    } else if (isHoliday) {
        colorClass = "bg-yellow-400 text-yellow-800";
        tooltipText += " (Holiday)";
    } else {
        switch (presence) {
            case Presence.Present:
                colorClass = "bg-emerald-500 text-white";
                tooltipText += ": Present";
                break;
            case Presence.Absent:
                colorClass = "bg-rose-500 text-white";
                tooltipText += ": Absent";
                break;
            default:
                colorClass = "bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200"; // Pending
                tooltipText += ": Pending";
        }
    }
    
    if (isRegistrationDay) {
        tooltipText += " (Registered)";
    }

    return (
        <div className="relative group">
            <div className={`w-full h-6 rounded-md flex items-center justify-center transition-colors duration-150 ${colorClass}`}>
                <span className="text-xs">{day.getDate()}</span>
            </div>
            {isRegistrationDay && <span className="absolute top-0 right-1 text-xs font-bold text-purple-600 dark:text-purple-400" title={`Registered on ${formatDateForDisplay(day)}`}>R</span>}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {tooltipText}
            </div>
        </div>
    );
};

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendanceRecords, holidays, entryDateStr, registrationDateStr }) => {

    const calendarData = useMemo(() => {
        const attendanceMap = new Map(attendanceRecords.map(r => [r.date, r.presence]));
        const holidaySet = new Set(holidays.map(h => h.date));
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = toISODateString(today);
        
        const startDate = new Date(entryDateStr + "T12:00:00Z");
        const calendarStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

        const monthsData: { name: string; days: Date[]; month: number }[] = [];
        let loopDate = new Date(calendarStartDate);

        while (loopDate <= today) {
            const currentMonth = loopDate.getMonth();
            const currentYear = loopDate.getFullYear();
            const monthName = loopDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

            const monthDays: Date[] = [];
            let currentCalDay = getStartOfWeek(firstDayOfMonth, 'sunday');

            while (true) {
                monthDays.push(new Date(currentCalDay));
                currentCalDay.setDate(currentCalDay.getDate() + 1);

                // Break after filling the last week of the month
                if (currentCalDay.getMonth() !== currentMonth && currentCalDay.getDay() === 0) {
                    break;
                }
                 // Safety break for very long months
                if(monthDays.length > 42) break;
            }
            
            monthsData.push({ name: monthName, days: monthDays, month: currentMonth });
            
            loopDate.setMonth(loopDate.getMonth() + 1);
        }

        return { months: monthsData, attendanceMap, holidaySet, todayStr };
    }, [attendanceRecords, holidays, entryDateStr]);

    const { months, attendanceMap, holidaySet, todayStr } = calendarData;

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance Calendar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-x-6 gap-y-8">
                {months.map(({ name, days, month }) => (
                    <div key={name}>
                        <h4 className="text-base font-semibold text-center text-slate-700 dark:text-slate-200 mb-2">{name}</h4>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, index) => {
                                const dateStr = toISODateString(day);
                                return (
                                    <CalendarDay
                                        key={index}
                                        day={day}
                                        isCurrentMonth={day.getMonth() === month}
                                        presence={attendanceMap.get(dateStr)}
                                        isHoliday={holidaySet.has(dateStr)}
                                        isBeforeEntry={dateStr < entryDateStr}
                                        isFuture={dateStr > todayStr}
                                        isRegistrationDay={dateStr === registrationDateStr}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 text-xs text-slate-500 dark:text-slate-400">
                <span>Legend:</span>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500"></div> Present</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-rose-500"></div> Absent</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-yellow-400"></div> Holiday</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600"></div> Pending</div>
                 <div className="flex items-center gap-1"><span className="font-bold text-purple-600">R</span> Registration</div>
            </div>
        </div>
    );
};
```

## components/common/RedirectToDefault.tsx

```
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

```

## components/pages/SettingsPage.tsx

```
import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Theme, DateFormat } from '../../types';
import { SunIcon, MoonIcon } from '../icons/Icons';

const SettingsCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & {label: string}> = ({ label, children, ...props}) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <select {...props} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
            {children}
        </select>
    </div>
);

export const SettingsPage: React.FC = () => {
  const { settings, saveSettings } = useSettings();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <SettingsCard title="Appearance" description="Customize the look and feel of the application.">
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</label>
                <div className="flex gap-2">
                    {(['light', 'dark', 'system'] as Theme[]).map(theme => (
                        <button 
                            key={theme}
                            onClick={() => saveSettings({ theme })}
                            className={`flex-1 p-3 rounded-lg border-2 font-semibold capitalize transition-colors ${settings.theme === theme ? 'border-brand bg-brand-light dark:bg-brand-dark/30' : 'border-transparent bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            {theme}
                        </button>
                    ))}
                </div>
            </div>
        </SettingsCard>
        
        <SettingsCard title="Preferences" description="Control application behavior to match your workflow.">
            <Select 
                label="Default View"
                id="default-view"
                value={settings.defaultRoute}
                onChange={e => saveSettings({ defaultRoute: e.target.value })}
            >
                <option value="/attendance">Weekly View</option>
                <option value="/daily">Daily View</option>
                <option value="/roster">Student Roster</option>
                <option value="/reports">Reporting</option>
                <option value="/holidays">Holidays</option>
            </Select>
            <Select
                label="Date Format"
                id="date-format"
                value={settings.dateFormat}
                onChange={e => saveSettings({ dateFormat: e.target.value as DateFormat })}
            >
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 12/25/2024)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 25/12/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2024-12-25)</option>
            </Select>

            <div className="flex items-center justify-between pt-2">
                <label htmlFor="confirmations-toggle" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Show confirmation dialogs
                    <p className="text-xs text-slate-500 dark:text-slate-400">e.g., "Are you sure?" prompts before importing data.</p>
                </label>
                <button
                    id="confirmations-toggle"
                    type="button"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${settings.showConfirmations ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-600'}`}
                    role="switch"
                    aria-checked={settings.showConfirmations}
                    onClick={() => saveSettings({ showConfirmations: !settings.showConfirmations })}
                >
                    <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.showConfirmations ? 'translate-x-5' : 'translate-x-0'}`}
                    ></span>
                </button>
            </div>
        </SettingsCard>

        <SettingsCard title="Calendar & School Year" description="Define your school year and calendar display preferences.">
            <div>
                <label htmlFor="school-year-start" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">School Year Start Date</label>
                <input
                    id="school-year-start"
                    type="date"
                    value={settings.schoolYearStartDate}
                    onChange={e => saveSettings({ schoolYearStartDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                />
            </div>
            <div>
                <label htmlFor="school-year-end" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">School Year End Date</label>
                <input
                    id="school-year-end"
                    type="date"
                    value={settings.schoolYearEndDate}
                    onChange={e => saveSettings({ schoolYearEndDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                />
            </div>
        </SettingsCard>
    </div>
  );
};
```

## components/pages/DailyView.tsx

```
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Student, StudentStatus, Presence } from '../../types';
import { toISODateString, getDaysAttended, calculateProjectedReleaseDate, formatDateForDisplay } from '../../services/dateUtils';
import { CheckCircleIcon, XCircleIcon } from '../icons/Icons';

type DailyStudent = Student & { daysRemaining: number; projectedReleaseDate: string; };
type SortKey = keyof DailyStudent | string;
type AttendanceFilterType = 'All' | 'Present' | 'Absent' | 'Pending';

const StatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  const colorClasses = {
    [StudentStatus.Active]: 'bg-emerald-100 text-emerald-800',
    [StudentStatus.Completed]: 'bg-sky-100 text-sky-800',
    [StudentStatus.Withdrawn]: 'bg-slate-100 text-slate-800',
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[status]}`}>
      {status}
    </span>
  );
};

const AttendanceButton: React.FC<{ currentPresence?: Presence; targetPresence: Presence; onClick: () => void }> = ({ currentPresence, targetPresence, onClick }) => {
  const isSelected = currentPresence === targetPresence;
  
  return (
    <button onClick={onClick} className={`p-1 rounded-full transition-colors duration-150 ${isSelected ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      {targetPresence === Presence.Present ? 
        <CheckCircleIcon className={`h-6 w-6 transition-all ${isSelected ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-500 hover:text-emerald-400'}`} /> : 
        <XCircleIcon className={`h-6 w-6 transition-all ${isSelected ? 'text-rose-500' : 'text-slate-300 dark:text-slate-500 hover:text-rose-400'}`} />
      }
    </button>
  );
};

const dailyViewColumns: { id: SortKey; label: string; }[] = [
    { id: 'lastName', label: 'Last Name' },
    { id: 'firstName', label: 'First Name' },
    { id: 'id', label: 'ID' },
    { id: 'campus', label: 'Campus' },
    { id: 'gradeLevel', label: 'Grade' },
    { id: 'status', label: 'Status' },
    { id: 'daysRemaining', label: 'Days Left' },
    { id: 'projectedReleaseDate', label: 'Release Date' },
];

export const DailyView: React.FC = () => {
  const { students, attendance, holidays, markAttendance, loading } = useAppData();
  const { settings } = useSettings();

  const studentsInYear = useMemo(
    () => students.filter(s =>
      s.registrationDate >= settings.schoolYearStartDate &&
      s.registrationDate <= settings.schoolYearEndDate
    ),
    [students, settings.schoolYearStartDate, settings.schoolYearEndDate]
  );
  const [selectedDate, setSelectedDate] = useState(toISODateString(new Date()));
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'lastName', direction: 'asc' });

  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'All'>(StudentStatus.Active);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilterType>('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [spedFilter, setSpedFilter] = useState('All');
  
  const gradeLevels = useMemo(
    () => ['All', ...Array.from(new Set(studentsInYear.map(s => s.gradeLevel).filter(Boolean)))],
    [studentsInYear]
  );
  const spedOptions = ['All', 'None', 'SPED', '504'];

  const changeDay = (amount: number) => {
    setSelectedDate(prev => {
        const newDate = new Date(prev + "T12:00:00Z");
        newDate.setDate(newDate.getDate() + amount);
        return toISODateString(newDate);
    });
  };
  
  const extendedStudentData = useMemo(() => {
      const todayStr = toISODateString(new Date());
      return studentsInYear.map(student => {
          const daysAttended = getDaysAttended(student.id, attendance);
          const daysRemaining = student.daysAssigned - daysAttended - (student.creditDays || 0);
          const projectedReleaseDate = calculateProjectedReleaseDate(student, attendance, holidays, todayStr);
          return {...student, daysRemaining: daysRemaining > 0 ? daysRemaining : 0, projectedReleaseDate }
      });
  }, [studentsInYear, attendance, holidays]);

  const sortedAndFilteredStudents = useMemo(() => {
    let filteredStudents = extendedStudentData.filter(s => {
        // Base filters
        const eligibleOnDate = s.entryDate <= selectedDate;
        const statusMatch = statusFilter === 'All' || s.status === statusFilter;
        const gradeMatch = gradeFilter === 'All' || s.gradeLevel === gradeFilter;
        const spedMatch = spedFilter === 'All' || s.sped504 === spedFilter;
        const searchMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase());

        if(!eligibleOnDate || !statusMatch || !gradeMatch || !spedMatch || !searchMatch) return false;

        // Attendance filter
        const record = attendance.find(a => a.studentId === s.id && a.date === selectedDate);
        switch(attendanceFilter) {
            case 'Present':
                return record?.presence === Presence.Present;
            case 'Absent':
                return record?.presence === Presence.Absent;
            case 'Pending':
                // Pending only applies to active students on the selected day
                return s.status === StudentStatus.Active && !record;
            case 'All':
            default:
                return true;
        }
    });
    
    return [...filteredStudents].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof DailyStudent];
      const bVal = b[sortConfig.key as keyof DailyStudent];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  }, [extendedStudentData, attendance, statusFilter, attendanceFilter, gradeFilter, spedFilter, selectedDate, sortConfig, searchTerm]);

  const handleMarkAttendance = (studentId: string, currentPresence: Presence | undefined, targetPresence: Presence) => {
    const newPresence = currentPresence === targetPresence ? null : targetPresence;
    markAttendance(studentId, selectedDate, newPresence);
  };
  
  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getCellValue = (student: DailyStudent, columnId: SortKey) => {
    switch(columnId) {
        case 'lastName':
            return <Link to={`/student/${student.id}`} className="hover:underline text-brand-dark dark:text-brand-light">{student.lastName}</Link>;
        case 'firstName':
            return student.firstName;
        case 'id':
            return student.id;
        case 'campus':
            return student.campus;
        case 'gradeLevel':
            return student.gradeLevel;
        case 'status':
            return <StatusBadge status={student.status} />;
        case 'daysRemaining':
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.daysRemaining > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{student.daysRemaining}</span>
        case 'projectedReleaseDate': {
            const dateVal = student.projectedReleaseDate;
            return dateVal && dateVal !== 'N/A' && dateVal !== 'Completed' ? formatDateForDisplay(dateVal as string) : dateVal;
        }
        default:
            return student[columnId as keyof DailyStudent] as string | number;
    }
  }
  
  if (loading) return <div className="text-center p-8">Loading student data...</div>;

  return (
    <div className="space-y-6">
       <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDay(-1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Prev Day</button>
           <input 
              id="date-selector"
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
            />
          <button onClick={() => changeDay(1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Next Day</button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex items-center gap-4 flex-wrap">
            <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
            />
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    <option value="All">All</option>
                    <option value={StudentStatus.Active}>Active</option>
                    <option value={StudentStatus.Completed}>Completed</option>
                    <option value={StudentStatus.Withdrawn}>Withdrawn</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Attendance:</label>
                <select value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value as any)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    <option value="All">All</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Pending">Pending</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Grade:</label>
                <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">SPED/504:</label>
                <select value={spedFilter} onChange={e => setSpedFilter(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    {spedOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
       </div>
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {dailyViewColumns.map(col => (
                <th 
                  key={col.id} 
                  onClick={() => requestSort(col.id)} 
                  className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                >
                    {col.label} {sortConfig.key === col.id ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attendance</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
             {sortedAndFilteredStudents.map(student => {
               const attendanceRecord = attendance.find(a => a.studentId === student.id && a.date === selectedDate);
               const isDisabled = student.status !== StudentStatus.Active;
               
               return (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    {dailyViewColumns.map(col => (
                        <td key={col.id} className="py-3 px-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-100">
                            {getCellValue(student, col.id)}
                        </td>
                    ))}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex justify-center items-center gap-4">
                        {isDisabled ? (
                           <span className="text-sm text-slate-400 dark:text-slate-500">N/A</span>
                        ) : (
                          <>
                            <AttendanceButton 
                                currentPresence={attendanceRecord?.presence} 
                                targetPresence={Presence.Present}
                                onClick={() => handleMarkAttendance(student.id, attendanceRecord?.presence, Presence.Present)}
                            />
                            <AttendanceButton 
                                currentPresence={attendanceRecord?.presence} 
                                targetPresence={Presence.Absent}
                                onClick={() => handleMarkAttendance(student.id, attendanceRecord?.presence, Presence.Absent)}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
               );
             })}
          </tbody>
        </table>
        {sortedAndFilteredStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students match the current filter.</p>}
      </div>
    </div>
  );
};

```

## components/pages/HelpPage.tsx

```
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
```

## components/pages/HolidaysPage.tsx

```
import React, { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { TrashIcon } from '../icons/Icons';

export const HolidaysPage: React.FC = () => {
  const { holidays, addHoliday, removeHoliday, loading } = useAppData();
  const [newHolidayDate, setNewHolidayDate] = useState(toISODateString(new Date()));
  const [newHolidayName, setNewHolidayName] = useState('');
  const [error, setError] = useState('');

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim()) {
      setError('Holiday name is required.');
      return;
    }
    if (holidays.some(h => h.date === newHolidayDate)) {
      setError('This date is already a holiday.');
      return;
    }
    setError('');
    addHoliday({ date: newHolidayDate, name: newHolidayName });
    setNewHolidayName('');
  };

  if (loading) return <div className="text-center p-8">Loading holiday data...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Add Holiday</h3>
          <form onSubmit={handleAddHoliday} className="space-y-4">
            <div>
              <label htmlFor="holiday-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Holiday Name</label>
              <input 
                id="holiday-name"
                type="text"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                placeholder="e.g., Winter Break"
              />
            </div>
            <div>
              <label htmlFor="holiday-date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Date</label>
              <input 
                id="holiday-date"
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm">
              Add Holiday
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Holiday List</h3>
          <div className="max-h-[60vh] overflow-y-auto">
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {holidays.length > 0 ? holidays.map(holiday => (
                <li key={holiday.date} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{holiday.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateForDisplay(holiday.date)}</p>
                  </div>
                  <button onClick={() => removeHoliday(holiday.date)} className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/50 transition-colors">
                    <TrashIcon />
                  </button>
                </li>
              )) : <p className="text-slate-500 dark:text-slate-400">No holidays have been added yet.</p>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## components/pages/WeeklyView.tsx

```
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Presence, Student, StudentStatus } from '../../types';
import { toISODateString, getDaysAttended, formatDateForDisplay, getStartOfWeek, getWeekDays, calculateProjectedReleaseDate } from '../../services/dateUtils';
import { CheckCircleIcon, XCircleIcon } from '../icons/Icons';

const AttendanceButton: React.FC<{ currentPresence?: Presence; targetPresence: Presence; onClick: () => void }> = ({ currentPresence, targetPresence, onClick }) => {
  const isSelected = currentPresence === targetPresence;

  return (
    <button onClick={onClick} className={`p-1 rounded-full transition-colors duration-150 ${isSelected ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      {targetPresence === Presence.Present ? 
        <CheckCircleIcon className={`h-6 w-6 transition-all ${isSelected ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-500 hover:text-emerald-400'}`} /> : 
        <XCircleIcon className={`h-6 w-6 transition-all ${isSelected ? 'text-rose-500' : 'text-slate-300 dark:text-slate-500 hover:text-rose-400'}`} />
      }
    </button>
  );
};

type WeeklyStudent = Student & { daysRemaining: number; projectedReleaseDate: string; };
type SortKey = keyof WeeklyStudent | string;

const fixedColumns: { id: SortKey; label: string; isSticky?: boolean; widthClass?: string }[] = [
    { id: 'lastName', label: 'Last Name', isSticky: true, widthClass: 'w-32' },
    { id: 'firstName', label: 'First Name', isSticky: true, widthClass: 'w-32' },
    { id: 'id', label: 'ID', widthClass: 'w-28' },
    { id: 'campus', label: 'Campus', widthClass: 'w-28' },
    { id: 'gradeLevel', label: 'Grade', widthClass: 'w-20' },
    { id: 'status', label: 'Status', widthClass: 'w-24' },
    { id: 'daysRemaining', label: 'Days Left', widthClass: 'w-24' },
    { id: 'projectedReleaseDate', label: 'Release Date', widthClass: 'w-32' },
];

const StatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  const colorClasses = {
    [StudentStatus.Active]: 'bg-emerald-100 text-emerald-800',
    [StudentStatus.Completed]: 'bg-sky-100 text-sky-800',
    [StudentStatus.Withdrawn]: 'bg-slate-100 text-slate-800',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[status]}`}>{status}</span>;
};


export const WeeklyView: React.FC = () => {
  const { students, attendance, holidays, markAttendance, loading } = useAppData();
  const { settings } = useSettings();

  const studentsInYear = useMemo(
    () => students.filter(s =>
      s.registrationDate >= settings.schoolYearStartDate &&
      s.registrationDate <= settings.schoolYearEndDate
    ),
    [students, settings.schoolYearStartDate, settings.schoolYearEndDate]
  );

  const [currentDate, setCurrentDate] = useState<string>(toISODateString(new Date()));
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'lastName', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'All'>(StudentStatus.Active);
  const [gradeFilter, setGradeFilter] = useState('All');
  const [spedFilter, setSpedFilter] = useState('All');

  const gradeLevels = useMemo(
    () => ['All', ...Array.from(new Set(studentsInYear.map(s => s.gradeLevel).filter(Boolean)))],
    [studentsInYear]
  );
  const spedOptions = ['All', 'None', 'SPED', '504'];


  const startOfWeek = useMemo(() => getStartOfWeek(new Date(currentDate + 'T12:00:00Z')), [currentDate]);
  const displayDays = useMemo(() => getWeekDays(startOfWeek), [startOfWeek]);
  
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const todayStr = toISODateString(new Date());

  const changeWeek = (offset: number) => {
    setCurrentDate(prev => {
        const newDate = new Date(prev + 'T12:00:00Z');
        newDate.setDate(newDate.getDate() + (offset * 7));
        return toISODateString(newDate);
    });
  };

  const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateVal = e.target.value;
      if (dateVal) {
        setCurrentDate(dateVal);
      }
  }

  const extendedStudentData = useMemo(() => {
      const todayStr = toISODateString(new Date());
      return studentsInYear.map(student => {
          const daysAttended = getDaysAttended(student.id, attendance);
          const daysRemaining = student.daysAssigned - daysAttended - (student.creditDays || 0);
          const projectedReleaseDate = calculateProjectedReleaseDate(student, attendance, holidays, todayStr);
          return {...student, daysRemaining: daysRemaining > 0 ? daysRemaining : 0, projectedReleaseDate }
      });
  }, [studentsInYear, attendance, holidays]);

  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = extendedStudentData.filter(s => {
        const statusMatch = statusFilter === 'All' || s.status === statusFilter;
        const gradeMatch = gradeFilter === 'All' || s.gradeLevel === gradeFilter;
        const spedMatch = spedFilter === 'All' || s.sped504 === spedFilter;
        const searchMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase());
        return statusMatch && gradeMatch && spedMatch && searchMatch;
    });
    
    return [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof WeeklyStudent];
      const bVal = b[sortConfig.key as keyof WeeklyStudent];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [extendedStudentData, statusFilter, gradeFilter, spedFilter, sortConfig, searchTerm]);

  const handleMarkAttendance = (studentId: string, date: string, currentPresence: Presence | undefined, targetPresence: Presence) => {
    const newPresence = currentPresence === targetPresence ? null : targetPresence;
    markAttendance(studentId, date, newPresence);
  };
  
  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getCellValue = (student: WeeklyStudent, columnId: SortKey) => {
    switch(columnId) {
        case 'lastName':
            return <Link to={`/student/${student.id}`} className="hover:underline text-brand-dark dark:text-brand-light">{student.lastName}</Link>;
        case 'firstName':
            return student.firstName;
        case 'id':
            return student.id;
        case 'campus':
            return student.campus;
        case 'gradeLevel':
            return student.gradeLevel;
        case 'status':
            return <StatusBadge status={student.status} />;
        case 'daysRemaining':
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.daysRemaining > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{student.daysRemaining}</span>
        case 'projectedReleaseDate': {
            const dateVal = student.projectedReleaseDate;
            return dateVal && dateVal !== 'N/A' && dateVal !== 'Completed' ? formatDateForDisplay(dateVal as string) : dateVal;
        }
        default:
            return student[columnId as keyof WeeklyStudent] as string | number;
    }
  }

  if (loading) return <div className="text-center p-8">Loading student data...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => changeWeek(-1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Prev Week</button>
            <input type="date" value={currentDate} onChange={handleDateJump} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" />
            <button onClick={() => changeWeek(1)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">Next Week</button>
        </div>
      </div>

       <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex items-center gap-4 flex-wrap">
            <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
            />
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    <option value="All">All</option>
                    <option value={StudentStatus.Active}>Active</option>
                    <option value={StudentStatus.Completed}>Completed</option>
                    <option value={StudentStatus.Withdrawn}>Withdrawn</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Grade:</label>
                <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">SPED/504:</label>
                <select value={spedFilter} onChange={e => setSpedFilter(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
                    {spedOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
       </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {fixedColumns.map((col, index) => (
                <th 
                  key={col.id} 
                  onClick={() => requestSort(col.id)} 
                  className={`py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap ${col.isSticky ? `sticky z-20 bg-slate-50 dark:bg-slate-800 ${index === 0 ? 'left-0' : 'left-32'}` : ''} ${col.widthClass ? col.widthClass : ''}`}
                >
                    {col.label} {sortConfig.key === col.id ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              {displayDays.map(day => (
                <th key={day.toISOString()} className="py-3 px-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  <span className="block font-normal text-slate-400">{formatDateForDisplay(day)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
            {sortedAndFilteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  {fixedColumns.map((col, index) => (
                      <td key={col.id} className={`py-3 px-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 ${col.isSticky ? `sticky z-10 ${index === 0 ? 'left-0' : 'left-32'}`: ''} ${col.widthClass ? col.widthClass : ''}`}>
                        {getCellValue(student, col.id)}
                      </td>
                  ))}
                  {displayDays.map(day => {
                    const dateStr = toISODateString(day);
                    const attendanceRecord = attendance.find(a => a.studentId === student.id && a.date === dateStr);
                    const isFuture = dateStr > todayStr;
                    const isBeforeEntry = dateStr < student.entryDate;
                    const isHoliday = holidaySet.has(dateStr);
                    const isDisabled = student.status !== StudentStatus.Active || isFuture || isBeforeEntry || isHoliday;
                    const isRegistrationDay = student.registrationDate === dateStr;
                    
                    if (isHoliday) {
                        return <td key={dateStr} className="py-3 px-4 text-center bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 text-xs font-bold">HOLIDAY</td>
                    }

                    return (
                      <td key={dateStr} className="py-3 px-4 text-center relative">
                        {isRegistrationDay && <span className="absolute top-1 right-1 text-xs font-bold text-purple-600 dark:text-purple-400" title={`Registered on ${formatDateForDisplay(dateStr)}`}>R</span>}
                        {isDisabled ? <div className="h-8 w-16" /> : (
                            <div className="flex justify-center items-center gap-2">
                                <AttendanceButton 
                                    currentPresence={attendanceRecord?.presence} 
                                    targetPresence={Presence.Present}
                                    onClick={() => handleMarkAttendance(student.id, dateStr, attendanceRecord?.presence, Presence.Present)}
                                />
                                <AttendanceButton 
                                    currentPresence={attendanceRecord?.presence} 
                                    targetPresence={Presence.Absent}
                                    onClick={() => handleMarkAttendance(student.id, dateStr, attendanceRecord?.presence, Presence.Absent)}
                                />
                            </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
        {sortedAndFilteredStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students match the current filter.</p>}
      </div>
    </div>
  );
};
```

## components/pages/RosterPage.tsx

```
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Student, StudentStatus, CustomFieldDefinition } from '../../types';
import { calculateProjectedReleaseDate, getDaysAttended, toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { exportToCsv } from '../../services/csvService';
import { StudentFormModal } from '../common/StudentFormModal';
import { DocumentArrowDownIcon } from '../icons/Icons';

type SortKey = keyof ExtendedStudent | string;
type SortDirection = 'asc' | 'desc';
type ExtendedStudent = Student & {
    daysAttended: number;
    daysRemaining: number;
    projectedReleaseDate: string;
};
type ColumnDefinition = { id: SortKey; label: string; isCustom: boolean };

const StatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  const colorClasses = {
    [StudentStatus.Active]: 'bg-emerald-100 text-emerald-800',
    [StudentStatus.Completed]: 'bg-sky-100 text-sky-800',
    [StudentStatus.Withdrawn]: 'bg-slate-100 text-slate-800',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[status]}`}>{status}</span>;
};

const ColumnConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    allColumns: ColumnDefinition[];
    visibleColumns: string[];
    columnOrder: string[];
    onConfigChange: (newVisible: string[], newOrder: string[]) => void;
}> = ({ isOpen, onClose, allColumns, visibleColumns, columnOrder, onConfigChange }) => {
    const [localVisible, setLocalVisible] = useState(visibleColumns);
    const [localOrder, setLocalOrder] = useState(columnOrder);

    useEffect(() => {
        setLocalVisible(visibleColumns);
        setLocalOrder(columnOrder);
    }, [isOpen, visibleColumns, columnOrder]);

    if (!isOpen) return null;

    const handleVisibilityChange = (id: string, checked: boolean) => {
        setLocalVisible(prev => checked ? [...prev, id] : prev.filter(colId => colId !== id));
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...localOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newOrder.length) {
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
            setLocalOrder(newOrder);
        }
    };

    const handleSave = () => {
        if (localVisible.length === 0) {
            alert("You must select at least one column to display.");
            return;
        }
        onConfigChange(localVisible, localOrder);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold p-4 border-b dark:border-slate-700 dark:text-white">Configure Columns</h3>
                <ul className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {allColumns.map(col => {
                        const orderIndex = localOrder.indexOf(col.id);
                        return (
                        <li key={col.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-md">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={localVisible.includes(col.id)}
                                    onChange={e => handleVisibilityChange(col.id, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand-dark"
                                />
                                <label className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-200">{col.label}</label>
                            </div>
                            <div className="flex items-center gap-2 dark:text-white">
                                <button onClick={() => moveColumn(orderIndex, 'up')} disabled={orderIndex <= 0} className="p-1 disabled:opacity-25">&uarr;</button>
                                <button onClick={() => moveColumn(orderIndex, 'down')} disabled={orderIndex === -1 || orderIndex >= localOrder.length - 1} className="p-1 disabled:opacity-25">&darr;</button>
                            </div>
                        </li>
                    )})}
                </ul>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md border dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md">Save</button>
                </div>
            </div>
        </div>
    );
};

const FilterSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & {label: string}> = ({ label, children, ...props}) => (
    <div>
        <label htmlFor={props.id} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
        <select {...props} className="w-full p-2 border rounded-md text-sm bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600 border-slate-300">
            {children}
        </select>
    </div>
);

const initialFilters = {
    status: 'All',
    campus: 'All',
    gradeLevel: 'All',
    sped504: 'All',
    entryDateFrom: '',
    entryDateTo: ''
};

export const RosterPage: React.FC = () => {
  const { students, attendance, holidays, customFieldDefinitions, addStudent, updateStudent, loading } = useAppData();
  const { settings, saveSettings } = useSettings();

  const studentsInYear = useMemo(
    () => students.filter(s =>
      s.registrationDate >= settings.schoolYearStartDate &&
      s.registrationDate <= settings.schoolYearEndDate
    ),
    [students, settings.schoolYearStartDate, settings.schoolYearEndDate]
  );
  
  const { rosterColumnOrder } = settings;
  const rosterVisibleColumns = useMemo(() => (
    (settings.rosterVisibleColumns && settings.rosterVisibleColumns.length > 0)
        ? settings.rosterVisibleColumns
        : ['lastName', 'firstName', 'status', 'projectedReleaseDate']
  ), [settings.rosterVisibleColumns]);


  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'lastName', direction: 'asc' });
  const [projectionMethod, setProjectionMethod] = useState<'today' | 'entryDate'>('today');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  const campuses = useMemo(
    () => ['All', ...Array.from(new Set(studentsInYear.map(s => s.campus).filter(Boolean)))],
    [studentsInYear]
  );
  const gradeLevels = useMemo(
    () => ['All', ...Array.from(new Set(studentsInYear.map(s => s.gradeLevel).filter(Boolean)))],
    [studentsInYear]
  );
  const spedOptions = ['All', 'None', 'SPED', '504'];
  const statusOptions = ['All', ...Object.values(StudentStatus)];

  const allColumns = useMemo((): ColumnDefinition[] => {
      const standardCols: ColumnDefinition[] = [
          { id: 'id', label: 'Student ID', isCustom: false },
          { id: 'lastName', label: 'Last Name', isCustom: false },
          { id: 'firstName', label: 'First Name', isCustom: false },
          { id: 'campus', label: 'Campus', isCustom: false },
          { id: 'gradeLevel', label: 'Grade Level', isCustom: false },
          { id: 'sped504', label: 'SPED/504', isCustom: false },
          { id: 'drgOffense', label: 'DRG Offense', isCustom: false },
          { id: 'creditDays', label: 'Credit Days', isCustom: false },
          { id: 'status', label: 'Status', isCustom: false },
          { id: 'registrationDate', label: 'Registration Date', isCustom: false },
          { id: 'entryDate', label: 'Entry Date', isCustom: false },
          { id: 'daysAssigned', label: 'Days Assigned', isCustom: false },
          { id: 'daysAttended', label: 'Days Attended', isCustom: false },
          { id: 'daysRemaining', label: 'Days Remaining', isCustom: false },
          { id: 'projectedReleaseDate', label: 'Projected Release', isCustom: false },
          { id: 'comments', label: 'Comments', isCustom: false },
      ];
      const customCols: ColumnDefinition[] = customFieldDefinitions.map(cf => ({ id: cf.id, label: cf.name, isCustom: true }));
      return [...standardCols, ...customCols];
  }, [customFieldDefinitions]);
  
  useEffect(() => {
    const customCols = customFieldDefinitions.map(cf => cf.id);
    const newCols = customCols.filter(c => !rosterColumnOrder.includes(c));
    if (newCols.length > 0) {
        saveSettings({ rosterColumnOrder: [...rosterColumnOrder, ...newCols] });
    }
  }, [customFieldDefinitions, rosterColumnOrder, saveSettings]);

  const studentData = useMemo(() => {
    return studentsInYear.map(student => {
      const daysAttended = getDaysAttended(student.id, attendance);
      const creditDays = student.creditDays || 0;
      const daysRemaining = Math.max(0, student.daysAssigned - daysAttended - creditDays);
      const projectionStartDate = projectionMethod === 'today' ? toISODateString(new Date()) : student.entryDate;
      const projectedReleaseDate = calculateProjectedReleaseDate(student, attendance, holidays, projectionStartDate);
      return { ...student, daysAttended, daysRemaining, projectedReleaseDate };
    });
  }, [studentsInYear, attendance, holidays, projectionMethod]);

  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = studentData.filter(s => {
      const searchMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = filters.status === 'All' || s.status === filters.status;
      const campusMatch = filters.campus === 'All' || s.campus === filters.campus;
      const gradeMatch = filters.gradeLevel === 'All' || s.gradeLevel === filters.gradeLevel;
      const spedMatch = filters.sped504 === 'All' || s.sped504 === filters.sped504;
      const entryDateFromMatch = !filters.entryDateFrom || s.entryDate >= filters.entryDateFrom;
      const entryDateToMatch = !filters.entryDateTo || s.entryDate <= filters.entryDateTo;

      return searchMatch && statusMatch && campusMatch && gradeMatch && spedMatch && entryDateFromMatch && entryDateToMatch;
    });

    filtered.sort((a, b) => {
      let aVal, bVal;
      const customFieldDef = customFieldDefinitions.find(cf => cf.id === sortConfig.key);
      
      if(customFieldDef) {
          aVal = a.customFields[sortConfig.key];
          bVal = b.customFields[sortConfig.key];
      } else {
          aVal = a[sortConfig.key as keyof ExtendedStudent];
          bVal = b[sortConfig.key as keyof ExtendedStudent];
      }
      
      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      else if (aVal < bVal) comparison = -1;
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [studentData, searchTerm, sortConfig, customFieldDefinitions, filters]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const handleSaveStudent = (student: Student) => {
    if (students.some(s => s.id === student.id)) {
      updateStudent(student);
    } else {
      addStudent(student);
    }
  };
  
  const handleConfigChange = (newVisible: string[], newOrder: string[]) => {
      saveSettings({
          rosterVisibleColumns: newVisible,
          rosterColumnOrder: newOrder
      });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters(prev => ({ ...prev, [name]: value }));
  }

  const orderedVisibleHeaders = useMemo(() => {
      return rosterColumnOrder
        .map(id => allColumns.find(c => c.id === id))
        .filter((c): c is ColumnDefinition => !!c && rosterVisibleColumns.includes(c.id));
  }, [rosterColumnOrder, rosterVisibleColumns, allColumns]);
  
  const handleExport = () => {
    const headers = orderedVisibleHeaders.map(col => ({ key: col.id, label: col.label }));
    const dataToExport = sortedAndFilteredStudents.map(student => {
        const row: Record<string, any> = {};
        headers.forEach(h => {
            if (allColumns.find(c => c.id === h.key)?.isCustom) {
                row[h.key] = student.customFields[h.key] ?? '';
            } else {
                row[h.key] = student[h.key as keyof ExtendedStudent];
            }
        });
        return row;
    });
    exportToCsv(`student-roster-${toISODateString(new Date())}`, dataToExport, headers);
  };

  if (loading) return <div className="text-center p-8">Loading student data...</div>;

  return (
    <div className="space-y-6">
      <StudentFormModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} onSave={handleSaveStudent} existingIds={students.map(s => s.id)} customFieldDefinitions={customFieldDefinitions} />
      <ColumnConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} allColumns={allColumns} visibleColumns={rosterVisibleColumns} columnOrder={rosterColumnOrder} onConfigChange={handleConfigChange} />

      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-between items-center gap-4 flex-wrap">
        <input 
          type="text"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full md:w-1/3 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
        />
        <div className="flex items-center gap-2 flex-wrap">
           <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button onClick={() => setProjectionMethod('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${projectionMethod === 'today' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Project from Today</button>
              <button onClick={() => setProjectionMethod('entryDate')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${projectionMethod === 'entryDate' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Project from Entry</button>
           </div>
           <button onClick={() => setIsConfigModalOpen(true)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 whitespace-nowrap">Configure Columns</button>
           <button onClick={handleExport} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 whitespace-nowrap flex items-center gap-2"><DocumentArrowDownIcon className="h-5 w-5" /> Export CSV</button>
          <button onClick={() => setIsStudentModalOpen(true)} className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm whitespace-nowrap">Add Student</button>
        </div>
      </div>
       <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm space-y-4">
            <h4 className="font-bold text-slate-700 dark:text-slate-200">Filters</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                <FilterSelect label="Status" name="status" value={filters.status} onChange={handleFilterChange}>{statusOptions.map(o => <option key={o} value={o}>{o}</option>)}</FilterSelect>
                <FilterSelect label="Campus" name="campus" value={filters.campus} onChange={handleFilterChange}>{campuses.map(o => <option key={o} value={o}>{o}</option>)}</FilterSelect>
                <FilterSelect label="Grade" name="gradeLevel" value={filters.gradeLevel} onChange={handleFilterChange}>{gradeLevels.map(o => <option key={o} value={o}>{o}</option>)}</FilterSelect>
                <FilterSelect label="SPED/504" name="sped504" value={filters.sped504} onChange={handleFilterChange}>{spedOptions.map(o => <option key={o} value={o}>{o}</option>)}</FilterSelect>
                <div>
                     <label htmlFor="entryDateFrom" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Entry Date From</label>
                     <input type="date" name="entryDateFrom" value={filters.entryDateFrom} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600 border-slate-300" />
                </div>
                 <div>
                     <label htmlFor="entryDateTo" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Entry Date To</label>
                     <input type="date" name="entryDateTo" value={filters.entryDateTo} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600 border-slate-300" />
                </div>
                <button onClick={() => setFilters(initialFilters)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 h-10">Reset Filters</button>
            </div>
       </div>
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {orderedVisibleHeaders.map(col => (
                <th key={col.id} className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(col.id)}>
                    {col.label} {sortConfig.key === col.id ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
            {sortedAndFilteredStudents.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                {orderedVisibleHeaders.map(col => {
                    let cellContent: any;
                    const isDateColumn = ['registrationDate', 'entryDate', 'projectedReleaseDate'].includes(col.id as string);

                    if(col.isCustom) {
                        cellContent = s.customFields[col.id] ?? 'N/A';
                    } else if (col.id === 'lastName') {
                        cellContent = <Link to={`/student/${s.id}`} className="font-medium text-brand-dark hover:underline dark:text-brand-light">{s.lastName}</Link>;
                    } else if (col.id === 'status') {
                        cellContent = <StatusBadge status={s.status} />;
                    } else if (isDateColumn) {
                         const dateVal = s[col.id as keyof ExtendedStudent];
                         cellContent = dateVal && dateVal !== 'N/A' && dateVal !== 'Completed' ? formatDateForDisplay(dateVal as string) : dateVal;
                    }
                    else {
                        cellContent = s[col.id as keyof ExtendedStudent];
                    }
                    return <td key={col.id} className="py-3 px-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{cellContent}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {sortedAndFilteredStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students found.</p>}
      </div>
    </div>
  );
};
```

## components/pages/DataManagementPage.tsx

```
import React, { useRef, useState } from 'react';
import { getAppData, saveAppData } from '../../services/storageService';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { CustomFieldDefinition } from '../../types';
import { TrashIcon } from '../icons/Icons';

export const DataManagementPage: React.FC = () => {
  const { customFieldDefinitions, addCustomFieldDefinition, removeCustomFieldDefinition, refreshData } = useAppData();
  const { settings, saveSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date'>('text');
  const [error, setError] = useState('');

  const handleExport = () => {
    const data = getAppData();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `step-academy-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (settings.showConfirmations && !window.confirm("Are you sure you want to import this file? This will overwrite all existing data.")) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File is not readable");
        const importedData = JSON.parse(text);
        
        if ('students' in importedData && 'attendance' in importedData && 'holidays' in importedData) {
          saveAppData(importedData);
          alert("Data imported successfully!");
          refreshData();
          window.location.reload(); 
        } else {
          throw new Error("Invalid data structure in JSON file.");
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert(`Import failed. Please check the file format. Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
         if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newFieldName.trim()) {
      setError("Field name cannot be empty.");
      return;
    }
    const fieldId = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (customFieldDefinitions.some(f => f.id === fieldId)) {
      setError("A field with this name already exists.");
      return;
    }

    const newField: CustomFieldDefinition = {
      id: fieldId,
      name: newFieldName.trim(),
      type: newFieldType,
    };
    addCustomFieldDefinition(newField);
    setNewFieldName('');
    setNewFieldType('text');
  };
  
  const handleRemoveCustomField = (fieldId: string) => {
    if (settings.showConfirmations && !window.confirm("Are you sure you want to remove this custom field? This will delete all data associated with it from all students.")) {
        return;
    }
    // Remove from roster settings
    saveSettings({
      rosterVisibleColumns: settings.rosterVisibleColumns.filter(id => id !== fieldId),
      rosterColumnOrder: settings.rosterColumnOrder.filter(id => id !== fieldId),
    });
    // Remove from student data
    removeCustomFieldDefinition(fieldId);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b dark:border-slate-700 pb-3 mb-4">Custom Student Fields</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-4">Add custom fields to the student profile. These will appear on the student form and can be displayed on the roster.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Existing Fields</h4>
            <ul className="space-y-2">
              {customFieldDefinitions.map(field => (
                <li key={field.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                  <div>
                    <span className="font-medium dark:text-slate-200">{field.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{field.type}</span>
                  </div>
                  <button onClick={() => handleRemoveCustomField(field.id)} className="text-slate-400 hover:text-rose-500 p-1 rounded-full"><TrashIcon /></button>
                </li>
              ))}
              {customFieldDefinitions.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No custom fields defined.</p>}
            </ul>
          </div>
          <form onSubmit={handleAddCustomField} className="space-y-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">Add New Field</h4>
            <div>
                <label htmlFor="new-field-name" className="text-sm font-medium text-slate-600 dark:text-slate-300">Field Name</label>
                <input id="new-field-name" type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="w-full p-2 mt-1 border rounded-md bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600" placeholder="e.g., Guardian Phone"/>
            </div>
            <div>
                <label htmlFor="new-field-type" className="text-sm font-medium text-slate-600 dark:text-slate-300">Field Type</label>
                <select id="new-field-type" value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)} className="w-full p-2 mt-1 border rounded-md bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                </select>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" className="w-full px-4 py-2 bg-brand-dark hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm">Add Field</button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b dark:border-slate-700 pb-3 mb-4">Export Data</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Export all your students, attendance records, holidays, and custom fields into a single JSON file.
        </p>
        <button 
          onClick={handleExport}
          className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm"
        >
          Export All Data
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border-l-4 border-rose-500">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b dark:border-slate-700 pb-3 mb-4">Import Data</h3>
        <div className="bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 p-3 rounded-md mb-4">
          <p className="font-bold">Warning!</p>
          <p>Importing a file will completely overwrite all current application data. This action cannot be undone.</p>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Choose a previously exported JSON file to restore your application data.
        </p>
        <input 
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileSelected}
          className="hidden"
        />
        <button
          onClick={handleImportClick}
          className="cursor-pointer px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md shadow-sm inline-block"
        >
          Choose File and Import
        </button>
      </div>
    </div>
  );
};
```

## components/pages/StudentDetailPage.tsx

```
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Student, StudentStatus, Presence } from '../../types';
import { calculateProjectedReleaseDate, getDaysAttended, toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { StudentFormModal } from '../common/StudentFormModal';
import { AttendanceCalendar } from '../common/AttendanceCalendar';
import { PencilIcon, PrinterIcon, UserCircleIcon, PhoneIcon } from '../icons/Icons';

const StatCard: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg text-center shadow-sm print:shadow-none print:border print:border-slate-200">
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
  </div>
);

const ContactInfoCard: React.FC<{student: Student}> = ({ student }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Contact Information</h3>
       <div className="space-y-4 text-sm">
            <div>
               <dt className="font-semibold text-slate-600 dark:text-slate-400">Guardian</dt>
               <dd className="text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-1">
                <span>{student.guardianName || 'N/A'}</span>
                {student.guardianPhone && <span className="flex items-center gap-1 text-slate-500"><PhoneIcon className="h-4 w-4" /> {student.guardianPhone}</span>}
                </dd>
           </div>
           <div>
               <dt className="font-semibold text-slate-600 dark:text-slate-400">Emergency Contact</dt>
               <dd className="text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-1">
                <span>{student.emergencyContactName || 'N/A'}</span>
                {student.emergencyContactPhone && <span className="flex items-center gap-1 text-slate-500"><PhoneIcon className="h-4 w-4" /> {student.emergencyContactPhone}</span>}
                </dd>
           </div>
       </div>
    </div>
)


export const StudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { students, attendance, holidays, customFieldDefinitions, updateStudent, loading } = useAppData();
  const { settings } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectionMethod, setProjectionMethod] = useState<'entryDate' | 'today'>('today');

  const student = useMemo(
    () => students.find(s =>
      s.id === studentId &&
      s.registrationDate >= settings.schoolYearStartDate &&
      s.registrationDate <= settings.schoolYearEndDate
    ),
    [students, studentId, settings.schoolYearStartDate, settings.schoolYearEndDate]
  );

  if (loading) return <div className="text-center p-8">Loading student data...</div>;
  if (!student) return <div className="text-center p-8 text-rose-500 font-bold">Student not found.</div>;

  const daysAttended = getDaysAttended(student.id, attendance);
  const creditDays = student.creditDays || 0;
  const daysRemaining = Math.max(0, student.daysAssigned - daysAttended - creditDays);
  
  const projectionStartDate = projectionMethod === 'today' ? toISODateString(new Date()) : student.entryDate;
  const projectedReleaseDateISO = calculateProjectedReleaseDate(student, attendance, holidays, projectionStartDate);
  const projectedReleaseDate = projectedReleaseDateISO !== 'N/A' && projectedReleaseDateISO !== 'Completed' ? formatDateForDisplay(projectedReleaseDateISO) : projectedReleaseDateISO;
  
  const handlePrint = () => {
    window.print();
  };

  const customFields = customFieldDefinitions
      .map(def => ({...def, value: student.customFields ? student.customFields[def.id] : undefined}))
      .filter(field => field.value !== undefined && field.value !== '');

  const studentAttendance = attendance.filter(a => a.studentId === student.id);

  return (
    <>
    <div className="space-y-6 printable-content">
      <StudentFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={updateStudent} studentToEdit={student} existingIds={[]} customFieldDefinitions={customFieldDefinitions} />

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {student.photoUrl ? <img src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} className="w-full h-full object-cover" /> : <UserCircleIcon className="w-20 h-20 text-slate-400" />}
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{student.firstName} {student.lastName}</h2>
                    <p className="text-slate-500 dark:text-slate-400">ID: {student.id}</p>
                     <p className="text-slate-500 dark:text-slate-400">Status: <span className="font-semibold">{student.status}</span></p>
                </div>
            </div>
            <div className="flex gap-2 print:hidden">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                    <PrinterIcon /> Print
                </button>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                    <PencilIcon /> Edit
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard label="Days Attended" value={daysAttended} />
        <StatCard label="Days Remaining" value={daysRemaining} />
        <StatCard label="Entry Date" value={formatDateForDisplay(student.entryDate)} />
        <StatCard label="Projected Release" value={projectedReleaseDate} />
      </div>

       <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm flex justify-center items-center gap-4 print:hidden">
            <span className="text-sm font-medium">Projection Method:</span>
           <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button onClick={() => setProjectionMethod('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${projectionMethod === 'today' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>From Today</button>
              <button onClick={() => setProjectionMethod('entryDate')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${projectionMethod === 'entryDate' ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>From Entry</button>
           </div>
       </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
            <AttendanceCalendar attendanceRecords={studentAttendance} holidays={holidays} entryDateStr={student.entryDate} registrationDateStr={student.registrationDate} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Comments</h3>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm">{student.comments || "No comments."}</p>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Details</h3>
               <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                   <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">Campus</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.campus || 'N/A'}</dd>
                   </div>
                   <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">Grade Level</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.gradeLevel || 'N/A'}</dd>
                   </div>
                    <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">SPED/504</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.sped504 || 'N/A'}</dd>
                   </div>
                   <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">DRG Offense</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.drgOffense || 'N/A'}</dd>
                   </div>
                   <div>
                       <dt className="font-semibold text-slate-600 dark:text-slate-400">Credit Days</dt>
                       <dd className="text-slate-800 dark:text-slate-200">{student.creditDays || 0}</dd>
                   </div>
               </dl>
            </div>

            <ContactInfoCard student={student} />

            {customFields.length > 0 &&
                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm print:shadow-none print:border print:border-slate-200">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Additional Info</h3>
                   <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                       {customFields.map(field => (
                           <div key={field.id}>
                               <dt className="font-semibold text-slate-600 dark:text-slate-400">{field.name}</dt>
                               <dd className="text-slate-800 dark:text-slate-200">{String(field.value)}</dd>
                           </div>
                       ))}
                   </dl>
                </div>
            }
        </div>
      </div>
    </div>
    </>
  );
};
```

## components/pages/ReportingPage.tsx

```
import React, { useState, useMemo, useEffect } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { Student, StudentStatus, Presence } from '../../types';
import { toISODateString } from '../../services/dateUtils';
import { exportToCsv } from '../../services/csvService';
import { DocumentArrowDownIcon } from '../icons/Icons';
import { Link } from 'react-router-dom';

// Since chart.js is loaded via CDN, we need to declare it to TypeScript
declare const Chart: any;

const StatCard: React.FC<{ label: string; value: string | number; description?: string }> = ({ label, value, description }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg text-center shadow-sm">
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
      {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>}
    </div>
);

const AttendanceTrendChart: React.FC<{data: {date: string; present: number; absent: number}[]}> = ({ data }) => {
    const chartRef = React.useRef<HTMLCanvasElement>(null);
    const chartInstance = React.useRef<any>(null);

    useEffect(() => {
        if (chartRef.current && data.length > 0) {
            const ctx = chartRef.current.getContext('2d');
            if(chartInstance.current) {
                chartInstance.current.destroy();
            }
            chartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.date),
                    datasets: [
                        {
                            label: 'Present',
                            data: data.map(d => d.present),
                            backgroundColor: 'rgba(16, 185, 129, 0.6)',
                            borderColor: 'rgba(16, 185, 129, 1)',
                            borderWidth: 1,
                        },
                        {
                            label: 'Absent',
                            data: data.map(d => d.absent),
                            backgroundColor: 'rgba(244, 63, 94, 0.6)',
                            borderColor: 'rgba(244, 63, 94, 1)',
                            borderWidth: 1,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                tooltipFormat: 'MMM d, yyyy',
                            },
                            stacked: true,
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true
                        },
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    }
                },
            });
        }

        return () => {
            if(chartInstance.current) {
                chartInstance.current.destroy();
            }
        }
    }, [data]);

    return <div className="h-96"><canvas ref={chartRef}></canvas></div>;
};


export const ReportingPage: React.FC = () => {
    const { students, attendance, holidays, loading } = useAppData();
    const { settings } = useSettings();

    const studentsInYear = useMemo(
        () => students.filter(s =>
            s.registrationDate >= settings.schoolYearStartDate &&
            s.registrationDate <= settings.schoolYearEndDate
        ),
        [students, settings.schoolYearStartDate, settings.schoolYearEndDate]
    );
    const [activeTab, setActiveTab] = useState<'dashboard' | 'atRisk'>('dashboard');

    const [atRiskConfig, setAtRiskConfig] = useState({ threshold: 5, days: 30 });

    const analyticsData = useMemo(() => {
        const activeStudents = studentsInYear.filter(s => s.status === StudentStatus.Active);
        if (loading || activeStudents.length === 0) {
            return {
                overallAttendance: 0,
                perfectAttendanceCount: 0,
                chartData: [],
                atRiskStudents: [],
            };
        }

        const today = new Date();
        let totalPossibleDays = 0;
        let totalPresentDays = 0;
        let perfectAttendanceCount = 0;
        const holidaySet = new Set(holidays.map(h => h.date));
        const attendanceByDate: Record<string, {present: number, absent: number}> = {};

        activeStudents.forEach(student => {
            let absences = 0;
            const entryDate = new Date(student.entryDate + "T12:00:00Z");
            let currentDate = new Date(entryDate);

            while(currentDate <= today) {
                const dateStr = toISODateString(currentDate);
                const dayOfWeek = currentDate.getUTCDay();
                if(dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
                    totalPossibleDays++;
                    const record = attendance.find(a => a.studentId === student.id && a.date === dateStr);
                    
                    if(!attendanceByDate[dateStr]) attendanceByDate[dateStr] = {present: 0, absent: 0};
                    
                    if (record?.presence === Presence.Present) {
                        totalPresentDays++;
                        attendanceByDate[dateStr].present++;
                    } else if (record?.presence === Presence.Absent) {
                        absences++;
                        attendanceByDate[dateStr].absent++;
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            if(absences === 0) perfectAttendanceCount++;
        });
        
        const chartData = Object.entries(attendanceByDate)
            .map(([date, counts]) => ({date, ...counts}))
            .sort((a,b) => a.date.localeCompare(b.date))
            .slice(-30); // Last 30 days for the chart

        const atRiskStudents = activeStudents.map(student => {
            const lookbackDate = new Date();
            lookbackDate.setDate(lookbackDate.getDate() - atRiskConfig.days);
            const lookbackDateStr = toISODateString(lookbackDate);
            
            const recentAbsences = attendance.filter(a => 
                a.studentId === student.id && 
                a.presence === Presence.Absent && 
                a.date >= lookbackDateStr
            ).length;
            
            return { student, recentAbsences };
        }).filter(item => item.recentAbsences >= atRiskConfig.threshold);


        return {
            overallAttendance: totalPossibleDays > 0 ? Math.round((totalPresentDays / totalPossibleDays) * 100) : 0,
            perfectAttendanceCount,
            chartData,
            atRiskStudents
        };
    }, [studentsInYear, attendance, holidays, loading, atRiskConfig]);
    
    const handleExportAtRisk = () => {
        const dataToExport = analyticsData.atRiskStudents.map(({ student, recentAbsences }) => ({
            id: student.id,
            lastName: student.lastName,
            firstName: student.firstName,
            campus: student.campus,
            gradeLevel: student.gradeLevel,
            absences: recentAbsences
        }));
        const headers = [
            { key: 'id', label: 'Student ID' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'firstName', label: 'First Name' },
            { key: 'campus', label: 'Campus' },
            { key: 'gradeLevel', label: 'Grade Level' },
            { key: 'absences', label: `Absences in Last ${atRiskConfig.days} Days` },
        ];
        exportToCsv(`at-risk-students-${toISODateString(new Date())}`, dataToExport, headers);
    }
    
    if (loading) return <div>Loading reports...</div>
    
    const activeStudentsCount = studentsInYear.filter(s => s.status === StudentStatus.Active).length;

    return (
        <div className="space-y-6">
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'dashboard' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>Dashboard</button>
                <button onClick={() => setActiveTab('atRisk')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'atRisk' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'}`}>At-Risk Report</button>
            </div>
            
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard label="Overall Attendance" value={`${analyticsData.overallAttendance}%`} description="For all active students" />
                        <StatCard label="Perfect Attendance" value={analyticsData.perfectAttendanceCount} description="Students with zero absences" />
                        <StatCard label="Active Students" value={activeStudentsCount} description="Students currently enrolled" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance Trends (Last 30 Days)</h3>
                        <AttendanceTrendChart data={analyticsData.chartData} />
                    </div>
                </div>
            )}
            
            {activeTab === 'atRisk' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm space-y-4">
                     <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">"At-Risk" Students</h3>
                     <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                         <span className="font-medium">Show students with at least</span>
                         <input type="number" value={atRiskConfig.threshold} onChange={e => setAtRiskConfig(p => ({...p, threshold: parseInt(e.target.value, 10) || 1}))} className="w-20 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                         <span className="font-medium">absences in the last</span>
                          <input type="number" value={atRiskConfig.days} onChange={e => setAtRiskConfig(p => ({...p, days: parseInt(e.target.value, 10) || 1}))} className="w-20 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                          <span className="font-medium">days.</span>
                          <button onClick={handleExportAtRisk} className="ml-auto px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 whitespace-nowrap flex items-center gap-2">
                            <DocumentArrowDownIcon className="h-5 w-5" /> Export CSV
                          </button>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Last Name</th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">First Name</th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Absences</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                {analyticsData.atRiskStudents.map(({ student, recentAbsences }) => (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <td className="py-3 px-4 whitespace-nowrap"><Link to={`/student/${student.id}`} className="font-medium text-brand-dark hover:underline dark:text-brand-light">{student.lastName}</Link></td>
                                        <td className="py-3 px-4 whitespace-nowrap">{student.firstName}</td>
                                        <td className="py-3 px-4 whitespace-nowrap"><span className="font-bold text-rose-600">{recentAbsences}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {analyticsData.atRiskStudents.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">No students meet the at-risk criteria.</p>}
                     </div>
                </div>
            )}
            
        </div>
    );
};

```

## components/icons/Icons.tsx

```
import React from 'react';

type IconProps = { className?: string };

export const CheckCircleIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const XCircleIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const CalendarDaysIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 12.75h.008v.008H12v-.008z" />
  </svg>
);

export const UserGroupIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962c.513-.636 1.25-1.025 2.046-1.134a4.5 4.5 0 012.286 2.286M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const ListBulletIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

export const Cog6ToothIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5M12 4.5v-1.5m0 15v1.5m-4.06-11.44l-1.06-1.06M17.62 17.62l-1.06-1.06M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5M12 4.5v-1.5m0 15v1.5m-4.06-11.44l-1.06-1.06M17.62 17.62l-1.06-1.06" />
    </svg>
);

export const SunIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
);

export const TableCellsIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zM3.375 15h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zM3.375 10.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016zm1.125 0h.008v.016h-.008v-.016z" />
    </svg>
);

export const PencilIcon: React.FC<IconProps> = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
  </svg>
);

export const ArchiveBoxArrowDownIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

export const QuestionMarkCircleIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

export const ChartBarIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

export const DocumentArrowDownIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

export const PrinterIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6 3.369m0 0c.071.011.141.022.21.033m-2.211 9.941a42.67 42.67 0 0010.56 0M6 13.829c-.24.03-.48.062-.72.096m11.28-10.033c.071-.011.141-.022.21-.033m-1.605 9.941c.24-.03.48-.062.72-.096m-11.28 0c.24.03.48.062.72.096M6 3.369c.071.011.141.022.21.033m10.89-1.004c.071-.011.141-.022.21-.033m0 0c.24.03.48.062.72.096M12 3.852l.071-.011m0 0c.071.011.141.022.21.033M12 3.852c.071-.011.141-.022.21-.033M12 3.852l-.071-.011m0 0c-.071.011-.141.022-.21.033M12 3.852c-.071-.011-.141-.022-.21-.033M3 13.829c.24-.03.48-.062.72-.096m11.28 0c.24.03.48.062.72.096m-12 3.355c.24-.03.48-.062.72-.096m11.28 0c.24.03.48.062.72.096M18 6.75h.008v.008H18V6.75zm-6 0h.008v.008H12V6.75zm-6 0h.008v.008H6V6.75zm.25 10.312a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.25a.75.75 0 01-.75-.75z" />
    </svg>
);

export const CameraIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);

export const UserCircleIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z" />
    </svg>
);

export const StepAcademyLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 350 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="S.T.E.P. Academy Logo"
    >
        <g transform="translate(50 50)" fill="#800000">
            {/* Wheel */}
            <circle cx="0" cy="0" r="40" />
            <circle cx="0" cy="0" r="30" fill="white" />
            <circle cx="0" cy="0" r="22" />

            {/* Spokes */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(r => (
                <g key={r} transform={`rotate(${r})`}>
                    <rect x="-4" y="-35" width="8" height="15" rx="2" />
                    <circle cx="0" cy="-42" r="5" />
                </g>
            ))}

            {/* Center */}
            <circle cx="0" cy="0" r="18" fill="white" />
            <circle cx="0" cy="0" r="16" />
            <text x="0" y="3" fill="white" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">S.T.E.P.</text>
        </g>
        
        <text x="115" y="45" fill="#800000" fontSize="28" fontWeight="bold" fontFamily="Arial, sans-serif">S.T.E.P.</text>
        <text x="115" y="78" fill="#800000" fontSize="28" fontFamily="'Times New Roman', serif">Academy</text>
    </svg>
);
```

