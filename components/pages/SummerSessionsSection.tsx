import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog } from '../common/Dialog';
import { TrashIcon, PencilIcon } from '../icons/Icons';
import { formatDateForDisplay } from '../../services/dateUtils';
import { useUniqueStudents } from '../../hooks/useStudents';
import {
    useSummerSessions,
    useSummerSessionStudents,
    useSaveSummerSession,
    useDeleteSummerSession,
    useSetSummerSessionStudents
} from '../../hooks/useSummerSessions';
import type { SummerSession } from '../../db/queries';

const inputClass = 'w-full rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring focus:ring-brand focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';
const cancelClass = 'px-4 py-2 border border-slate-300 rounded-md text-slate-700 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700';
const saveClass = 'px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-dark shadow-sm disabled:opacity-50';

type SessionForm = { name: string; startDate: string; endDate: string };

const SessionDialog: React.FC<{ session: SummerSession | null; onClose: () => void }> = ({ session, onClose }) => {
    const save = useSaveSummerSession();
    const [form, setForm] = useState<SessionForm>({
        name: session?.name ?? '',
        startDate: session?.startDate ?? '',
        endDate: session?.endDate ?? ''
    });
    const datesInvalid = !!form.startDate && !!form.endDate && form.endDate < form.startDate;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (datesInvalid) return;
        try {
            await save.mutateAsync({ id: session?.id ?? crypto.randomUUID(), ...form, name: form.name.trim() });
            toast.success(session ? 'Summer session updated' : 'Summer session added');
            onClose();
        } catch {
            // The mutation already shows the error.
        }
    };

    return (
        <Dialog onClose={onClose} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            {titleId => (
                <>
                    <h2 id={titleId} className="text-xl font-bold mb-4 dark:text-white">{session ? 'Edit Summer Session' : 'Add Summer Session'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="session-name" className={labelClass}>Name</label>
                            <input id="session-name" type="text" required placeholder="e.g. Summer Session 1 (2027)" value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="session-start" className={labelClass}>First day</label>
                            <input id="session-start" type="date" required value={form.startDate}
                                onChange={e => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="session-end" className={labelClass}>Last day</label>
                            <input id="session-end" type="date" required value={form.endDate}
                                onChange={e => setForm({ ...form, endDate: e.target.value })} className={inputClass}
                                aria-invalid={datesInvalid} />
                            {datesInvalid && <p className="mt-1 text-sm text-red-600 dark:text-red-400">The last day must be on or after the first day.</p>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Weekdays in this range (except holidays) count as school days, but only for the students you add to the session.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={onClose} className={cancelClass}>Cancel</button>
                            <button type="submit" disabled={save.isPending || datesInvalid} className={saveClass}>Save</button>
                        </div>
                    </form>
                </>
            )}
        </Dialog>
    );
};

const RosterDialog: React.FC<{ session: SummerSession; onClose: () => void }> = ({ session, onClose }) => {
    const { data: students = [], isLoading: studentsLoading } = useUniqueStudents({ schoolYear: 'All' });
    const { data: currentIds, isLoading: rosterLoading } = useSummerSessionStudents(session.id);
    const setStudents = useSetSummerSessionStudents();
    const [selected, setSelected] = useState<Set<string> | null>(null);
    const [search, setSearch] = useState('');

    // Start from the saved roster once it loads; after that the checkboxes own it.
    const chosen = useMemo(() => selected ?? new Set(currentIds ?? []), [selected, currentIds]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        return students
            // Active students, plus anyone already on the session so they can be removed.
            .filter(s => s.latest_status === 'Active' || chosen.has(s.studentId))
            .filter(s => !term || `${s.first_name} ${s.last_name} ${s.last_name}, ${s.first_name} ${s.student_number ?? ''}`.toLowerCase().includes(term));
    }, [students, search, chosen]);

    const toggle = (id: string) => {
        const next = new Set(chosen);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelected(next);
    };

    const selectVisible = (on: boolean) => {
        const next = new Set(chosen);
        visible.forEach(s => (on ? next.add(s.studentId) : next.delete(s.studentId)));
        setSelected(next);
    };

    const handleSave = async () => {
        try {
            await setStudents.mutateAsync({ sessionId: session.id, studentIds: [...chosen] });
            toast.success(`${session.name}: ${chosen.size} student${chosen.size === 1 ? '' : 's'}`);
            onClose();
        } catch {
            // The mutation already shows the error.
        }
    };

    const loading = studentsLoading || rosterLoading;

    return (
        <Dialog onClose={onClose} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 flex flex-col max-h-[85vh]">
            {titleId => (
                <>
                    <h2 id={titleId} className="text-xl font-bold dark:text-white">Students in {session.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {formatDateForDisplay(session.startDate)} – {formatDateForDisplay(session.endDate)} · {chosen.size} selected
                    </p>
                    <input type="search" placeholder="Search by name or student number" value={search}
                        onChange={e => setSearch(e.target.value)} className={`${inputClass} mb-2`} aria-label="Search students" />
                    <div className="flex gap-3 text-sm mb-2">
                        <button type="button" onClick={() => selectVisible(true)} className="text-brand hover:underline">Select all shown</button>
                        <button type="button" onClick={() => selectVisible(false)} className="text-slate-500 dark:text-slate-400 hover:underline">Clear shown</button>
                    </div>
                    <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-100 dark:divide-slate-700 min-h-[12rem]">
                        {loading ? (
                            <p className="p-4 text-center text-slate-500">Loading students…</p>
                        ) : visible.length === 0 ? (
                            <p className="p-4 text-center text-slate-500">{search ? 'No students match.' : 'No active students.'}</p>
                        ) : visible.map(s => (
                            <label key={s.studentId} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <input type="checkbox" checked={chosen.has(s.studentId)} onChange={() => toggle(s.studentId)}
                                    className="rounded border-slate-300 text-brand focus:ring-brand" />
                                <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">{s.last_name}, {s.first_name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {[s.latest_grade_level && `Gr ${s.latest_grade_level}`, s.latest_campus, s.latest_status !== 'Active' && s.latest_status].filter(Boolean).join(' · ')}
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className={cancelClass}>Cancel</button>
                        <button type="button" onClick={handleSave} disabled={loading || setStudents.isPending} className={saveClass}>Save roster</button>
                    </div>
                </>
            )}
        </Dialog>
    );
};

/** Summer sessions: optional school days between school years for the students on them. */
export const SummerSessionsSection: React.FC = () => {
    const { data: sessions = [], isLoading } = useSummerSessions();
    const deleteSession = useDeleteSummerSession();
    const [editing, setEditing] = useState<SummerSession | 'new' | null>(null);
    const [rosterFor, setRosterFor] = useState<SummerSession | null>(null);

    const handleDelete = async (session: SummerSession) => {
        const who = session.studentCount > 0 ? ` Its ${session.studentCount} student${session.studentCount === 1 ? '' : 's'} will be taken off it; attendance already recorded is kept.` : '';
        if (!confirm(`Delete ${session.name}?${who}`)) return;
        try {
            await deleteSession.mutateAsync(session.id);
            toast.success(`${session.name} deleted`);
        } catch {
            // The mutation already shows the error.
        }
    };

    return (
        <section className="space-y-3" aria-labelledby="summer-sessions-heading">
            <div className="flex justify-between items-end gap-4">
                <div>
                    <h2 id="summer-sessions-heading" className="text-xl font-bold text-slate-800 dark:text-white">Summer Sessions</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Students on a session are expected on its weekdays and those days count toward their placement.
                        Everyone else is on summer break, and their release dates move to the next school year.
                    </p>
                </div>
                <button type="button" onClick={() => setEditing('new')}
                    className="shrink-0 bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-md shadow-sm transition-colors">
                    Add Summer Session
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">First Day</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Day</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Students</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {isLoading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">Loading…</td></tr>
                        ) : sessions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                                    No summer sessions. Add one if the school runs summer classes.
                                </td>
                            </tr>
                        ) : sessions.map(session => (
                            <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{session.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{formatDateForDisplay(session.startDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{formatDateForDisplay(session.endDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <button type="button" onClick={() => setRosterFor(session)}
                                        className="text-brand hover:underline font-medium">
                                        {session.studentCount} student{session.studentCount === 1 ? '' : 's'} · Manage
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setEditing(session)} title="Edit" aria-label={`Edit ${session.name}`}
                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300">
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button type="button" onClick={() => handleDelete(session)} title="Delete" aria-label={`Delete ${session.name}`}
                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editing && <SessionDialog session={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
            {rosterFor && <RosterDialog session={rosterFor} onClose={() => setRosterFor(null)} />}
        </section>
    );
};
