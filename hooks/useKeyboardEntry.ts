import { useCallback, useEffect, useState } from 'react';
import { Presence } from '../types';

export const PRESENCE_KEYS: Record<string, Presence> = {
    p: Presence.Present,
    a: Presence.Absent,
    t: Presence.Tardy,
    e: Presence.Excused
};

interface Options {
    rowCount: number;
    /** Columns to move between with left/right; 1 for a single-day list. */
    colCount?: number;
    onMark: (row: number, col: number, presence: Presence) => void;
    onClear: (row: number, col: number) => void;
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max - 1));

/**
 * Keyboard entry for an attendance grid: arrows (or h/j/k/l) move, P/A/T/E
 * record a status and advance to the next student, Delete clears, Escape exits.
 *
 * Keys are ignored while typing in an input, textarea, select or editable
 * field, and when a modifier is held, so notes and shortcuts keep working.
 */
export const useKeyboardEntry = ({ rowCount, colCount = 1, onMark, onClear }: Options) => {
    const [position, setPosition] = useState<{ row: number; col: number } | null>(null);

    // Clamped on read, so a list that shrinks under the cursor never leaves it
    // pointing past the end.
    const current = position && rowCount > 0
        ? { row: clamp(position.row, rowCount), col: clamp(position.col, colCount) }
        : null;
    const active = position !== null;

    const start = useCallback((row = 0, col = 0) => setPosition({ row, col }), []);
    const stop = useCallback(() => setPosition(null), []);

    useEffect(() => {
        if (!active) return;

        const handler = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
            if (target?.isContentEditable) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            const key = event.key.toLowerCase();
            const move = (dRow: number, dCol: number) => {
                event.preventDefault();
                setPosition(p => p && {
                    row: clamp(p.row + dRow, rowCount),
                    col: clamp(p.col + dCol, colCount)
                });
            };

            if (event.key === 'Escape') { event.preventDefault(); setPosition(null); return; }
            if (event.key === 'ArrowDown' || key === 'j') return move(1, 0);
            if (event.key === 'ArrowUp' || key === 'k') return move(-1, 0);
            if (colCount > 1 && (event.key === 'ArrowRight' || key === 'l')) return move(0, 1);
            if (colCount > 1 && (event.key === 'ArrowLeft' || key === 'h')) return move(0, -1);

            if (!current) return;

            if (PRESENCE_KEYS[key]) {
                event.preventDefault();
                onMark(current.row, current.col, PRESENCE_KEYS[key]);
                // Advance so a run of keystrokes walks down the column.
                setPosition({ row: clamp(current.row + 1, rowCount), col: current.col });
                return;
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                onClear(current.row, current.col);
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [active, current?.row, current?.col, rowCount, colCount, onMark, onClear]); // eslint-disable-line react-hooks/exhaustive-deps

    return { active, row: current?.row ?? null, col: current?.col ?? null, start, stop };
};
