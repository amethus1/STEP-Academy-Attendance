import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const CustomNavLink: React.FC<{ to: string; end?: boolean; children: React.ReactNode }> = ({ 
  to, 
  end, 
  children 
}) => {
  const linkClasses = 'px-3 py-2 rounded-md text-sm font-medium transition-colors';
  const activeLinkClasses = 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white';
  const inactiveLinkClasses = 'text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50';

  return (
    <NavLink
      to={to}
      end={end ?? false}
      className={({ isActive }) =>
        `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
      }
    >
      {children}
    </NavLink>
  );
};

const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <nav className="bg-white dark:bg-gray-800 shadow-md" role="navigation" aria-label="Main navigation">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-xl font-bold text-blue-600 dark:text-blue-500">
                Attendance Tracker
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <CustomNavLink to="/" end>Weekly View</CustomNavLink>
                  <CustomNavLink to="/daily-dashboard">Daily View</CustomNavLink>
                  <CustomNavLink to="/roster">Roster</CustomNavLink>
                  <CustomNavLink to="/holidays">Holidays</CustomNavLink>
                  <CustomNavLink to="/data-management">Data Management</CustomNavLink>
                  <CustomNavLink to="/reporting">Reporting</CustomNavLink>
                </div>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {/* Hamburger icon */}
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}
          id="mobile-menu"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <CustomNavLink to="/" end>Weekly View</CustomNavLink>
            <CustomNavLink to="/daily-dashboard">Daily View</CustomNavLink>
            <CustomNavLink to="/roster">Roster</CustomNavLink>
            <CustomNavLink to="/holidays">Holidays</CustomNavLink>
            <CustomNavLink to="/data-management">Data Management</CustomNavLink>
            <CustomNavLink to="/reporting">Reporting</CustomNavLink>
          </div>
        </div>
      </nav>

      {/* Page Outlet */}
      <main className="py-8" role="main">
        <div className="mx-auto sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;