import { Student, AttendanceRecord, StudentStatus, Presence } from './types';
import { formatDate } from './utils/date';

export const INITIAL_STUDENTS: Student[] = [
  {
    studentId: 'STU-001',
    lastName: 'Smith',
    firstName: 'John',
    campus: 'North',
    gradeLevel: '10',
    sped504: 'N',
    drg: 'A',
    creditDays: 0,
    entryDate: '2024-05-01',
    registrationDate: '2024-04-20',
    daysAssigned: 90,
    status: StudentStatus.Active,
    comments: 'Has shown great improvement.',
    customFields: { homeroom: '101', guardianPhone: '555-1111' },
  },
  {
    studentId: 'STU-002',
    lastName: 'Doe',
    firstName: 'Jane',
    campus: 'South',
    gradeLevel: '11',
    sped504: '504',
    drg: 'B',
    creditDays: 2,
    entryDate: '2024-05-15',
    registrationDate: '2024-05-01',
    daysAssigned: 60,
    status: StudentStatus.Active,
    customFields: { homeroom: '102', guardianPhone: '555-2222' },
  },
  {
    studentId: 'STU-003',
    lastName: 'Garcia',
    firstName: 'Carlos',
    campus: 'East',
    gradeLevel: '12',
    sped504: 'N',
    drg: 'C',
    creditDays: 5,
    entryDate: '2024-04-10',
    registrationDate: '2024-04-01',
    daysAssigned: 120,
    status: StudentStatus.Active,
    comments: 'Frequently requires extra help.',
    customFields: { homeroom: '103', guardianPhone: '555-3333' },
  },
  {
    studentId: 'STU-004',
    lastName: 'Miller',
    firstName: 'Emily',
    campus: 'West',
    gradeLevel: '9',
    sped504: 'N',
    drg: 'A',
    creditDays: 0,
    entryDate: '2024-03-01',
    registrationDate: '2024-02-15',
    daysAssigned: 100,
    status: StudentStatus.Completed,
    customFields: { homeroom: '104', guardianPhone: '555-4444' },
  },
  {
    studentId: 'STU-005',
    lastName: 'Wilson',
    firstName: 'David',
    campus: 'Central',
    gradeLevel: '11',
    sped504: 'N',
    drg: 'B',
    creditDays: 0,
    entryDate: '2024-06-01',
    registrationDate: '2024-05-20',
    daysAssigned: 45,
    status: StudentStatus.Withdrawn,
    comments: 'Withdrew due to family relocation.',
    customFields: { homeroom: '105', guardianPhone: '555-5555' },
  },
];

export const INITIAL_HOLIDAYS = [
  '2024-09-02',
  '2024-11-28',
  '2024-12-25',
  '2025-01-01',
];

const makeAttendance = (): AttendanceRecord[] => {
  const recs: AttendanceRecord[] = [];
  const today = new Date();

  INITIAL_STUDENTS.filter(s => s.status === StudentStatus.Active).forEach(stu => {
    for (let i = 0; i < 90; i++) {
      const d = new Date(stu.entryDate);
      d.setDate(d.getDate() + i);
      if (d > today) break;
      const dow = d.getDay();
      const dStr = formatDate(d);
      if (dow === 0 || dow === 6 || INITIAL_HOLIDAYS.includes(dStr)) continue;

      recs.push({
        logId: `LOG-${stu.studentId}-${dStr}`,
        studentId: stu.studentId,
        attendanceDate: dStr,
        presence: Math.random() > 0.15 ? Presence.Present : Presence.Absent,
      });
    }
  });
  return recs;
};

export const INITIAL_ATTENDANCE_LOG = makeAttendance();