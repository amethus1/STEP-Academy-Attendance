import { useCallback } from 'react';
import { toast } from 'sonner';
import { useSaveAttendance, useDeleteAttendance } from './useAttendance';
import { Presence } from '../types';
import { formatDateForDisplay } from '../services/dateUtils';

/** What marking needs to know about a student. */
export interface MarkableStudent {
    id: string;
    firstName: string;
    lastName: string;
    enrollmentId?: string;
}

/** A student's state before a change, kept so the change can be undone. */
interface SnapshotEntry {
    studentId: string;
    enrollmentId: string;
    presence: Presence | undefined;
}

const fullName = (s: MarkableStudent) => `${s.firstName} ${s.lastName}`;

/**
 * Recording, clearing and undoing attendance, shared by the Daily and Weekly
 * views so the two cannot drift apart again.
 *
 * Every change confirms with an Undo that restores the exact previous state.
 * The date travels with the snapshot, so undoing after moving to another day
 * or week still targets the day that was changed.
 */
export const useAttendanceMarking = () => {
    const { mutate: saveAttendance } = useSaveAttendance();
    const { mutate: deleteAttendance } = useDeleteAttendance();

    const restore = useCallback((date: string, snapshot: SnapshotEntry[]) => {
        const toRestore = snapshot.filter(s => s.presence !== undefined);
        const toRemove = snapshot.filter(s => s.presence === undefined);

        if (toRestore.length > 0) {
            saveAttendance(toRestore.map(s => ({
                id: crypto.randomUUID(),
                enrollment_id: s.enrollmentId,
                student_id: s.studentId,
                date,
                presence: s.presence as Presence,
                comment: null
            })));
        }
        toRemove.forEach(s => deleteAttendance({ studentId: s.studentId, date }));
    }, [saveAttendance, deleteAttendance]);

    /**
     * Set one student's status for `date`. Choosing the status they already
     * have clears it.
     */
    const mark = useCallback((
        student: MarkableStudent,
        date: string,
        current: Presence | undefined,
        target: Presence
    ) => {
        if (!student.enrollmentId) {
            console.error('No enrollment found for student', student.id);
            toast.error(`Could not save attendance for ${fullName(student)}: they have no enrollment for this school year.`);
            return;
        }

        const snapshot = [{ studentId: student.id, enrollmentId: student.enrollmentId, presence: current }];
        const undo = { action: { label: 'Undo', onClick: () => restore(date, snapshot) } };
        const when = formatDateForDisplay(date);

        if (current === target) {
            deleteAttendance({ studentId: student.id, date }, {
                onSuccess: () => toast.success(`Cleared ${fullName(student)}'s attendance for ${when}`, undo)
            });
            return;
        }

        saveAttendance([{
            id: crypto.randomUUID(),
            enrollment_id: student.enrollmentId,
            student_id: student.id,
            date,
            presence: target,
            comment: null
        }], {
            onSuccess: () => toast.success(`${fullName(student)} marked ${target} for ${when}`, undo)
        });
    }, [saveAttendance, deleteAttendance, restore]);

    /**
     * Give several students the same status for `date`, with one Undo for the
     * whole batch. Students without an enrollment are skipped and counted in
     * the confirmation rather than failing the batch.
     */
    const markMany = useCallback((
        entries: { student: MarkableStudent; current: Presence | undefined }[],
        date: string,
        presence: Presence
    ) => {
        const eligible = entries.filter(e => e.student.enrollmentId);
        const skipped = entries.length - eligible.length;

        if (eligible.length === 0) {
            toast.error('None of the selected students have an enrollment for this school year, so nothing was saved.');
            return;
        }

        const snapshot = eligible.map(e => ({
            studentId: e.student.id,
            enrollmentId: e.student.enrollmentId as string,
            presence: e.current
        }));
        const changed = eligible.filter(e => e.current !== undefined && e.current !== presence).length;

        saveAttendance(eligible.map(e => ({
            id: crypto.randomUUID(),
            enrollment_id: e.student.enrollmentId as string,
            student_id: e.student.id,
            date,
            presence,
            comment: null
        })), {
            onSuccess: () => {
                const notes = [
                    changed > 0 ? `${changed} changed from another status` : '',
                    skipped > 0 ? `${skipped} skipped with no enrollment` : ''
                ].filter(Boolean).join('; ');
                toast.success(
                    `Marked ${eligible.length} ${eligible.length === 1 ? 'student' : 'students'} ${presence} for ${formatDateForDisplay(date)}` +
                    (notes ? ` (${notes})` : ''),
                    { action: { label: 'Undo', onClick: () => restore(date, snapshot) } }
                );
            }
        });
    }, [saveAttendance, restore]);

    return { mark, markMany, restore };
};
