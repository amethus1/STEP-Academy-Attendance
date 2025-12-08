import { AppData, Student, AttendanceRecord, Holiday, Presence, StudentStatus } from '../types';

/**
 * Generates sample data for testing or fresh installs.
 * @deprecated This logic works with the old JSON schema. Ideally move to a SQL seeder script.
 */
export const generateMockData = (): AppData => {
  const localToISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const today = new Date();
  const currentYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  const schoolYearStart = `${currentYear}-08-15`;
  const registrationDate = `${currentYear}-08-10`;
  const entryDate = `${currentYear}-08-19`;

  const firstNames = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];

  const students: Student[] = [];
  for (let i = 1; i <= 30; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    students.push({
      id: `SS${currentYear * 100 + i}`,
      firstName: firstName,
      lastName: lastName,
      registrationDate: registrationDate,
      entryDate: entryDate,
      campus: `Campus ${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      gradeLevel: `${Math.floor(Math.random() * 4) + 9}`,
      sped504: ['None', 'SPED', '504'][Math.floor(Math.random() * 3)],
      drgOffense: ['Yes', 'No'][Math.floor(Math.random() * 2)],
      creditDays: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
      daysAssigned: 45,
      status: StudentStatus.Active,
      comments: `Sample student.`,
      customFields: {},
      photoUrl: null,
      guardianName: `${firstName}'s Guardian`,
      guardianPhone: '555-123-4567',
      emergencyContactName: `Emergency Contact`,
      emergencyContactPhone: '555-987-6543'
    });
  }

  const attendance: AttendanceRecord[] = [];
  const startDate = new Date(entryDate + 'T12:00:00Z');
  // Generate a few weeks of attendance
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const loopDate = new Date(startDate);

  while (loopDate <= endDate && loopDate <= today) {
    const dayOfWeek = loopDate.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      students.forEach(s => {
        const presence = Math.random() > 0.1 ? Presence.Present : Presence.Absent;
        attendance.push({
          studentId: s.id,
          date: localToISODateString(loopDate),
          presence
        });
      });
    }
    loopDate.setDate(loopDate.getDate() + 1);
  }

  const holidays: Holiday[] = [
    { date: `${currentYear}-11-28`, name: 'Thanksgiving' },
    { date: `${currentYear}-12-25`, name: 'Christmas Day' },
  ];

  return { students, attendance, holidays, customFieldDefinitions: [] };
};