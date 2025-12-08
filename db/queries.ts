// ═══════════════════════════════════════════════════════════════════════════
// DATABASE QUERIES - MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════
// 
// This file re-exports all query modules for backward compatibility.
// New code should import directly from the specific module.
//
// Module Structure:
// - types.ts          - Shared database types
// - studentQueries.ts - Student CRUD and search
// - attendanceQueries.ts - Attendance records
// - holidayQueries.ts - Holidays
// - schoolYearQueries.ts - School years and maintenance
// - settingsQueries.ts - App settings
// - auditQueries.ts - Audit logging
// - dataTransferQueries.ts - Import/export
//
// ═══════════════════════════════════════════════════════════════════════════

// Re-export all types
export * from './types';

// Re-export all query modules
export * from './studentQueries';
export * from './attendanceQueries';
export * from './holidayQueries';
export * from './schoolYearQueries';
export * from './settingsQueries';
export * from './auditQueries';
export * from './dataTransferQueries';
