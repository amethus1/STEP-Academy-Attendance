
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { AppData, Student, AttendanceRecord, Holiday, Presence, CustomFieldDefinition } from '../types';
import * as storageService from '../services/storageService';

export const useAppData = () => {
  const [data, setData] = useState<AppData>({ students: [], attendance: [], holidays: [], customFieldDefinitions: [] });
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const appData = await storageService.getAppData();
      setData(appData);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateStudent = useCallback(async (studentToUpdate: Student) => {
    try {
      // Optimistic or Fetch-First? Fetch-first is safer for file-based consistency
      const currentData = await storageService.getAppData();
      const students = currentData.students.map(s => s.id === studentToUpdate.id ? studentToUpdate : s);
      await storageService.saveStudents(students);
      setData(prev => ({ ...prev, students })); // Optimistic update for UI
      toast.success('Student updated successfully');
    } catch (error) {
      toast.error('Failed to update student');
      console.error(error);
    }
  }, []);

  const addStudent = useCallback(async (newStudent: Student) => {
    try {
      const currentData = await storageService.getAppData();
      const students = [...currentData.students, newStudent];
      await storageService.saveStudents(students);
      setData(prev => ({ ...prev, students }));
      toast.success(`${newStudent.firstName} ${newStudent.lastName} added`);
    } catch (error) {
      toast.error('Failed to add student');
      console.error(error);
    }
  }, []);

  const markAttendance = useCallback(async (studentId: string, date: string, presence: Presence | null) => {
    try {
      const currentData = await storageService.getAppData();
      let attendance = currentData.attendance.filter(a => !(a.studentId === studentId && a.date === date));
      if (presence) {
        attendance.push({ studentId, date, presence });
      }
      await storageService.saveAttendance(attendance);

      // Update local state to reflect change without full reload
      setData(prev => {
        const newAttendance = prev.attendance.filter(a => !(a.studentId === studentId && a.date === date));
        if (presence) newAttendance.push({ studentId, date, presence });
        return { ...prev, attendance: newAttendance };
      });
      // No toast for attendance
    } catch (error) {
      toast.error('Failed to mark attendance');
      console.error(error);
    }
  }, []);

  const addHoliday = useCallback(async (holiday: Holiday) => {
    try {
      const currentData = await storageService.getAppData();
      if (currentData.holidays.some(h => h.date === holiday.date)) {
        toast.error('A holiday already exists on this date');
        return;
      }
      const holidays = [...currentData.holidays, holiday].sort((a, b) => a.date.localeCompare(b.date));
      await storageService.saveHolidays(holidays);
      setData(prev => ({ ...prev, holidays }));
      toast.success(`Holiday "${holiday.name}" added`);
    } catch (error) {
      toast.error('Failed to add holiday');
      console.error(error);
    }
  }, []);

  const removeHoliday = useCallback(async (holidayDate: string) => {
    try {
      const currentData = await storageService.getAppData();
      const holidays = currentData.holidays.filter(h => h.date !== holidayDate);
      await storageService.saveHolidays(holidays);
      setData(prev => ({ ...prev, holidays }));
      toast.success('Holiday removed');
    } catch (error) {
      toast.error('Failed to remove holiday');
      console.error(error);
    }
  }, []);

  const addCustomFieldDefinition = useCallback(async (definition: CustomFieldDefinition) => {
    try {
      const currentData = await storageService.getAppData();
      const definitions = [...currentData.customFieldDefinitions, definition];
      await storageService.saveCustomFieldDefinitions(definitions);
      setData(prev => ({ ...prev, customFieldDefinitions: definitions }));
      toast.success(`Custom field "${definition.name}" added`);
    } catch (error) {
      toast.error('Failed to add custom field');
      console.error(error);
    }
  }, []);

  const removeCustomFieldDefinition = useCallback(async (fieldId: string) => {
    try {
      const currentData = await storageService.getAppData();
      const definitions = currentData.customFieldDefinitions.filter(f => f.id !== fieldId);
      const students = currentData.students.map(s => {
        const newCustomFields = { ...s.customFields };
        delete newCustomFields[fieldId];
        return { ...s, customFields: newCustomFields };
      });
      // We need to save the DATA (students cleaned up) AND the definitions
      // The service helper `saveCustomFieldDefinitions` only does definitions. 
      // We need a bigger save here or chain them.
      // Let's use saveAppData for atomic update of both
      await storageService.saveAppData({ ...currentData, students, customFieldDefinitions: definitions });

      setData(prev => ({ ...prev, students, customFieldDefinitions: definitions }));
      toast.success('Custom field removed');
    } catch (error) {
      toast.error('Failed to remove custom field');
      console.error(error);
    }
  }, []);

  return { ...data, loading, refreshData, updateStudent, addStudent, markAttendance, addHoliday, removeHoliday, addCustomFieldDefinition, removeCustomFieldDefinition };
};
