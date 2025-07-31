
import { useState, useCallback, useEffect } from 'react';
import { AppData, Student, AttendanceRecord, Holiday, Presence, CustomFieldDefinition } from '../types';
import * as storageService from '../services/storageService';

export const useAppData = () => {
  const [data, setData] = useState<AppData>({ students: [], attendance: [], holidays: [], customFieldDefinitions: [] });
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(() => {
    setLoading(true);
    const appData = storageService.getAppData();
    setData(appData);
    setLoading(false);
  }, []);
  
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateStudent = useCallback((studentToUpdate: Student) => {
    const currentData = storageService.getAppData();
    const students = currentData.students.map(s => s.id === studentToUpdate.id ? studentToUpdate : s);
    storageService.saveStudents(students);
    refreshData();
  }, [refreshData]);
  
  const addStudent = useCallback((newStudent: Student) => {
    const currentData = storageService.getAppData();
    const students = [...currentData.students, newStudent];
    storageService.saveStudents(students);
    refreshData();
  }, [refreshData]);

  const markAttendance = useCallback((studentId: string, date: string, presence: Presence | null) => {
    const currentData = storageService.getAppData();
    let attendance = currentData.attendance.filter(a => !(a.studentId === studentId && a.date === date));
    if (presence) {
      attendance.push({ studentId, date, presence });
    }
    storageService.saveAttendance(attendance);
    refreshData();
  }, [refreshData]);

  const addHoliday = useCallback((holiday: Holiday) => {
    const currentData = storageService.getAppData();
    if (currentData.holidays.some(h => h.date === holiday.date)) return;
    const holidays = [...currentData.holidays, holiday].sort((a,b) => a.date.localeCompare(b.date));
    storageService.saveHolidays(holidays);
    refreshData();
  }, [refreshData]);

  const removeHoliday = useCallback((holidayDate: string) => {
    const currentData = storageService.getAppData();
    const holidays = currentData.holidays.filter(h => h.date !== holidayDate);
    storageService.saveHolidays(holidays);
    refreshData();
  }, [refreshData]);
  
  const addCustomFieldDefinition = useCallback((definition: CustomFieldDefinition) => {
    const currentData = storageService.getAppData();
    const definitions = [...currentData.customFieldDefinitions, definition];
    storageService.saveCustomFieldDefinitions(definitions);
    refreshData();
  }, [refreshData]);

  const removeCustomFieldDefinition = useCallback((fieldId: string) => {
    const currentData = storageService.getAppData();
    const definitions = currentData.customFieldDefinitions.filter(f => f.id !== fieldId);
    const students = currentData.students.map(s => {
        const newCustomFields = { ...s.customFields };
        delete newCustomFields[fieldId];
        return { ...s, customFields: newCustomFields };
    });
    storageService.saveAppData({ ...currentData, students, customFieldDefinitions: definitions });
    refreshData();
  }, [refreshData]);

  return { ...data, loading, refreshData, updateStudent, addStudent, markAttendance, addHoliday, removeHoliday, addCustomFieldDefinition, removeCustomFieldDefinition };
};
