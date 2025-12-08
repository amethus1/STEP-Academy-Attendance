// Holiday-related database queries
import { getDb } from './index';
import { DBHoliday } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// HOLIDAY QUERIES
// ═══════════════════════════════════════════════════════════════════════════

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

export const deleteHoliday = async (date: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM holidays WHERE date = $1", [date]);
};
