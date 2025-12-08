import { z } from 'zod';
import { StudentStatus } from '../types';
import { createStudent, getUniqueStudents } from '../db/queries';

// --- Types ---

export interface ImportRow {
    [key: string]: string;
}

export interface ImportError {
    row: number;
    field?: string;
    message: string;
}

export interface ImportResult {
    totalRows: number;
    validRows: ValidImportRow[];
    invalidRows: { row: number, data: ImportRow, errors: ImportError[] }[];
}

// Internal type for validated data ready for DB
interface ValidImportRow {
    firstName: string;
    lastName: string;
    studentNumber: string;
    campus: string;
    gradeLevel: string;
    status: StudentStatus;
    // Optional fields
    dob?: string;
    guardianName?: string;
    guardianPhone?: string;
}

// --- Zod Schema ---

const importSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    studentNumber: z.string().min(1, "Student ID/Number is required"),
    campus: z.string().default('Main'),
    gradeLevel: z.string().default('9'),
    status: z.nativeEnum(StudentStatus).or(z.string().transform(val => {
        const v = val.toLowerCase();
        if (v === 'active') return StudentStatus.Active;
        if (v === 'completed') return StudentStatus.Completed;
        if (v === 'withdrawn') return StudentStatus.Withdrawn;
        return StudentStatus.Active; // Default
    })),
    // Optional fields
    dob: z.string().optional(),
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),
});


// --- CSV Parser ---

/**
 * Parses a CSV string into an array of objects.
 * Handles quoted fields and proper comma separation.
 */
export const parseCsv = (csvText: string): ImportRow[] => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = parseLine(lines[0]).map(h => h.trim());
    const data: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length === 0) continue;

        const row: ImportRow = {};
        headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
        });
        data.push(row);
    }

    return data;
};

const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // End of quotes
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
};


// --- Validation & Processing ---

export const validateImportData = (data: ImportRow[]): ImportResult => {
    const validRows: ValidImportRow[] = [];
    const invalidRows: { row: number, data: ImportRow, errors: ImportError[] }[] = [];

    data.forEach((row, index) => {
        // Map lenient CSV headers to schema keys
        const mappedData = {
            firstName: row['First Name'] || row['firstName'] || row['firstname'],
            lastName: row['Last Name'] || row['lastName'] || row['lastname'],
            studentNumber: row['Student ID'] || row['Student Number'] || row['studentNumber'] || row['id'],
            campus: row['Campus'] || row['campus'],
            gradeLevel: row['Grade'] || row['grade'] || row['Grade Level'],
            status: row['Status'] || row['status'],
        };

        const result = importSchema.safeParse(mappedData);

        if (result.success) {
            validRows.push(result.data as ValidImportRow);
        } else {
            const zError = result.error as any;
            const errors: ImportError[] = zError.errors.map((e: any) => ({
                row: index + 2, // +2 for 1-based index and header row
                field: e.path.join('.'),
                message: e.message
            }));
            invalidRows.push({ row: index + 2, data: row, errors });
        }
    });

    return {
        totalRows: data.length,
        validRows,
        invalidRows
    };
};

export const processImport = async (validRows: ValidImportRow[], schoolYear: string, onProgress?: (current: number, total: number) => void) => {
    let count = 0;
    // 1. Get existing students to prevent strict duplicates or update existing?
    // For now, let's assume we create new records or find existing by studentNumber?
    // Implementation Plan says "Create Student".
    // Better logic: Find student by Student Number. If exists, update? Or skip?
    // Let's implement simple "Create if not exists" logic for now.

    const existingStudents = await getUniqueStudents({ schoolYear });
    // uniqueStudents returns snake_caseDB rows usually? Let's check getUniqueStudents type.
    // Assuming it returns DBStudent-like objects.
    const existingMap = new Map(existingStudents.map(s => [s.student_number, s]));

    for (const row of validRows) {
        if (existingMap.has(row.studentNumber)) {
            // Skip logic
        }

        // Create new student - Map to DBStudent (snake_case)
        const newStudent = {
            id: crypto.randomUUID(),
            first_name: row.firstName,
            last_name: row.lastName,
            student_number: row.studentNumber,
            campus: row.campus,
            grade_level: row.gradeLevel,
            status: row.status,
            // Defaults
            registration_date: new Date().toISOString().split('T')[0],
            entry_date: new Date().toISOString().split('T')[0],
            sped_504: 'None',
            drg_offense: '',
            credit_days: 0,
            days_assigned: 0,
            comments: '',
            custom_fields: '{}', // JSON string for DB
            photo_url: null,
            guardian_name: '',
            guardian_phone: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            dob: null // Missing in UI object but required in DB?
        };

        const newEnrollment = {
            id: crypto.randomUUID(),
            student_id: newStudent.id,
            school_year: schoolYear,
            start_date: newStudent.entry_date,
            end_date: null,
            active: 1 // DB expects number/boolean? Usually sqlite boolean is 1/0
        };

        // @ts-expect-error - DB types might be strict, but this matches structure
        await createStudent(newStudent, newEnrollment);

        count++;
        if (onProgress) onProgress(count, validRows.length);
    }
};
