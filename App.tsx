import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { WeeklyView } from './components/pages/WeeklyView';
import { DailyView } from './components/pages/DailyView';
import { RosterPage } from './components/pages/RosterPage';
import { StudentDetailPage } from './components/pages/StudentDetailPage';
import { HolidaysPage } from './components/pages/HolidaysPage';
import { SchoolYearsPage } from './components/pages/SchoolYearsPage';
import { DataManagementPage } from './components/pages/DataManagementPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { HelpPage } from './components/pages/HelpPage';
import { ReportingPage } from './components/pages/ReportingPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { AuditLogPage } from './components/pages/AuditLogPage';
import { RedirectToDefault } from './components/common/RedirectToDefault';
import { useSettings } from './hooks/useSettings';
import { runAutoBackupIfNeeded } from './services/backupService';
import { CalendarDaysIcon, ListBulletIcon, UserGroupIcon, Cog6ToothIcon, SunIcon, ArchiveBoxArrowDownIcon, QuestionMarkCircleIcon, ChartBarIcon, StepAcademyLogo, ChevronLeftIcon, ChevronRightIcon, HomeIcon, ClockIcon, Bars3Icon, XMarkIcon } from './components/icons/Icons';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; children: React.ReactNode; isCollapsed: boolean }> = ({ to, icon, children, isCollapsed }) => {
  const baseClasses = "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200";
  const inactiveClasses = "text-slate-600 hover:bg-sky-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white";
  const activeClasses = "bg-brand text-white shadow-md";

  // On mobile (<md), the sidebar is a full-width drawer so labels always show.
  // On desktop (>=md), `isCollapsed` hides the labels and centers the icon.
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}
      title={isCollapsed ? (children as string) : undefined}
    >
      <span className={isCollapsed ? 'mr-3 md:mr-0' : 'mr-3'}>{icon}</span>
      <span className={isCollapsed ? 'inline md:hidden' : ''}>{children}</span>
    </NavLink>
  );
};

const App: React.FC = () => {
  const location = useLocation();
  const { settings } = useSettings();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.toggle('dark', isDark);
  }, [settings.theme]);

  // Auto-backup on app start
  useEffect(() => {
    runAutoBackupIfNeeded().then((result) => {
      // Only show toast if backup was actually performed
      // The service returns void but logs success/failure
    }).catch((err) => {
      console.error('Auto-backup check failed:', err);
    });
  }, []); // Run once on mount


  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/attendance': return 'Weekly View';
      case '/daily': return 'Daily Attendance';
      case '/roster': return 'Student Roster';
      case '/holidays': return 'Manage Holidays';
      case '/reports': return 'Reporting & Analytics';
      case '/audit': return 'Audit Log';
      case '/data': return 'Data Management';
      case '/settings': return 'Settings';
      case '/help': return 'Help & About';
      default:
        if (location.pathname.startsWith('/student/')) return 'Student Detail';
        return 'S.T.E.P. Academy';
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div className="flex h-screen bg-slate-100 dark:bg-slate-800 font-sans">
        {/* Mobile backdrop */}
        {isMobileNavOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30 print-hidden"
            onClick={() => setIsMobileNavOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className={`${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 w-64 z-40 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between print-hidden transition-all duration-300`}
          aria-label="Main navigation"
        >
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:block absolute -right-3 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-sm text-slate-500 hover:text-brand z-10"
          >
            {isSidebarCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
          </button>

          <div>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation menu"
              className="md:hidden absolute top-3 right-3 p-2 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <div className={`flex items-center justify-center mb-8 px-2 ${isSidebarCollapsed ? 'md:scale-75' : ''} transition-transform`}>
              <StepAcademyLogo className="h-24 w-auto" />
            </div>
            <nav className="space-y-2">
              <NavItem to="/" icon={<HomeIcon />} isCollapsed={isSidebarCollapsed}>Dashboard</NavItem>
              <NavItem to="/attendance" icon={<CalendarDaysIcon />} isCollapsed={isSidebarCollapsed}>Weekly View</NavItem>
              <NavItem to="/daily" icon={<SunIcon />} isCollapsed={isSidebarCollapsed}>Daily View</NavItem>
              <NavItem to="/roster" icon={<UserGroupIcon />} isCollapsed={isSidebarCollapsed}>Student Roster</NavItem>
              <NavItem to="/reports" icon={<ChartBarIcon />} isCollapsed={isSidebarCollapsed}>Reporting</NavItem>
              <NavItem to="/audit" icon={<ClockIcon />} isCollapsed={isSidebarCollapsed}>Audit Log</NavItem>
              <NavItem to="/holidays" icon={<ListBulletIcon />} isCollapsed={isSidebarCollapsed}>Holidays</NavItem>
              <NavItem to="/data" icon={<ArchiveBoxArrowDownIcon />} isCollapsed={isSidebarCollapsed}>Data Management</NavItem>
              <NavItem to="/settings" icon={<Cog6ToothIcon />} isCollapsed={isSidebarCollapsed}>Settings</NavItem>
            </nav>
          </div>
          <nav>
            <NavItem to="/help" icon={<QuestionMarkCircleIcon />} isCollapsed={isSidebarCollapsed}>Help & About</NavItem>
          </nav>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 print-hidden flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileNavOpen}
              className="md:hidden -ml-1 p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{getTitle()}</h2>
          </header>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/attendance" element={<WeeklyView />} />
              <Route path="/daily" element={<DailyView />} />
              <Route path="/roster" element={<RosterPage />} />
              <Route path="/student/:studentId" element={<StudentDetailPage />} />
              <Route path="/holidays" element={<HolidaysPage />} />
              <Route path="/settings/school-years" element={<SchoolYearsPage />} />
              <Route path="/reports" element={<ReportingPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
              <Route path="/data" element={<DataManagementPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
};

export default App;