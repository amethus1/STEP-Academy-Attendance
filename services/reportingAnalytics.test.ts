import { describe, it, expect } from 'vitest';
import { computeReportingAnalytics } from './reportingAnalytics';
import { referenceReportingAnalytics } from './reportingAnalytics.reference';
import type { StudentWithEnrollment, DBAttendance, DBHoliday } from '../db/types';

// Deterministic pseudo-random numbers so a failure is reproducible.
const rng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

const student = (i: number, over: Partial<StudentWithEnrollment> = {}): StudentWithEnrollment => ({
    id: `s${i}`, student_id: `s${i}`, studentId: `s${i}`, enrollmentId: `e${i}`,
    student_number: null, first_name: `First${i}`, last_name: `Last${i}`, dob: null, gender: null,
    guardian_name: null, guardian_phone: null, guardian_email: null,
    emergency_contact_name: null, emergency_contact_phone: null, photo_url: null, custom_fields: null,
    school_year: '2025-2026', start_date: '2025-08-18', end_date: null, grade_level: String(9 + (i % 4)),
    campus: i % 3 === 0 ? null : `Campus ${i % 2}`, status: 'Active', sped_504: null, drg_offense: null,
    days_assigned: 45, credit_days: 0, comments: null, days_attended: 0,
    ...over
});

const isoDays = (start: string, count: number) =>
    Array.from({ length: count }, (_, d) => {
        const date = new Date(start + 'T12:00:00Z');
        date.setUTCDate(date.getUTCDate() + d);
        return date.toISOString().slice(0, 10);
    });

const buildYear = (students: number, days: number, seed: number) => {
    const random = rng(seed);
    const roster = Array.from({ length: students }, (_, i) =>
        student(i, {
            // A mix of start dates and statuses exercises the date and status branches.
            start_date: isoDays('2025-08-18', 30)[Math.floor(random() * 30)],
            status: random() < 0.1 ? 'Withdrawn' : 'Active'
        })
    );
    const presences = ['Present', 'Present', 'Present', 'Tardy', 'Absent', 'Excused'];
    const attendance: DBAttendance[] = [];
    for (const s of roster) {
        for (const date of isoDays('2025-08-18', days)) {
            if (random() < 0.15) continue; // unmarked days
            attendance.push({
                id: `${s.studentId}-${date}`, student_id: s.studentId, enrollment_id: s.enrollmentId,
                date, presence: presences[Math.floor(random() * presences.length)], comment: null
            });
        }
    }
    const holidays: DBHoliday[] = [
        { date: '2025-09-01', name: 'Labor Day', school_year: '2025-2026' },
        { date: '2025-11-27', name: 'Thanksgiving', school_year: '2025-2026' }
    ];
    return { roster, attendance, holidays };
};

describe('computeReportingAnalytics', () => {
    it('matches the previous algorithm exactly across varied data', () => {
        for (const seed of [1, 2, 3, 42, 2025]) {
            const { roster, attendance, holidays } = buildYear(25, 120, seed);
            const today = new Date('2025-12-15T15:00:00Z');
            const args = {
                students: roster, attendance, holidays,
                dateRange: { start: '2025-08-18', end: '2026-01-31' },
                thresholds: { atRisk: 3, atRiskDays: 30 }
            };

            expect(computeReportingAnalytics({ ...args, today }))
                .toEqual(referenceReportingAnalytics({ ...args, now: today }));
        }
    });

    it('counts tardies as present and ignores weekends and holidays', () => {
        const s = student(1, { start_date: '2025-09-01', campus: 'North' });
        // 2025-09-01 is a Monday holiday; Sept 6-7 are a weekend.
        const result = computeReportingAnalytics({
            students: [s],
            attendance: [
                { id: 'a', student_id: 's1', enrollment_id: 'e1', date: '2025-09-02', presence: 'Present', comment: null },
                { id: 'b', student_id: 's1', enrollment_id: 'e1', date: '2025-09-03', presence: 'Tardy', comment: null },
                { id: 'c', student_id: 's1', enrollment_id: 'e1', date: '2025-09-04', presence: 'Absent', comment: null },
                { id: 'd', student_id: 's1', enrollment_id: 'e1', date: '2025-09-06', presence: 'Present', comment: null }
            ],
            holidays: [{ date: '2025-09-01', name: 'Labor Day', school_year: null }],
            dateRange: { start: '2025-09-01', end: '2025-09-07' },
            today: new Date('2025-12-01T12:00:00Z')
        });

        // School days Sept 2-5 = 4 possible; Present + Tardy = 2.
        expect(result.byCampus).toEqual([{ name: 'North', rate: 50, present: 2, possible: 4 }]);
        expect(result.overall).toBe(50);
        expect(result.perfectCount).toBe(0);
    });

    it('returns empty results when nobody is active', () => {
        const result = computeReportingAnalytics({
            students: [student(1, { status: 'Withdrawn' })], attendance: [], holidays: [],
            dateRange: { start: '2025-09-01', end: '2025-09-30' }
        });
        expect(result).toEqual({ overall: 0, perfectCount: 0, totalActive: 0, chartData: [], atRisk: [], byCampus: [], byGrade: [] });
    });

    it('stays fast for a full year of a large class', () => {
        const { roster, attendance, holidays } = buildYear(120, 180, 7);
        const started = performance.now();
        computeReportingAnalytics({
            students: roster, attendance, holidays,
            dateRange: { start: '2025-08-18', end: '2026-06-30' },
            today: new Date('2026-06-30T12:00:00Z')
        });
        // The previous version took about two seconds for this; leave room for slow CI machines.
        expect(performance.now() - started).toBeLessThan(500);
    });
});
