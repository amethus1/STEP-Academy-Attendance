import { getDb } from './index';
import { SchoolYear } from '../types';

// --- Types matching DB Schema ---

export interface DBStudent {
    id: string;
    student_number: string | null;
    first_name: string;
    last_name: string;
    dob: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    photo_url: string | null;
    custom_fields: string | null; // JSON string
}

export interface DBEnrollment {
    id: string;
    student_id: string;
    school_year: string;
    start_date: string;
    end_date: string | null;
    grade_level: string;
    campus: string | null;
    status: string;
    sped_504: string | null;
    drg_offense: string | null;
    days_assigned: number;
    credit_days: number;
    comments: string | null;
}

export interface DBAttendance {
    id: string;
    student_id: string;
    enrollment_id: string;
    date: string;
    presence: string;
}

export interface DBHoliday {
    date: string;
    name: string;
    school_year: string | null;
}

// --- Composite Types for UI ---

export interface StudentWithEnrollment extends DBStudent, DBEnrollment {
    studentId: string;
    enrollmentId: string;
    days_attended: number;
}

// --- Queries ---

export const getStudentsByYear = async (schoolYear: string): Promise<StudentWithEnrollment[]> => {
    const db = await getDb();

    // If schoolYear is 'All', just return everyone
    if (schoolYear === 'All') {
        const query = `
        SELECT 
          s.id as studentId, s.student_number, s.first_name, s.last_name, s.dob, 
          s.guardian_name, s.guardian_phone, s.emergency_contact_name, s.emergency_contact_phone, s.photo_url, s.custom_fields,
          e.id as enrollmentId, e.school_year, e.start_date, e.end_date, e.grade_level, e.campus, e.status,
          e.sped_504, e.drg_offense, e.days_assigned, e.credit_days, e.comments,
          (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence = 'Present') as days_attended
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        ORDER BY s.last_name, s.first_name, e.school_year DESC
        `;
        return await db.select(query);
    }

    // Check if this school year is a defined year with date ranges
    const definedYear = await db.select<{ start_date: string, end_date: string }[]>(
        "SELECT start_date, end_date FROM school_years WHERE name = $1",
        [schoolYear]
    );

    let query: string;
    let params: any[];

    if (definedYear.length > 0) {
        // Match by either: school_year name OR start_date within the defined range
        query = `
        SELECT 
          s.id as studentId, s.student_number, s.first_name, s.last_name, s.dob, 
          s.guardian_name, s.guardian_phone, s.emergency_contact_name, s.emergency_contact_phone, s.photo_url, s.custom_fields,
          e.id as enrollmentId, e.school_year, e.start_date, e.end_date, e.grade_level, e.campus, e.status,
          e.sped_504, e.drg_offense, e.days_assigned, e.credit_days, e.comments,
          (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence = 'Present') as days_attended
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        WHERE e.school_year = $1 
           OR (e.start_date >= $2 AND e.start_date <= $3)
        GROUP BY e.id
        ORDER BY s.last_name, s.first_name, e.school_year DESC
        `;
        params = [schoolYear, definedYear[0].start_date, definedYear[0].end_date];
    } else {
        // No defined year, just match by name
        query = `
        SELECT 
          s.id as studentId, s.student_number, s.first_name, s.last_name, s.dob, 
          s.guardian_name, s.guardian_phone, s.emergency_contact_name, s.emergency_contact_phone, s.photo_url, s.custom_fields,
          e.id as enrollmentId, e.school_year, e.start_date, e.end_date, e.grade_level, e.campus, e.status,
          e.sped_504, e.drg_offense, e.days_assigned, e.credit_days, e.comments,
          (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence = 'Present') as days_attended
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        WHERE e.school_year = $1
        ORDER BY s.last_name, s.first_name, e.school_year DESC
        `;
        params = [schoolYear];
    }

    return await db.select(query, params);
};

export const getStudentDetails = async (studentId: string) => {
    const db = await getDb();

    // Get Profile
    const students = await db.select<DBStudent[]>("SELECT * FROM students WHERE id = $1", [studentId]);
    const student = students[0];
    if (!student) return null;

    // Get Enrollments
    const enrollments = await db.select<DBEnrollment[]>("SELECT * FROM enrollments WHERE student_id = $1 ORDER BY start_date DESC", [studentId]);

    // Get Attendance (All? Or split by enrollment in UI?)
    // Let's get all for now, maybe optimize later if too big
    const attendance = await db.select<DBAttendance[]>("SELECT * FROM attendance WHERE student_id = $1", [studentId]);

    return { student, enrollments, attendance };
};

export const createStudent = async (student: DBStudent, enrollment: DBEnrollment): Promise<void> => {
    const db = await getDb();
    // Manual Transaction (Tauri plugin doesn't strongly expose tx objects yet in v2 safely across awaits, 
    // but executing BEGIN/COMMIT works if connection is locked (which it isn't always in pool).
    // For now, sequentially execute. If fail, we have orphan risk but low in single-user app.

    try {
        // 1. Insert Profile (IGNORE if exists? Or Update? Assume new student means new profile for now)
        // Actually, we might be enrolling an EXISTING student.
        // Check existence first.

        const exists = await db.select<DBStudent[]>("SELECT id FROM students WHERE id = $1", [student.id]);

        if (exists.length === 0) {
            await db.execute(
                `INSERT INTO students (id, student_number, first_name, last_name, dob, guardian_name, guardian_phone, emergency_contact_name, emergency_contact_phone, photo_url, custom_fields) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [student.id, student.student_number, student.first_name, student.last_name, student.dob, student.guardian_name, student.guardian_phone, student.emergency_contact_name, student.emergency_contact_phone, student.photo_url, student.custom_fields]
            );
        } else {
            // Update profile details
            await updateStudent(student);
        }

        // 2. Insert Enrollment
        await db.execute(
            `INSERT INTO enrollments (id, student_id, school_year, start_date, end_date, grade_level, campus, status, sped_504, drg_offense, days_assigned, credit_days, comments)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [enrollment.id, enrollment.student_id, enrollment.school_year, enrollment.start_date, enrollment.end_date, enrollment.grade_level, enrollment.campus, enrollment.status, enrollment.sped_504, enrollment.drg_offense, enrollment.days_assigned, enrollment.credit_days, enrollment.comments]
        );
    } catch (e) {
        console.error("DB Error in createStudent:", e);
        throw e;
    }
};

export const updateStudent = async (student: DBStudent): Promise<void> => {
    const db = await getDb();
    await db.execute(
        `UPDATE students SET student_number=$2, first_name=$3, last_name=$4, guardian_name=$5, guardian_phone=$6, emergency_contact_name=$7, emergency_contact_phone=$8, photo_url=$9, custom_fields=$10 WHERE id=$1`,
        [student.id, student.student_number, student.first_name, student.last_name, student.guardian_name, student.guardian_phone, student.emergency_contact_name, student.emergency_contact_phone, student.photo_url, student.custom_fields]
    );
};

export const deleteStudent = async (studentId: string): Promise<void> => {
    const db = await getDb();
    // Execute deletes sequentially without explicit transaction
    // SQLite auto-commits each statement. If one fails, subsequent ones won't run.
    // For single-user app, this is acceptable - partial deletes can be retried.
    try {
        // Delete related attendance first
        await db.execute("DELETE FROM attendance WHERE student_id = $1", [studentId]);
        // Delete enrollments
        await db.execute("DELETE FROM enrollments WHERE student_id = $1", [studentId]);
        // Delete student
        await db.execute("DELETE FROM students WHERE id = $1", [studentId]);
    } catch (e) {
        console.error("Failed to delete student:", e);
        throw e;
    }
};

export const updateStudentEnrollment = async (enrollmentId: string, updates: Partial<DBEnrollment>) => {
    const db = await getDb();
    // Dynamic update builder would be nice, but for now hardcode common updates or just one-by-one
    // Let's implement full update for simplicity of 'Save'
    // Actually, UI usually sends whole object.

    // Construct SET clause
    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'student_id');
    if (keys.length === 0) return;

    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => (updates as any)[k]);

    const query = `UPDATE enrollments SET ${setClause} WHERE id = $1`;
    await db.execute(query, [enrollmentId, ...values]);
};

// --- Attendance ---

export const getAttendanceByDate = async (date: string): Promise<DBAttendance[]> => {
    const db = await getDb();
    return await db.select("SELECT * FROM attendance WHERE date = $1", [date]);
};

export const getAttendanceByDateRange = async (startDate: string, endDate: string): Promise<DBAttendance[]> => {
    const db = await getDb();
    return await db.select("SELECT * FROM attendance WHERE date >= $1 AND date <= $2", [startDate, endDate]);
};

export const saveAttendance = async (records: DBAttendance[]) => {
    const db = await getDb();
    // Batch upsert? SQLite supports ON CONFLICT

    for (const r of records) {
        await db.execute(
            `INSERT INTO attendance (id, student_id, enrollment_id, date, presence) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT(student_id, date) DO UPDATE SET presence=excluded.presence`,
            [r.id, r.student_id, r.enrollment_id, r.date, r.presence]
        );
    }
};

export const deleteAttendance = async (studentId: string, date: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM attendance WHERE student_id = $1 AND date = $2", [studentId, date]);
};

// --- Holidays ---

export const getHolidays = async (): Promise<DBHoliday[]> => {
    const db = await getDb();
    return await db.select("SELECT * FROM holidays ORDER BY date");
};

export const saveHoliday = async (holiday: DBHoliday) => {
    const db = await getDb();
    await db.execute(
        `INSERT INTO holidays (date, name, school_year) 
         VALUES ($1, $2, $3)
         ON CONFLICT(date) DO UPDATE SET name=excluded.name`,
        [holiday.date, holiday.name, holiday.school_year]
    );
};

// --- School Years ---

export const getSchoolYears = async (): Promise<SchoolYear[]> => {
    const db = await getDb();
    // Return typed SchoolYear objects
    return await db.select<SchoolYear[]>("SELECT id, name, start_date as startDate, end_date as endDate FROM school_years ORDER BY start_date DESC");
};

export const createSchoolYear = async (year: SchoolYear): Promise<void> => {
    const db = await getDb();
    await db.execute(
        "INSERT INTO school_years (id, name, start_date, end_date) VALUES ($1, $2, $3, $4)",
        [year.id, year.name, year.startDate, year.endDate]
    );
};

export const updateSchoolYear = async (id: string, updates: Partial<SchoolYear>) => {
    const db = await getDb();
    const keys = Object.keys(updates).filter(k => k !== 'id');
    if (keys.length === 0) return;

    // Map camelCase to snake_case for DB
    const dbMap: Record<string, string> = {
        name: 'name',
        startDate: 'start_date',
        endDate: 'end_date'
    };

    const setClause = keys.map((k, i) => `${dbMap[k] || k} = $${i + 2}`).join(', ');
    const values = keys.map(k => (updates as any)[k]);

    await db.execute(`UPDATE school_years SET ${setClause} WHERE id = $1`, [id, ...values]);
};

export const deleteSchoolYear = async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM school_years WHERE id = $1", [id]);
};

// Returns just the year strings for legacy compatibility if needed
export const getLegacySchoolYears = async (): Promise<string[]> => {
    const db = await getDb();
    const result = await db.select<{ school_year: string }[]>("SELECT DISTINCT school_year FROM enrollments ORDER BY school_year DESC");
    return result.map(r => r.school_year);
};

export const deleteHoliday = async (date: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM holidays WHERE date = $1", [date]);
}

// --- Import / Export ---

// DB type for school_years table (snake_case to match DB schema)
export interface DBSchoolYear {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
}

export const getExportData = async () => {
    const db = await getDb();
    const students = await db.select<DBStudent[]>("SELECT * FROM students");
    const enrollments = await db.select<DBEnrollment[]>("SELECT * FROM enrollments");
    const attendance = await db.select<DBAttendance[]>("SELECT * FROM attendance");
    const holidays = await db.select<DBHoliday[]>("SELECT * FROM holidays");
    const schoolYears = await db.select<DBSchoolYear[]>("SELECT * FROM school_years");
    return { students, enrollments, attendance, holidays, schoolYears };
};

export const importData = async (data: {
    students: DBStudent[],
    enrollments: DBEnrollment[],
    attendance: DBAttendance[],
    holidays: DBHoliday[],
    schoolYears?: DBSchoolYear[]  // Optional for backward compatibility with legacy backups
}) => {
    const db = await getDb();
    // Execute without explicit transaction to avoid locking issues
    // For import, we wipe and repopulate - if it fails mid-way, user can re-import

    // Clear existing data
    await db.execute("DELETE FROM attendance");
    await db.execute("DELETE FROM enrollments");
    await db.execute("DELETE FROM students");
    await db.execute("DELETE FROM holidays");
    await db.execute("DELETE FROM school_years");

    // Insert new data
    for (const s of data.students) {
        await db.execute(
            `INSERT INTO students (id, student_number, first_name, last_name, dob, guardian_name, guardian_phone, emergency_contact_name, emergency_contact_phone, photo_url, custom_fields) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [s.id, s.student_number, s.first_name, s.last_name, s.dob, s.guardian_name, s.guardian_phone, s.emergency_contact_name, s.emergency_contact_phone, s.photo_url, s.custom_fields]
        );
    }

    for (const e of data.enrollments) {
        await db.execute(
            `INSERT INTO enrollments (id, student_id, school_year, start_date, end_date, grade_level, campus, status, sped_504, drg_offense, days_assigned, credit_days, comments)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [e.id, e.student_id, e.school_year, e.start_date, e.end_date, e.grade_level, e.campus, e.status, e.sped_504, e.drg_offense, e.days_assigned, e.credit_days, e.comments]
        );
    }

    for (const a of data.attendance) {
        await db.execute(
            `INSERT INTO attendance (id, student_id, enrollment_id, date, presence) VALUES ($1, $2, $3, $4, $5)`,
            [a.id, a.student_id, a.enrollment_id, a.date, a.presence]
        );
    }

    for (const h of data.holidays) {
        await db.execute(
            `INSERT INTO holidays (date, name, school_year) VALUES ($1, $2, $3)`,
            [h.date, h.name, h.school_year]
        );
    }

    // Import school years if present (backward compatible - older exports won't have this)
    if (data.schoolYears && data.schoolYears.length > 0) {
        for (const sy of data.schoolYears) {
            await db.execute(
                `INSERT INTO school_years (id, name, start_date, end_date) VALUES ($1, $2, $3, $4)`,
                [sy.id, sy.name, sy.start_date, sy.end_date]
            );
        }
    }
};
