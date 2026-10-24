// School year database queries
import { getDb, withTransaction, type Statement } from './index';
import { SchoolYear } from '../types';
import { SchoolYearDefinition } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL YEAR QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const getSchoolYears = async (): Promise<SchoolYear[]> => {
    const db = await getDb();
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
    const entries = Object.entries(updates).filter(([k]) => k !== 'id');
    if (entries.length === 0) return;

    // Map camelCase to snake_case for DB. Field names are interpolated into
    // the SQL, so anything not listed here is refused.
    const dbMap: Record<string, string> = {
        name: 'name',
        startDate: 'start_date',
        endDate: 'end_date'
    };
    const unknown = entries.map(([k]) => k).filter(k => !(k in dbMap));
    if (unknown.length > 0) {
        throw new Error(`Cannot update school year field(s): ${unknown.join(', ')}`);
    }

    const setClause = entries.map(([k], i) => `${dbMap[k]} = $${i + 2}`).join(', ');
    const values = entries.map(([, v]) => v);

    await db.execute(`UPDATE school_years SET ${setClause} WHERE id = $1`, [id, ...values]);
};

export const deleteSchoolYear = async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM school_years WHERE id = $1", [id]);
};

export const getLegacySchoolYears = async (): Promise<string[]> => {
    const db = await getDb();
    const result = await db.select<{ school_year: string }[]>("SELECT DISTINCT school_year FROM enrollments ORDER BY school_year DESC");
    return result.map(r => r.school_year);
};

// ═══════════════════════════════════════════════════════════════════════════
// MAINTENANCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const recalculateAllSchoolYears = async (): Promise<{ updated: number; total: number }> => {
    const db = await getDb();

    const definedYears = await db.select<SchoolYearDefinition[]>(
        "SELECT name, start_date, end_date FROM school_years ORDER BY start_date DESC"
    );

    const enrollments = await db.select<{ id: string; start_date: string; school_year: string }[]>(
        "SELECT id, start_date, school_year FROM enrollments"
    );

    // Collected and applied in one transaction so the fix-up is all or nothing.
    const updates: Statement[] = [];

    for (const enrollment of enrollments) {
        const registrationDate = enrollment.start_date;
        let correctSchoolYear: string | null = null;

        for (const year of definedYears) {
            if (registrationDate >= year.start_date && registrationDate <= year.end_date) {
                correctSchoolYear = year.name;
                break;
            }
        }

        if (!correctSchoolYear) {
            const date = new Date(registrationDate + 'T12:00:00Z');
            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();

            const isNewSchoolYear = month > 6 || (month === 6 && day >= 15);
            const startYear = isNewSchoolYear ? year : year - 1;
            correctSchoolYear = `${startYear}-${startYear + 1}`;
        }

        if (correctSchoolYear !== enrollment.school_year) {
            updates.push({
                sql: "UPDATE enrollments SET school_year = $1 WHERE id = $2",
                params: [correctSchoolYear, enrollment.id]
            });
        }
    }

    await withTransaction(updates);
    return { updated: updates.length, total: enrollments.length };
};

export const closeOldEnrollments = async (currentSchoolYear: string): Promise<{ updated: number; total: number }> => {
    const db = await getDb();

    const oldActiveEnrollments = await db.select<{ id: string; school_year: string; start_date: string }[]>(
        `SELECT id, school_year, start_date FROM enrollments 
         WHERE status = 'Active' AND school_year != $1`,
        [currentSchoolYear]
    );

    // One transaction, so a failure cannot leave some old enrollments closed and others not.
    const updates: Statement[] = oldActiveEnrollments.map(enrollment => {
        const yearParts = enrollment.school_year.split('-');
        const endYear = yearParts.length === 2 ? parseInt(yearParts[1]) : new Date().getFullYear();
        return {
            sql: `UPDATE enrollments SET status = 'Completed', end_date = $1 WHERE id = $2`,
            params: [`${endYear}-06-30`, enrollment.id]
        };
    });

    await withTransaction(updates);
    return { updated: updates.length, total: oldActiveEnrollments.length };
};
