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