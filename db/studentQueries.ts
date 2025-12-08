// Student-related database queries
import { getDb, withTransaction } from './index';
import {
    DBStudent,
    DBEnrollment,
    DBAttendance,
    StudentWithEnrollment,
    StudentSearchOptions,
    UniqueStudentRow,
    UniqueStudentSearchOptions
} from './types';
import { createAuditLog } from './auditQueries';

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const searchStudents = async (options: StudentSearchOptions): Promise<StudentWithEnrollment[]> => {
    const db = await getDb();
    const { schoolYear, searchTerm, status, campus, gradeLevel, sped504, sortKey = 'lastName', sortDirection = 'asc', limit, offset } = options;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // 1. School Year Logic
    if (schoolYear !== 'All') {
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
        daysAttended: 'days_attended',
        daysAssigned: 'e.days_assigned',
        entryDate: 'e.start_date'
    };

    const dbSortKey = sortMap[sortKey] || 's.last_name';
    const dir = sortDirection === 'desc' ? 'DESC' : 'ASC';
    const orderBy = `ORDER BY ${dbSortKey} ${dir}, s.last_name ASC, s.first_name ASC`;

    // 5. Pagination (parameterized for safety)
    let limitClause = '';
    let offsetClause = '';
    if (limit) {
        limitClause = `LIMIT $${paramIndex}`;
        params.push(limit);
        paramIndex++;
    }
    if (offset) {
        offsetClause = `OFFSET $${paramIndex}`;
        params.push(offset);
        paramIndex++;
    }

    const query = `
        SELECT 
          s.id as studentId, s.student_number, s.first_name, s.last_name, s.dob, 
          s.guardian_name, s.guardian_phone, s.emergency_contact_name, s.emergency_contact_phone, s.photo_url, s.custom_fields,
          e.id as enrollmentId, e.school_year, e.start_date, e.end_date, e.grade_level, e.campus, e.status,
          e.sped_504, e.drg_offense, e.days_assigned, e.credit_days, e.comments,
          (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence IN ('Present', 'Tardy')) as days_attended
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        ${whereClause}
        ${orderBy}
        ${limitClause} ${offsetClause}
    `;

    return await db.select(query, params);
};

export const getStudentsByYear = async (schoolYear: string): Promise<StudentWithEnrollment[]> => {
    return searchStudents({ schoolYear });
};

export const getUniqueStudents = async (options: UniqueStudentSearchOptions): Promise<UniqueStudentRow[]> => {
    const db = await getDb();
    const { schoolYear = 'All', status, campus, gradeLevel, sped504, searchTerm, sortKey = 'lastName', sortDirection = 'asc' } = options;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

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
                (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence IN ('Present', 'Tardy')) as days_attended
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

    if (schoolYear && schoolYear !== 'All') {
        conditions.push(`EXISTS (
            SELECT 1 FROM enrollments e2 
            WHERE e2.student_id = s.id AND e2.school_year = $${paramIndex}
        )`);
        params.push(schoolYear);
        paramIndex++;
    }

    if (status && status !== 'All') {
        conditions.push(`re.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }

    if (campus && campus !== 'All') {
        conditions.push(`re.campus = $${paramIndex}`);
        params.push(campus);
        paramIndex++;
    }

    if (gradeLevel && gradeLevel !== 'All') {
        conditions.push(`re.grade_level = $${paramIndex}`);
        params.push(gradeLevel);
        paramIndex++;
    }

    if (sped504 && sped504 !== 'All') {
        conditions.push(`re.sped_504 = $${paramIndex}`);
        params.push(sped504);
        paramIndex++;
    }

    if (searchTerm) {
        const term = `%${searchTerm}%`;
        conditions.push(`(s.first_name LIKE $${paramIndex} OR s.last_name LIKE $${paramIndex + 1} OR s.student_number LIKE $${paramIndex + 2})`);
        params.push(term, term, term);
        paramIndex += 3;
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

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

export const getStudentEnrollments = async (studentId: string): Promise<(DBEnrollment & { days_attended: number })[]> => {
    const db = await getDb();
    const query = `
        SELECT 
            e.*,
            (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence IN ('Present', 'Tardy')) as days_attended
        FROM enrollments e
        WHERE e.student_id = $1
        ORDER BY e.start_date DESC
    `;
    return await db.select(query, [studentId]);
};

export const getStudentDetails = async (studentId: string) => {
    const db = await getDb();

    const students = await db.select<DBStudent[]>("SELECT * FROM students WHERE id = $1", [studentId]);
    const student = students[0];
    if (!student) return null;

    const enrollments = await db.select<(DBEnrollment & { days_attended: number })[]>(`
        SELECT 
            e.*,
            (SELECT COUNT(*) FROM attendance a WHERE a.enrollment_id = e.id AND a.presence IN ('Present', 'Tardy')) as days_attended
        FROM enrollments e
        WHERE e.student_id = $1 
        ORDER BY e.start_date DESC
    `, [studentId]);

    const attendance = await db.select<DBAttendance[]>("SELECT * FROM attendance WHERE student_id = $1", [studentId]);

    return { student, enrollments, attendance };
};

export const createStudent = async (student: DBStudent, enrollment: DBEnrollment): Promise<void> => {
    await withTransaction(async (db) => {
        const exists = await db.select<DBStudent[]>("SELECT id FROM students WHERE id = $1", [student.id]);

        if (exists.length === 0) {
            await db.execute(
                `INSERT INTO students (id, student_number, first_name, last_name, dob, guardian_name, guardian_phone, emergency_contact_name, emergency_contact_phone, photo_url, custom_fields) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [student.id, student.student_number, student.first_name, student.last_name, student.dob, student.guardian_name, student.guardian_phone, student.emergency_contact_name, student.emergency_contact_phone, student.photo_url, student.custom_fields]
            );
        } else {
            await db.execute(
                `UPDATE students SET student_number=$2, first_name=$3, last_name=$4, guardian_name=$5, guardian_phone=$6, emergency_contact_name=$7, emergency_contact_phone=$8, photo_url=$9, custom_fields=$10 WHERE id=$1`,
                [student.id, student.student_number, student.first_name, student.last_name, student.guardian_name, student.guardian_phone, student.emergency_contact_name, student.emergency_contact_phone, student.photo_url, student.custom_fields]
            );
        }

        await db.execute(
            `INSERT INTO enrollments (id, student_id, school_year, start_date, end_date, grade_level, campus, status, sped_504, drg_offense, days_assigned, credit_days, comments)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [enrollment.id, enrollment.student_id, enrollment.school_year, enrollment.start_date, enrollment.end_date, enrollment.grade_level, enrollment.campus, enrollment.status, enrollment.sped_504, enrollment.drg_offense, enrollment.days_assigned, enrollment.credit_days, enrollment.comments]
        );
    });

    await createAuditLog('CREATE_STUDENT', 'Student', student.id, `Created ${student.first_name} ${student.last_name}`);
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
    await withTransaction(async (db) => {
        await db.execute("DELETE FROM attendance WHERE student_id = $1", [studentId]);
        await db.execute("DELETE FROM enrollments WHERE student_id = $1", [studentId]);
        await db.execute("DELETE FROM students WHERE id = $1", [studentId]);
    });

    await createAuditLog('DELETE_STUDENT', 'Student', studentId, 'Deleted student and related records');
};

export const updateStudentEnrollment = async (enrollmentId: string, updates: Partial<DBEnrollment>) => {
    const db = await getDb();
    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'student_id');
    if (keys.length === 0) return;

    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => (updates as any)[k]);

    const query = `UPDATE enrollments SET ${setClause} WHERE id = $1`;
    await db.execute(query, [enrollmentId, ...values]);
};
