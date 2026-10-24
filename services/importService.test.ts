import { describe, it, expect } from 'vitest';
import { validateImportData } from './importService';

describe('validateImportData (CSV import)', () => {
    it('accepts valid rows, mapping common header spellings', () => {
        const result = validateImportData([
            { 'First Name': 'Ada', 'Last Name': 'Lovelace', 'Student ID': 'S1' },
            { firstName: 'Alan', lastName: 'Turing', studentNumber: 'S2' }
        ]);
        expect(result.totalRows).toBe(2);
        expect(result.validRows).toHaveLength(2);
        expect(result.invalidRows).toEqual([]);
    });

    it('defaults status to Active when the sheet has no Status column', () => {
        const result = validateImportData([{ 'First Name': 'Ada', 'Last Name': 'Lovelace', 'Student ID': 'S1' }]);
        expect(result.validRows[0].status).toBe('Active');
    });

    it('reads a Status column when present', () => {
        const result = validateImportData([{ 'First Name': 'Ada', 'Last Name': 'Lovelace', 'Student ID': 'S1', Status: 'withdrawn' }]);
        expect(result.validRows[0].status).toBe('Withdrawn');
    });

    // Regression: Zod 4 removed ZodError.errors. Reading it (hidden behind an
    // `as any`) threw a TypeError, so one bad row failed the whole CSV instead
    // of being reported with its row number.
    it('reports a bad row with its spreadsheet row number instead of throwing', () => {
        const result = validateImportData([
            { 'First Name': 'Ada', 'Last Name': 'Lovelace', 'Student ID': 'S1' },
            { 'First Name': 'Alan', 'Student ID': 'S2' } // no last name
        ]);

        expect(result.validRows).toHaveLength(1);
        expect(result.invalidRows).toHaveLength(1);
        expect(result.invalidRows[0].row).toBe(3); // header is row 1
        expect(result.invalidRows[0].errors[0]).toMatchObject({ row: 3, field: 'lastName' });
        expect(result.invalidRows[0].errors[0].message).toBeTruthy();
    });
});
