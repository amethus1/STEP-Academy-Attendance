import { AttendanceRecord } from '../types';

interface HasDate {
    date: string;
}

interface HasStudentId {
    studentId?: string;
    student_id?: string;
}

/**
 * Groups attendance records by date (YYYY-MM-DD).
 * Useful for finding all attendance for a specific day.
 */
export const groupAttendanceByDate = <T extends HasDate>(records: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>();
    for (const record of records) {
        const list = map.get(record.date) || [];
        list.push(record);
        map.set(record.date, list);
    }
    return map;
};

/**
 * Groups attendance records by student ID.
 * Useful for finding all attendance for a specific student.
 * Supports both studentId (app model) and student_id (DB model).
 */
export const groupAttendanceByStudent = <T extends HasStudentId>(records: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>();
    for (const record of records) {
        const id = record.studentId || record.student_id;
        if (!id) continue;

        const list = map.get(id) || [];
        list.push(record);
        map.set(id, list);
    }
    return map;
};
