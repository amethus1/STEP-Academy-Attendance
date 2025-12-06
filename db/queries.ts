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

export interface DBAuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: string | null;
    user_id: string | null;
    timestamp: string;
}

// --- Composite Types for UI ---

export interface StudentWithEnrollment extends DBStudent, DBEnrollment {
    studentId: string;
    enrollmentId: string;
    days_attended: number;
}

export interface StudentSearchOptions {
    schoolYear: string;
    searchTerm?: string;
    status?: string;
    campus?: string;
    gradeLevel?: string;
    sped504?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

// --- NEW: Unified Student Types (one row per student, not per enrollment) ---

/**
 * Represents a unique student with their most recent enrollment data and aggregates.
 * Used for roster views where we want ONE row per student, not one per enrollment.
 */
export interface UniqueStudentRow {
    // Student core data (from students table)
    studentId: string;
    student_number: string | null;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    custom_fields: string | null;

    // Latest enrollment data (most recent by start_date)
    latest_enrollment_id: string;
    latest_school_year: string;
    latest_grade_level: string;
    latest_campus: string | null;
    latest_status: string;
    latest_start_date: string;
    latest_end_date: string | null;
    latest_days_assigned: number;
    latest_credit_days: number;
    latest_sped_504: string | null;
    latest_drg_offense: string | null;
    latest_comments: string | null;

    // Aggregated data across all enrollments
    enrollment_count: number;
    total_days_attended: number;
    latest_days_attended: number;
}

export interface UniqueStudentSearchOptions {
    schoolYear?: string;  // 'All' or specific year - filters students who have ANY enrollment in that year
    status?: string;      // Filter by latest enrollment status
    campus?: string;      // Filter by latest enrollment campus
    gradeLevel?: string;  // Filter by latest enrollment grade level
    sped504?: string;     // Filter by latest enrollment SPED/504 status
    searchTerm?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
}

// --- Queries ---

export const searchStudents = async (options: StudentSearchOptions): Promise<StudentWithEnrollment[]> => {
    const db = await getDb();
    const { schoolYear, searchTerm, status, campus, gradeLevel, sped504, sortKey = 'lastName', sortDirection = 'asc', limit, offset } = options;

    let conditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // 1. School Year Logic
    if (schoolYear !== 'All') {
        // Check definition
        const definedYear = await db.select<{ start_date: string, end_date: string }[]>(
            "SELECT start_date, end_date FROM school_years WHERE name = $1",
            [schoolYear]
        );

        if (definedYear.length > 0) {
            conditions.push(`(e.school_year = $${paramIndex} OR (e.start_date >= $${paramIndex + 1} AND e.start_date <= $${paramIndex + 2}))`);
            params.push(schoolYear, definedYear[0].start_date, definedYear[0].end_date);
            paramIndex += 3;
        } else {
            conditions.push(`e.school_year = $${paramIndex}`);
            params.push(schoolYear);
            paramIndex++;
        }
    }

    // 2. Filters
    if (status && status !== 'All') {
        conditions.push(`e.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }
    if (campus && campus !== 'All') {
        conditions.push(`e.campus = $${paramIndex}`);
        params.push(campus);
        paramIndex++;
    }
    if (gradeLevel && gradeLevel !== 'All') {
        conditions.push(`e.grade_level = $${paramIndex}`);
        params.push(gradeLevel);
        paramIndex++;
    }
    if (sped504 && sped504 !== 'All') {
        if (sped504 === 'None') {
            // Handle 'None' explicitly if needed, or assume it matches literal string 'None' stored in DB?
            // Based on schema it seems to allow null or string. UI usually uses 'None'.
            conditions.push(`(e.sped_504 IS NULL OR e.sped_504 = 'None' OR e.sped_504 = '')`);
        } else {
            conditions.push(`e.sped_504 = $${paramIndex}`);
            params.push(sped504);
            paramIndex++;
        }
    }

    // 3. Search Term
    if (searchTerm) {
        const term = `%${searchTerm}%`;
        conditions.push(`(s.first_name LIKE $${paramIndex} OR s.last_name LIKE $${paramIndex} OR s.student_number LIKE $${paramIndex})`);
        params.push(term, term, term); // Careful: parameter reuse in Tauri SQL?
        // Tauri SQL plugin usually binds positionally. 
        // So I need to push 'term' 3 times? 
        // Or can I reuse $N? Raw sqlite supports reused indexes? 
        // safest is strictly positional. But wait, `s.first_name LIKE $N`...
        // Let's increment paramIndex only once if we use $N multiple times? 
        // Or if the driver expects strictly unique placeholders...
        // Let's assume standard SQLite parameter binding: $1, $2.. can be reused.
        // Actually typically client libs bind array to positions.
        // If I use $X, $X, $X, and params has 'term' at index X-1.
        // Let's try reusing the index.
        // But wait, the params array must match the highest index? Or the number of placeholders?
        // In many drivers (like `pg`), if I use $1 three times, I only provide 1 value in array.
        // Let's assume that behavior.
        // BUT if Tauri plugin uses prepared statements, it might be strict.
        // Let's assume reusing $N works with a single value in the array at that index.
        // Wait, params[paramIndex-1] needs to be the value.
        // So params list length must be >= paramIndex.
        // If I use $paramIndex 3 times, I push the value ONCE.

        // Let's verify parameter reuse support in generic SQLite/Tauri.
        // If not sure, safely: $1, $2, $3 with 3 values.
        // Let's use separate indices to be safe.
        // paramIndex, paramIndex+1, paramIndex+2

        conditions.pop(); // Remove the optimized one I mentally added
        conditions.push(`(s.first_name LIKE $${paramIndex} OR s.last_name LIKE $${paramIndex + 1} OR s.student_number LIKE $${paramIndex + 2})`);
        params.push(term, term, term);
        paramIndex += 3;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 4. Sorting mapping
    const sortMap: Record<string, string> = {
        lastName: 's.last_name',
        firstName: 's.first_name',
        studentNumber: 's.student_number',
        gradeLevel: 'e.grade_level',
        campus: 'e.campus',
        status: 'e.status',
        daysAttended: 'days_attended', // alias
        daysAssigned: 'e.days_assigned',
        entryDate: 'e.start_date' // sorting by start_date for entry
    };

    const dbSortKey = sortMap[sortKey] || 's.last_name';
    // Ensure direction is safe
    const dir = sortDirection === 'desc' ? 'DESC' : 'ASC';

    // Fallback secondary sort
    const orderBy = `ORDER BY ${dbSortKey} ${dir}, s.last_name ASC, s.first_name ASC`;

    // 5. Pagination
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const offsetClause = offset ? `OFFSET ${offset}` : '';

    const query = `
        SELECT 
          s.id as studentId, s.student_number, s.first_name, s.last_name, s.dob, 
          s.guardian_name, s.guardian_phone, s.emergency_contact_name, s.emergency_contact_phone, s.photo_url, s.custom_fields,
          e.id as enrollmentId, e.school_year, e.start_date, e.end_date, e.grade_level, e.campus, e.status,
          e.sped_504, e.drg_offense, e.days_assigned, e.credit_days, e.comments,
          (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence = 'Present') as days_attended
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        ${whereClause}
        ${orderBy}
        ${limitClause} ${offsetClause}
    `;

    return await db.select(query, params);
};

export const getStudentsByYear = async (schoolYear: string): Promise<StudentWithEnrollment[]> => {
    // Legacy wrapper for backward compatibility or simple usage
    return searchStudents({ schoolYear });
};

/**
 * Returns unique students (one row per student) with their most recent enrollment data.
 * Solves the "duplicate student" problem in roster views.
 * 
 * Students are returned if they have ANY enrollment in the specified school year,
 * but the enrollment data shown is always from their LATEST enrollment.
 */
export const getUniqueStudents = async (options: UniqueStudentSearchOptions): Promise<UniqueStudentRow[]> => {
    const db = await getDb();
    const { schoolYear = 'All', status, campus, gradeLevel, sped504, searchTerm, sortKey = 'lastName', sortDirection = 'asc' } = options;

    let conditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Build the query using a subquery to get the latest enrollment per student
    // We use a window function to rank enrollments by start_date
    let query = `
        WITH ranked_enrollments AS (
            SELECT 
                e.*,
                ROW_NUMBER() OVER (PARTITION BY e.student_id ORDER BY e.start_date DESC) as rn
            FROM enrollments e
        ),
        enrollment_stats AS (
            SELECT 
                e.id as enrollment_id,
                (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence = 'Present') as days_attended
            FROM enrollments e
        ),
        student_aggregates AS (
            SELECT 
                e.student_id,
                COUNT(*) as enrollment_count,
                COALESCE(SUM(es.days_attended), 0) as total_days_attended
            FROM enrollments e
            LEFT JOIN enrollment_stats es ON e.id = es.enrollment_id
            GROUP BY e.student_id
        )
        SELECT 
            s.id as studentId,
            s.student_number,
            s.first_name,
            s.last_name,
            s.photo_url,
            s.guardian_name,
            s.guardian_phone,
            s.emergency_contact_name,
            s.emergency_contact_phone,
            s.custom_fields,
            re.id as latest_enrollment_id,
            re.school_year as latest_school_year,
            re.grade_level as latest_grade_level,
            re.campus as latest_campus,
            re.status as latest_status,
            re.start_date as latest_start_date,
            re.end_date as latest_end_date,
            re.days_assigned as latest_days_assigned,
            re.credit_days as latest_credit_days,
            re.sped_504 as latest_sped_504,
            re.drg_offense as latest_drg_offense,
            re.comments as latest_comments,
            COALESCE(sa.enrollment_count, 0) as enrollment_count,
            COALESCE(sa.total_days_attended, 0) as total_days_attended,
            COALESCE(les.days_attended, 0) as latest_days_attended
        FROM students s
        INNER JOIN ranked_enrollments re ON s.id = re.student_id AND re.rn = 1
        LEFT JOIN student_aggregates sa ON s.id = sa.student_id
        LEFT JOIN enrollment_stats les ON re.id = les.enrollment_id
    `;

    // Filter by school year - show students who have ANY enrollment in that year
    if (schoolYear && schoolYear !== 'All') {
        conditions.push(`EXISTS (
            SELECT 1 FROM enrollments e2 
            WHERE e2.student_id = s.id AND e2.school_year = $${paramIndex}
        )`);
        params.push(schoolYear);
        paramIndex++;
    }

    // Filter by status (of latest enrollment)
    if (status && status !== 'All') {
        conditions.push(`re.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }

    // Filter by campus (of latest enrollment)
    if (campus && campus !== 'All') {
        conditions.push(`re.campus = $${paramIndex}`);
        params.push(campus);
        paramIndex++;
    }

    // Filter by grade level (of latest enrollment)
    if (gradeLevel && gradeLevel !== 'All') {
        conditions.push(`re.grade_level = $${paramIndex}`);
        params.push(gradeLevel);
        paramIndex++;
    }

    // Filter by SPED/504 (of latest enrollment)
    if (sped504 && sped504 !== 'All') {
        conditions.push(`re.sped_504 = $${paramIndex}`);
        params.push(sped504);
        paramIndex++;
    }

    // Search term - searches name and student number
    if (searchTerm) {
        const term = `%${searchTerm}%`;
        conditions.push(`(s.first_name LIKE $${paramIndex} OR s.last_name LIKE $${paramIndex + 1} OR s.student_number LIKE $${paramIndex + 2})`);
        params.push(term, term, term);
        paramIndex += 3;
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Sorting
    const sortMap: Record<string, string> = {
        lastName: 's.last_name',
        firstName: 's.first_name',
        studentNumber: 's.student_number',
        gradeLevel: 're.grade_level',
        campus: 're.campus',
        status: 're.status',
        enrollmentCount: 'enrollment_count',
        totalDaysAttended: 'total_days_attended',
        entryDate: 're.start_date'
    };

    const dbSortKey = sortMap[sortKey] || 's.last_name';
    const dir = sortDirection === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${dbSortKey} ${dir}, s.last_name ASC, s.first_name ASC`;

    return await db.select(query, params);
};

/**
 * Get all enrollments for a specific student with attendance counts.
 * Used in student detail page to show enrollment history.
 */
export const getStudentEnrollments = async (studentId: string): Promise<(DBEnrollment & { days_attended: number })[]> => {
    const db = await getDb();
    const query = `
        SELECT 
            e.*,
            (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence = 'Present') as days_attended
        FROM enrollments e
        WHERE e.student_id = $1
        ORDER BY e.start_date DESC
    `;
    return await db.select(query, [studentId]);
};

export const getStudentDetails = async (studentId: string) => {
    const db = await getDb();

    // Get Profile
    const students = await db.select<DBStudent[]>("SELECT * FROM students WHERE id = $1", [studentId]);
    const student = students[0];
    if (!student) return null;

    // Get Enrollments with days_attended counts
    const enrollments = await db.select<(DBEnrollment & { days_attended: number })[]>(`
        SELECT 
            e.*,
            (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence = 'Present') as days_attended
        FROM enrollments e
        WHERE e.student_id = $1 
        ORDER BY e.start_date DESC
    `, [studentId]);

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
    // For now, sequentially execute.

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

        await createAuditLog('CREATE_STUDENT', 'Student', student.id, `Created ${student.first_name} ${student.last_name}`);
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
    await createAuditLog('UPDATE_STUDENT', 'Student', student.id, `Updated profile for ${student.first_name} ${student.last_name}`);
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
        await createAuditLog('DELETE_STUDENT', 'Student', studentId, 'Deleted student and related records');
    } catch (e) {
        console.error("Failed to delete student:", e);
        throw e;
    }
};

export const updateStudentEnrollment = async (enrollmentId: string, updates: Partial<DBEnrollment>) => {
    const db = await getDb();
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
    if (records.length === 0) return;

    const db = await getDb();

    // Batch upsert using SQLite's multi-row INSERT
    // Split into chunks to avoid SQLite's parameter limit (typically 999)
    const BATCH_SIZE = 100; // Each record has 5 params, so 100 * 5 = 500 params per batch

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        // Build multi-row INSERT with placeholders
        const valuePlaceholders: string[] = [];
        const params: any[] = [];

        batch.forEach((r, idx) => {
            const offset = idx * 5;
            valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
            params.push(r.id, r.student_id, r.enrollment_id, r.date, r.presence);
        });

        const query = `
            INSERT INTO attendance (id, student_id, enrollment_id, date, presence) 
            VALUES ${valuePlaceholders.join(', ')}
            ON CONFLICT(student_id, date) DO UPDATE SET 
                presence = excluded.presence,
                enrollment_id = excluded.enrollment_id
        `;

        await db.execute(query, params);
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

// --- Audit Logging ---

export const createAuditLog = async (action: string, entityType: string, entityId: string | null, details: string | null) => {
    const db = await getDb();
    // Non-blocking log? For now await it to ensure order/success? 
    // In critical path, maybe fire and forget? 
    // Let's await to be safe for now, can optimize later.
    try {
        await db.execute(
            `INSERT INTO audit_logs (id, action, entity_type, entity_id, details, user_id, timestamp) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [crypto.randomUUID(), action, entityType, entityId, details, 'system', new Date().toISOString()]
        );
    } catch (e) {
        console.error("Failed to write audit log:", e);
        // Don't throw, failing to log shouldn't crash the app action? 
        // Or should it? For strict audit, yes. For this app, maybe warn.
    }
};

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

    // Get settings (v3+)
    const settingsRows = await db.select<{ key: string; value: string }[]>("SELECT key, value FROM app_settings");
    const settings: Record<string, any> = {};
    for (const row of settingsRows) {
        try {
            settings[row.key] = JSON.parse(row.value);
        } catch {
            settings[row.key] = row.value;
        }
    }

    return { students, enrollments, attendance, holidays, schoolYears, settings };
};

export const importData = async (data: {
    students: DBStudent[],
    enrollments: DBEnrollment[],
    attendance: DBAttendance[],
    holidays: DBHoliday[],
    schoolYears?: DBSchoolYear[],  // Optional for backward compatibility with legacy backups
    settings?: Record<string, any>  // Optional settings from export
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

    // Import settings if present (new in v3)
    if (data.settings) {
        for (const [key, value] of Object.entries(data.settings)) {
            await db.execute(
                `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ($1, $2, datetime('now'))`,
                [key, JSON.stringify(value)]
            );
        }
    }
};

// --- Settings ---

interface DBAppSetting {
    key: string;
    value: string;
    updated_at: string;
}

/**
 * Get all app settings from SQLite.
 * Returns a Record<string, any> where values are parsed from JSON.
 */
export const getAppSettingsFromDB = async (): Promise<Record<string, any>> => {
    const db = await getDb();
    const rows = await db.select<DBAppSetting[]>("SELECT key, value FROM app_settings");

    const settings: Record<string, any> = {};
    for (const row of rows) {
        try {
            settings[row.key] = JSON.parse(row.value);
        } catch {
            settings[row.key] = row.value; // Fallback if not valid JSON
        }
    }
    return settings;
};

/**
 * Save settings to SQLite. Only saves the keys that are provided.
 */
export const saveAppSettingsToDB = async (settings: Record<string, any>): Promise<void> => {
    const db = await getDb();

    for (const [key, value] of Object.entries(settings)) {
        await db.execute(
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ($1, $2, datetime('now'))`,
            [key, JSON.stringify(value)]
        );
    }
};

/**
 * Get a single setting value from SQLite.
 */
export const getAppSettingFromDB = async (key: string): Promise<any | null> => {
    const db = await getDb();
    const rows = await db.select<DBAppSetting[]>("SELECT value FROM app_settings WHERE key = $1", [key]);

    if (rows.length === 0) return null;

    try {
        return JSON.parse(rows[0].value);
    } catch {
        return rows[0].value;
    }
};

// --- Maintenance Functions ---

interface SchoolYearDefinition {
    name: string;
    start_date: string;
    end_date: string;
}

/**
 * Recalculate school years for all enrollments based on their registration (start_date).
 * Uses defined school years if available, otherwise assumes July 15 - July 14 of next year.
 * Returns the count of updated enrollments.
 */
export const recalculateAllSchoolYears = async (): Promise<{ updated: number; total: number }> => {
    const db = await getDb();

    // Get all defined school years
    const definedYears = await db.select<SchoolYearDefinition[]>(
        "SELECT name, start_date, end_date FROM school_years ORDER BY start_date DESC"
    );

    // Get all enrollments
    const enrollments = await db.select<{ id: string; start_date: string; school_year: string }[]>(
        "SELECT id, start_date, school_year FROM enrollments"
    );

    let updatedCount = 0;

    for (const enrollment of enrollments) {
        const registrationDate = enrollment.start_date;

        // Determine correct school year
        let correctSchoolYear: string | null = null;

        // First, check if date falls within any defined school year
        for (const year of definedYears) {
            if (registrationDate >= year.start_date && registrationDate <= year.end_date) {
                correctSchoolYear = year.name;
                break;
            }
        }

        // If no defined year matches, calculate based on July 15 cutoff
        if (!correctSchoolYear) {
            const date = new Date(registrationDate + 'T12:00:00Z');
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-indexed
            const day = date.getDate();

            // July 15 or later = start of new school year
            // July 14 or earlier = end of previous school year
            // July is month 6 (0-indexed)
            const isNewSchoolYear = month > 6 || (month === 6 && day >= 15);
            const startYear = isNewSchoolYear ? year : year - 1;
            correctSchoolYear = `${startYear}-${startYear + 1}`;
        }

        // Update if different
        if (correctSchoolYear !== enrollment.school_year) {
            await db.execute(
                "UPDATE enrollments SET school_year = $1 WHERE id = $2",
                [correctSchoolYear, enrollment.id]
            );
            updatedCount++;
        }
    }

    return { updated: updatedCount, total: enrollments.length };
};

/**
 * Close out all Active enrollments from previous school years.
 * Sets status to 'Completed' and adds an end_date if missing.
 * @param currentSchoolYear - The current active school year (e.g., "2024-2025")
 * @returns Count of updated enrollments
 */
export const closeOldEnrollments = async (currentSchoolYear: string): Promise<{ updated: number; total: number }> => {
    const db = await getDb();

    // Find all Active enrollments NOT in the current school year
    const oldActiveEnrollments = await db.select<{ id: string; school_year: string; start_date: string }[]>(
        `SELECT id, school_year, start_date FROM enrollments 
         WHERE status = 'Active' AND school_year != $1`,
        [currentSchoolYear]
    );

    let updatedCount = 0;

    for (const enrollment of oldActiveEnrollments) {
        // Calculate a reasonable end date based on the school year
        // Use the last day of the school year (June 30 of the end year)
        const yearParts = enrollment.school_year.split('-');
        const endYear = yearParts.length === 2 ? parseInt(yearParts[1]) : new Date().getFullYear();
        const exitDate = `${endYear}-06-30`;

        await db.execute(
            `UPDATE enrollments SET status = 'Completed', end_date = $1 WHERE id = $2`,
            [exitDate, enrollment.id]
        );
        updatedCount++;
    }

    return { updated: updatedCount, total: oldActiveEnrollments.length };
};
