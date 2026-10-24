import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('./useSettings', () => ({ useSettings: () => ({ settings: { activeSchoolYear: '' } }) }));
vi.mock('./useSchoolYears', () => ({
    useSchoolYears: () => ({ data: [{ id: 'y', name: '2026-2027', startDate: '2026-08-01', endDate: '2027-07-31' }] })
}));

import { useActiveSchoolYear } from './useActiveSchoolYear';

describe('useActiveSchoolYear', () => {
    it('resolves a plain YYYY-MM-DD date', () => {
        const { result } = renderHook(() => useActiveSchoolYear('2026-10-24'));
        expect(result.current).toBe('2026-2027');
    });

    // Regression: Weekly view passed a date that already had a time, the hook
    // appended another, and the invalid date produced the school year "NaN-NaN",
    // so the default landing page listed no students.
    it('resolves a date that already carries a time', () => {
        const { result } = renderHook(() => useActiveSchoolYear('2026-10-24T12:00:00Z'));
        expect(result.current).toBe('2026-2027');
    });

    it('resolves a Date', () => {
        const { result } = renderHook(() => useActiveSchoolYear(new Date('2026-10-24T12:00:00Z')));
        expect(result.current).toBe('2026-2027');
    });
});
