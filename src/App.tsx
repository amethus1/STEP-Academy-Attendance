import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AttendanceProvider } from './context/AttendanceContext';
import Layout from './components/Layout';

// Lazy load pages for better performance
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const DailyDashboardPage = React.lazy(() => import('./pages/DailyDashboardPage'));
const RosterPage = React.lazy(() => import('./pages/RosterPage'));
const DetailPage = React.lazy(() => import('./pages/DetailPage'));
const HolidaysPage = React.lazy(() => import('./pages/HolidaysPage'));
const DataManagementPage = React.lazy(() => import('./pages/DataManagementPage'));
const ReportingPage = React.lazy(() => import('./pages/ReportingPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

const App: React.FC = () => (
  <AttendanceProvider>
    <HashRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/daily-dashboard" element={<DailyDashboardPage />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/student/:studentId" element={<DetailPage />} />
            <Route path="/holidays" element={<HolidaysPage />} />
            <Route path="/data-management" element={<DataManagementPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  </AttendanceProvider>
);

export default App;