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