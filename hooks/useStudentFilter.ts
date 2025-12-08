import { useState, useMemo } from 'react';
import { StudentStatus } from '../types';
import { ExtendedStudent } from '../services/mappers';

export type SortKey = keyof ExtendedStudent | string;

export interface FilterState {
    search: string;
    status: StudentStatus | 'All';
    grade: string;
    sped: string;
}

export interface SortConfig {
    key: SortKey;
    direction: 'asc' | 'desc';
}

export const useStudentFilter = (students: ExtendedStudent[], initialFilters?: Partial<FilterState>) => {
    const [searchTerm, setSearchTerm] = useState(initialFilters?.search || '');
    const [statusFilter, setStatusFilter] = useState<StudentStatus | 'All'>(initialFilters?.status || StudentStatus.Active);
    const [gradeFilter, setGradeFilter] = useState(initialFilters?.grade || 'All');
    const [spedFilter, setSpedFilter] = useState(initialFilters?.sped || 'All');

    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastName', direction: 'asc' });

    const gradeLevels = useMemo(
        () => ['All', ...Array.from(new Set(students.map(s => s.gradeLevel).filter(Boolean))).sort()],
        [students]
    );

    const filteredStudents = useMemo(() => {
        const result = students.filter(s => {
            const statusMatch = statusFilter === 'All' || s.status === statusFilter;
            const gradeMatch = gradeFilter === 'All' || s.gradeLevel === gradeFilter;
            const spedMatch = spedFilter === 'All' || s.sped504 === spedFilter;
            const searchMatch =
                `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.studentNumber || s.id).toLowerCase().includes(searchTerm.toLowerCase());

            return statusMatch && gradeMatch && spedMatch && searchMatch;
        });

        return result.sort((a, b) => {
            const aVal = a[sortConfig.key as keyof ExtendedStudent];
            const bVal = b[sortConfig.key as keyof ExtendedStudent];

            if (aVal === bVal) return 0;

            // Handle null/undefined values
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [students, statusFilter, gradeFilter, spedFilter, searchTerm, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return {
        searchTerm, setSearchTerm,
        statusFilter, setStatusFilter,
        gradeFilter, setGradeFilter,
        spedFilter, setSpedFilter,
        sortConfig, setSortConfig,
        requestSort,
        filteredStudents,
        gradeLevels
    };
};
