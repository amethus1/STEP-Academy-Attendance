import { AppData, Student, AttendanceRecord, Holiday, CustomFieldDefinition, StudentStatus, Presence } from '../types';

const APP_DATA_KEY = 'attendanceAppData';

const generateSampleData = (): AppData => {
  const localToISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const firstNames = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia", "James", "Amelia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Alexander", "Harper", "Michael", "Camila", "Daniel", "Gianna", "Mateo", "Abigail", "Logan", "Luna", "Jackson", "Ella"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

  const students: Student[] = [];
  for (let i = 1; i <= 30; i++) {
    const firstName = firstNames[i - 1];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    students.push({
      id: `SS${202400 + i}`,
      firstName: firstName,
      lastName: lastName,
      registrationDate: '2024-05-15',
      entryDate: '2024-06-03',
      campus: `Campus ${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      gradeLevel: `${Math.floor(Math.random() * 4) + 9}`, // 9, 10, 11, 12
      sped504: ['None', 'SPED', '504'][Math.floor(Math.random() * 3)],
      drgOffense: ['Yes', 'No'][Math.floor(Math.random() * 2)],
      creditDays: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
      daysAssigned: 40,
      status: StudentStatus.Active,
      comments: `Summer session student.`,
      customFields: {},
      photoUrl: null,
      guardianName: `${firstName}'s Guardian`,
      guardianPhone: '555-123-4567',
      emergencyContactName: `Emergency Contact`,
      emergencyContactPhone: '555-987-6543'
    });
  }

  const attendance: AttendanceRecord[] = [];
  const startDate = new Date('2024-06-03T12:00:00Z');
  const today = new Date();
  for (const student of students) {
    let currentDate = new Date(startDate);
    // Only generate attendance up to today
    const endDate = today > currentDate ? today : currentDate;

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays only
        const presence = Math.random() > 0.1 ? Presence.Present : Presence.Absent; // 10% absence rate
        attendance.push({
          studentId: student.id,
          date: localToISODateString(currentDate),
          presence: presence
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const holidays: Holiday[] = [{ date: '2024-07-04', name: 'Independence Day'}];
  
  return { students, attendance, holidays, customFieldDefinitions: [] };
};

const emptyData: AppData = {
  students: [],
  attendance: [],
  holidays: [],
  customFieldDefinitions: [],
};

export const getAppData = (): AppData => {
  try {
    const data = localStorage.getItem(APP_DATA_KEY);
    if (data) {
      const parsedData = JSON.parse(data);
      // Ensure new fields exist for backward compatibility
      if (!parsedData.customFieldDefinitions) {
        parsedData.customFieldDefinitions = [];
      }
      if (parsedData.students) {
          parsedData.students = parsedData.students.map((s: any) => ({
              ...s,
              campus: s.campus || '',
              gradeLevel: s.gradeLevel || '',
              sped504: s.sped504 || 'None',
              drgOffense: s.drgOffense || '',
              creditDays: s.creditDays || 0,
              customFields: s.customFields || {},
              photoUrl: s.photoUrl || null,
              guardianName: s.guardianName || '',
              guardianPhone: s.guardianPhone || '',
              emergencyContactName: s.emergencyContactName || '',
              emergencyContactPhone: s.emergencyContactPhone || '',
          }));
      }
      return parsedData;
    } else {
      const sampleData = generateSampleData();
      localStorage.setItem(APP_DATA_KEY, JSON.stringify(sampleData));
      return sampleData;
    }
  } catch (error) {
    console.error("Failed to parse app data from localStorage", error);
    return emptyData;
  }
};

export const saveAppData = (data: AppData) => {
  try {
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save app data to localStorage", error);
  }
};

export const saveStudents = (students: Student[]) => {
  const data = getAppData();
  data.students = students;
  saveAppData(data);
};

export const saveAttendance = (attendance: AttendanceRecord[]) => {
  const data = getAppData();
  data.attendance = attendance;
  saveAppData(data);
};

export const saveHolidays = (holidays: Holiday[]) => {
  const data = getAppData();
  data.holidays = holidays;
  saveAppData(data);
};

export const saveCustomFieldDefinitions = (definitions: CustomFieldDefinition[]) => {
  const data = getAppData();
  data.customFieldDefinitions = definitions;
  saveAppData(data);
};