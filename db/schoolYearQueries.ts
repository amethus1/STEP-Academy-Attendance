// School year database queries
import { getDb } from './index';
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

    let updatedCount = 0;

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
            await db.execute(
                "UPDATE enrollments SET school_year = $1 WHERE id = $2",
                [correctSchoolYear, enrollment.id]
            );
            updatedCount++;
        }
    }

    return { updated: updatedCount, total: enrollments.length };
};

export const closeOldEnrollments = async (currentSchoolYear: string): Promise<{ updated: number; total: number }> => {
    const db = await getDb();

    const oldActiveEnrollments = await db.select<{ id: string; school_year: string; start_date: string }[]>(
        `SELECT id, school_year, start_date FROM enrollments 
         WHERE status = 'Active' AND school_year != $1`,
        [currentSchoolYear]
    );

    let updatedCount = 0;

    for (const enrollment of oldActiveEnrollments) {
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
