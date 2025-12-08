import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUniqueStudents, useCreateStudent } from '../../hooks/useStudents';
import { useSchoolYears } from '../../hooks/useSchoolYears';
import { useActiveSchoolYear } from '../../hooks/useActiveSchoolYear';
import { useHolidays } from '../../hooks/useAttendance';
import { useSettings } from '../../hooks/useSettings';
import { Student, StudentStatus, CustomFieldDefinition } from '../../types';
import { DBStudent, DBEnrollment } from '../../db/queries';
import { toISODateString, formatDateForDisplay } from '../../services/dateUtils';
import { mapUniqueStudentToUI, UniqueStudentUI, mapDBHolidaysToHolidays } from '../../services/mappers';
import { exportToCsv } from '../../services/csvService';
import { StudentFormModal } from '../common/StudentFormModal';
import { StatusBadge } from '../common/StatusBadge';
import { PageLoadingSkeleton } from '../common/SkeletonLoader';
import { DocumentArrowDownIcon } from '../icons/Icons';
import { DataTable, ColumnDef } from '../common/DataTable';

type SortKey = keyof UniqueStudentUI | string;
type SortDirection = 'asc' | 'desc';
// Using UniqueStudentUI from mappers.ts for unified student view
type ColumnDefinition = { id: SortKey; label: string; isCustom: boolean };

const ColumnConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  allColumns: ColumnDefinition[];
  visibleColumns: string[];
  columnOrder: string[];
  onConfigChange: (newVisible: string[], newOrder: string[]) => void;
}> = ({ isOpen, onClose, allColumns, visibleColumns, columnOrder, onConfigChange }) => {
  const [localVisible, setLocalVisible] = useState<string[]>([]);
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalVisible([...visibleColumns]);
      // Ensure all columns are in the order, adding any missing ones at the end
      const currentOrder = [...columnOrder];
      const allColIds = allColumns.map(c => c.id);
      const missingCols = allColIds.filter(id => !currentOrder.includes(id));
      setLocalOrder([...currentOrder, ...missingCols]);
    }
  }, [isOpen, visibleColumns, columnOrder, allColumns]);

  // Sort columns by localOrder for display
  const sortedColumns = useMemo(() => {
    return [...allColumns].sort((a, b) => {
      const aIndex = localOrder.indexOf(a.id);
      const bIndex = localOrder.indexOf(b.id);
      // Items not in order go to end
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [allColumns, localOrder]);

  if (!isOpen) return null;

  const handleVisibilityChange = (id: string, checked: boolean) => {
    setLocalVisible(prev => checked ? [...prev, id] : prev.filter(colId => colId !== id));
  };

  const moveColumn = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < localOrder.length) {
      const newOrder = [...localOrder];
      [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
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
          {sortedColumns.map((col, displayIndex) => {
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
                  <button
                    onClick={() => moveColumn(displayIndex, 'up')}
                    disabled={displayIndex <= 0}
                    className="p-1 disabled:opacity-25 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveColumn(displayIndex, 'down')}
                    disabled={displayIndex >= sortedColumns.length - 1}
                    className="p-1 disabled:opacity-25 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                  >
                    ↓
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md border dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md">Save</button>
        </div>
      </div>
    </div>
  );
};

const FilterSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
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
  // const { students, attendance, holidays, customFieldDefinitions, addStudent, updateStudent, loading } = useAppData(); // REMOVED
  const { settings, saveSettings } = useSettings();

  // New Hooks
  const { data: schoolYearsData = [] } = useSchoolYears();
  // Extract just the year names from the SchoolYear objects
  const schoolYearNames = useMemo(() => schoolYearsData.map(y => y.name), [schoolYearsData]);
  const allSchoolYears = useMemo(() => ['All', ...schoolYearNames], [schoolYearNames]);
  const activeSchoolYear = useActiveSchoolYear();
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const hasInitializedYear = React.useRef(false);

  // Sync selectedSchoolYear with activeSchoolYear on initial load only
  useEffect(() => {
    if (hasInitializedYear.current) return;

    if (activeSchoolYear) {
      setSelectedSchoolYear(activeSchoolYear);
      hasInitializedYear.current = true;
    } else if (schoolYearNames.length > 0) {
      setSelectedSchoolYear(schoolYearNames[0]);
      hasInitializedYear.current = true;
    }
  }, [activeSchoolYear, schoolYearNames]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [filters, setFilters] = useState(settings.rosterFilters || initialFilters);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Persist filters on change
  useEffect(() => {
    saveSettings({ rosterFilters: filters });
  }, [filters, saveSettings]);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'lastName', direction: 'asc' });
  const [projectionMethod, setProjectionMethod] = useState<'today' | 'entryDate'>('today');

  const { data: rawStudents, isLoading: studentsLoading } = useUniqueStudents({
    schoolYear: selectedSchoolYear,
    searchTerm: debouncedSearchTerm,
    status: filters.status,
    campus: filters.campus,
    gradeLevel: filters.gradeLevel,
    sped504: filters.sped504,
    // We handle sorting client-side for now to support custom fields
  });
  const { data: holidays = [] } = useHolidays();

  // Convert DB holidays to UI format using centralized mapper
  const holidaysUI = useMemo(() => mapDBHolidaysToHolidays(holidays), [holidays]);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // TODO: Fetch customFieldDefinitions from DB if dynamic, or keep them static/settings for now.
  const customFieldDefinitions: CustomFieldDefinition[] = [
    { id: 'homeroom', name: 'Homeroom', type: 'text' },
    { id: 'track', name: 'Track', type: 'text' }
  ];

  const { rosterColumnOrder } = settings;
  const rosterVisibleColumns = useMemo(() => (
    (settings.rosterVisibleColumns && settings.rosterVisibleColumns.length > 0)
      ? settings.rosterVisibleColumns
      : ['lastName', 'firstName', 'status', 'projectedReleaseDate']
  ), [settings.rosterVisibleColumns]);

  const allColumns = useMemo((): ColumnDefinition[] => {
    const standardCols: ColumnDefinition[] = [
      { id: 'studentNumber', label: 'Student ID', isCustom: false },
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
      { id: 'exitDate', label: 'Exit Date', isCustom: false },
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

  const loading = studentsLoading;

  const studentData = useMemo(() => {
    if (!rawStudents) return [];
    return rawStudents.map(s => {
      const projectionStart = projectionMethod === 'today' ? undefined : s.latest_start_date;
      return mapUniqueStudentToUI(s, holidaysUI, projectionStart);
    });
  }, [rawStudents, holidaysUI, projectionMethod]);

  const campuses = useMemo(
    () => ['All', ...Array.from(new Set((rawStudents || []).map(s => s.latest_campus).filter(Boolean)))],
    [rawStudents]
  );
  const gradeLevels = useMemo(
    () => ['All', ...Array.from(new Set((rawStudents || []).map(s => s.latest_grade_level).filter(Boolean)))],
    [rawStudents]
  );
  const spedOptions = ['All', 'None', 'SPED', '504'];
  const statusOptions = ['All', ...Object.values(StudentStatus)];


  const sortedAndFilteredStudents = useMemo(() => {
    // Server-side filtering handles most things. 
    // We still need to filter by Entry Date Range locally if not supported by API yet (API supports it? No, searchStudents has hardcoded logic for specific year definitions but not arbitrary ranges passed as args yet)
    // Actually searchStudents in queries.ts DOES NOT accept arbitrary entryDateFrom/To yet.
    // So we must keep date filtering client-side.
    // Also need to support "All matches" which we get from server.

    let filtered = (studentData || []).filter(s => {
      // Search, status, campus, grade, sped are server-side now.
      // But we double check locally? No need if API is trusted. 
      // EXCEPT: The user might have typed faster than debounce? 
      // The `studentData` is derived from `rawStudents` which comes from `useStudents` dependent on `debouncedSearchTerm`.
      // So `studentData` IS already filtered by debounce term.

      const entryDateFromMatch = !filters.entryDateFrom || s.entryDate >= filters.entryDateFrom;
      const entryDateToMatch = !filters.entryDateTo || s.entryDate <= filters.entryDateTo;

      return entryDateFromMatch && entryDateToMatch;
    });

    filtered.sort((a, b) => {
      let aVal, bVal;
      const customFieldDef = customFieldDefinitions.find(cf => cf.id === sortConfig.key);

      if (customFieldDef) {
        aVal = a.customFields[sortConfig.key];
        bVal = b.customFields[sortConfig.key];
      } else {
        // Handle studentNumber fallback to id for sorting
        if (sortConfig.key === 'studentNumber') {
          aVal = a.studentNumber || a.id;
          bVal = b.studentNumber || b.id;
        } else {
          aVal = a[sortConfig.key as keyof UniqueStudentUI];
          bVal = b[sortConfig.key as keyof UniqueStudentUI];
        }
      }

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      else if (aVal < bVal) comparison = -1;

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [studentData, sortConfig, customFieldDefinitions, filters.entryDateFrom, filters.entryDateTo]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters, selectedSchoolYear]);

  // Pagination calculations
  const totalStudents = sortedAndFilteredStudents.length;
  const totalPages = Math.ceil(totalStudents / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedStudents = sortedAndFilteredStudents.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const { mutate: createStudent } = useCreateStudent();
  // const { mutate: updateEnrollment } = useUpdateEnrollment(); // Usage requires logic update

  const handleSaveStudent = (student: Student) => {
    // Adapter to match createStudent signature { student, enrollment }
    // This requires splitting the Student object back into Profile + Enrollment
    // For now, let's just log or implement basic create.
    const profile: DBStudent = {
      id: student.id,
      student_number: student.studentNumber || null,
      first_name: student.firstName,
      last_name: student.lastName,
      dob: null, // UI doesn't have DOB yet?
      guardian_name: student.guardianName,
      guardian_phone: student.guardianPhone,
      emergency_contact_name: student.emergencyContactName,
      emergency_contact_phone: student.emergencyContactPhone,
      photo_url: student.photoUrl,
      custom_fields: JSON.stringify(student.customFields)
    };
    const enrollment: DBEnrollment = {
      id: crypto.randomUUID(), // New enrollment ID
      student_id: student.id,
      school_year: selectedSchoolYear,
      start_date: student.entryDate,
      end_date: student.exitDate || null,
      grade_level: student.gradeLevel,
      campus: student.campus,
      status: student.status,
      sped_504: student.sped504,
      drg_offense: student.drgOffense,
      days_assigned: student.daysAssigned,
      credit_days: student.creditDays,
      comments: student.comments
    };

    // We need to know if it's an update or create.
    // existingIds check is passed to modal.
    // If updating, we update profile + enrollment.
    // For MVP rewrite: strict create.
    createStudent({ student: profile, enrollment });
    setIsStudentModalOpen(false);
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
        } else if (h.key === 'studentNumber') {
          row[h.key] = student.studentNumber || student.id;
        } else {
          row[h.key] = student[h.key as keyof UniqueStudentUI];
        }
      });
      return row;
    });
    exportToCsv(`student-roster-${toISODateString(new Date())}`, dataToExport, headers);
  };

  const tableColumns = useMemo<ColumnDef<typeof paginatedStudents[0]>[]>(() => {
    return orderedVisibleHeaders.map(col => ({
      id: col.id,
      label: col.label,
      sortable: true,
      render: (student) => {
        const isDateColumn = ['registrationDate', 'entryDate', 'exitDate', 'projectedReleaseDate'].includes(col.id as string);

        if (col.isCustom) {
          return student.customFields[col.id] ?? 'N/A';
        }

        if (col.id === 'lastName') {
          return (
            <span className="flex items-center gap-2">
              <Link to={`/student/${student.id}`} className="font-medium text-brand-dark hover:underline dark:text-brand-light">{student.lastName}</Link>
              {selectedSchoolYear === 'All' && student.enrollmentCount > 1 && (
                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full" title={`${student.enrollmentCount} total enrollments`}>
                  ×{student.enrollmentCount}
                </span>
              )}
            </span>
          );
        }

        if (col.id === 'status') {
          return <StatusBadge status={student.status} />;
        }

        if (col.id === 'studentNumber') {
          return student.studentNumber || student.id;
        }

        if (isDateColumn) {
          const dateVal = student[col.id as keyof UniqueStudentUI];
          return dateVal && dateVal !== 'N/A' && dateVal !== 'Completed' && dateVal !== 'Withdrawn' ? formatDateForDisplay(dateVal as string) : dateVal;
        }

        return student[col.id as keyof UniqueStudentUI];
      }
    }));
  }, [orderedVisibleHeaders, selectedSchoolYear]);

  if (loading) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-6">
      <StudentFormModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSave={handleSaveStudent}
        existingIds={(rawStudents || []).map(s => s.studentId)}
        existingStudents={studentData as any}
        customFieldDefinitions={customFieldDefinitions}
      />
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
          <FilterSelect label="School Year" id="schoolYear" value={selectedSchoolYear} onChange={e => setSelectedSchoolYear(e.target.value)}>
            {allSchoolYears.map(o => <option key={o} value={o}>{o === 'All' ? 'All Years' : o}</option>)}
          </FilterSelect>
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

      <DataTable<UniqueStudentUI>
        data={paginatedStudents}
        columns={tableColumns}
        keyExtractor={(s) => s.id}
        isLoading={loading}
        sortConfig={sortConfig}
        onSort={requestSort}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        emptyMessage="No students found."
      />
    </div>
  );
};