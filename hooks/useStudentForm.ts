import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { Student, StudentStatus } from '../types';
import { toISODateString } from '../services/dateUtils';

const studentSchema = z.object({
    firstName: z.string().min(1, 'First Name is required'),
    lastName: z.string().min(1, 'Last Name is required'),
    studentNumber: z.string().min(1, 'Student ID is required'),
    daysAssigned: z.number().min(0, 'Days assigned must be positive'),
    status: z.nativeEnum(StudentStatus),
    exitDate: z.string().optional(),
    campus: z.string().optional(),
    gradeLevel: z.string().optional(),
}).superRefine((data, ctx) => {
    if ((data.status === StudentStatus.Withdrawn || data.status === StudentStatus.Completed) && !data.exitDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Exit Date is required for inactive students",
            path: ["exitDate"]
        });
    }
});

const initialFormState: Student = {
    id: '',
    studentNumber: '',
    firstName: '',
    lastName: '',
    registrationDate: toISODateString(new Date()),
    entryDate: toISODateString(new Date()),
    exitDate: '',
    daysAssigned: 0,
    status: StudentStatus.Active,
    comments: '',
    campus: '',
    gradeLevel: '',
    sped504: 'None',
    drgOffense: '',
    creditDays: 0,
    customFields: {},
    photoUrl: null,
    guardianName: '',
    guardianPhone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
};

export const useStudentForm = (studentToEdit: Student | null | undefined, existingStudents: Student[], isOpen: boolean) => {
    const [formData, setFormData] = useState<Student>(initialFormState);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditMode = !!studentToEdit;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && studentToEdit) {
                setFormData({
                    ...initialFormState,
                    ...studentToEdit,
                    studentNumber: studentToEdit.studentNumber || studentToEdit.id,
                    customFields: studentToEdit.customFields || {}
                });
            } else {
                const newId = crypto.randomUUID();
                setFormData({ ...initialFormState, id: newId });
            }
            setErrors({});
        }
        // We intentionally want to reset form state when the modal opens or student changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentToEdit, isOpen]);

    // Derived state for potential matches
    const potentialMatch = useMemo(() => {
        if (!isEditMode && formData.firstName && formData.lastName && formData.firstName.length > 2 && formData.lastName.length > 2) {
            return existingStudents.find(s =>
                s.firstName.toLowerCase() === formData.firstName.toLowerCase() &&
                s.lastName.toLowerCase() === formData.lastName.toLowerCase()
            ) || null;
        }
        return null;
    }, [formData.firstName, formData.lastName, isEditMode, existingStudents]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: (name === 'daysAssigned' || name === 'creditDays') ? parseInt(value, 10) || 0 : value }));
    }, []);

    const handleCustomFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            customFields: {
                ...prev.customFields,
                [name]: type === 'number' ? parseInt(value, 10) || 0 : value
            }
        }));
    }, []);

    const setPhotoUrl = useCallback((url: string | null) => {
        setFormData(prev => ({ ...prev, photoUrl: url }));
    }, []);

    const handleReEnroll = useCallback(() => {
        if (!potentialMatch) return;

        const newId = 'SS' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

        setFormData(prev => ({
            ...prev,
            id: newId,
            studentNumber: potentialMatch.studentNumber || potentialMatch.id,
            campus: potentialMatch.campus,
            gradeLevel: potentialMatch.gradeLevel,
            sped504: potentialMatch.sped504,
            drgOffense: potentialMatch.drgOffense,
            photoUrl: potentialMatch.photoUrl,
            guardianName: potentialMatch.guardianName,
            guardianPhone: potentialMatch.guardianPhone,
            emergencyContactName: potentialMatch.emergencyContactName,
            emergencyContactPhone: potentialMatch.emergencyContactPhone,
            customFields: potentialMatch.customFields,
            masterId: potentialMatch.masterId || potentialMatch.id
        }));
    }, [potentialMatch]);

    const validate = useCallback(() => {
        try {
            studentSchema.parse(formData);
            setErrors({});
            return true;
        } catch (err) {
            if (err instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                (err as z.ZodError).issues.forEach((e) => {
                    if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
                });
                setErrors(fieldErrors);
            }
            return false;
        }
    }, [formData]);

    return {
        formData,
        errors,
        potentialMatch,
        isEditMode,
        handleChange,
        handleCustomFieldChange,
        setPhotoUrl,
        handleReEnroll,
        validate,
        setFormData
    };
};
