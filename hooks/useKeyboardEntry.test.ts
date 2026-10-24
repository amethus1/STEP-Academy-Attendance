import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardEntry } from './useKeyboardEntry';
import { Presence } from '../types';

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
    act(() => {
        target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
    });
};

const setup = (rowCount = 3, colCount = 1) => {
    const onMark = vi.fn();
    const onClear = vi.fn();
    const hook = renderHook(props => useKeyboardEntry(props), {
        initialProps: { rowCount, colCount, onMark, onClear }
    });
    return { ...hook, onMark, onClear };
};

afterEach(() => { document.body.innerHTML = ''; });

describe('useKeyboardEntry', () => {
    it('does nothing until started', () => {
        const { result, onMark } = setup();
        press('p');
        expect(onMark).not.toHaveBeenCalled();
        expect(result.current.active).toBe(false);
    });

    it('marks the focused student and moves to the next one', () => {
        const { result, onMark } = setup();
        act(() => result.current.start());

        press('p');
        press('A');

        expect(onMark).toHaveBeenNthCalledWith(1, 0, 0, Presence.Present);
        expect(onMark).toHaveBeenNthCalledWith(2, 1, 0, Presence.Absent);
        expect(result.current.row).toBe(2);
    });

    it('moves with arrows and vim keys, without passing the ends', () => {
        const { result } = setup(3);
        act(() => result.current.start());
        press('ArrowUp');
        expect(result.current.row).toBe(0);
        press('j');
        press('ArrowDown');
        press('ArrowDown');
        expect(result.current.row).toBe(2);
        press('k');
        expect(result.current.row).toBe(1);
    });

    it('moves between days in a grid', () => {
        const { result, onMark } = setup(2, 5);
        act(() => result.current.start(0, 0));
        press('ArrowRight');
        press('l');
        press('h');
        expect(result.current.col).toBe(1);
        press('t');
        expect(onMark).toHaveBeenCalledWith(0, 1, Presence.Tardy);
        expect(result.current).toMatchObject({ row: 1, col: 1 });
    });

    it('ignores left and right in a single-column list', () => {
        const { result } = setup(3, 1);
        act(() => result.current.start());
        press('ArrowRight');
        expect(result.current.col).toBe(0);
    });

    it('clears with Delete and exits with Escape', () => {
        const { result, onClear } = setup();
        act(() => result.current.start());
        press('Delete');
        expect(onClear).toHaveBeenCalledWith(0, 0);
        press('Escape');
        expect(result.current.active).toBe(false);
    });

    it('never intercepts typing in a text field', () => {
        const { result, onMark } = setup();
        act(() => result.current.start());
        const input = document.createElement('input');
        document.body.appendChild(input);
        press('p', {}, input);
        press('ArrowDown', {}, input);
        expect(onMark).not.toHaveBeenCalled();
        expect(result.current.row).toBe(0);
    });

    it('leaves modifier shortcuts alone', () => {
        const { result, onMark } = setup();
        act(() => result.current.start());
        press('p', { ctrlKey: true });
        press('a', { metaKey: true });
        expect(onMark).not.toHaveBeenCalled();
    });

    it('keeps the cursor inside a list that shrinks', () => {
        const { result, rerender, onMark, onClear } = setup(5);
        act(() => result.current.start(4));
        rerender({ rowCount: 2, colCount: 1, onMark, onClear });
        expect(result.current.row).toBe(1);
    });
});
