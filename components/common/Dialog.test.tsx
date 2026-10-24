import { describe, it, expect, vi, beforeAll } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dialog } from './Dialog';

const Form: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
    <Dialog label="Edit thing" onClose={onClose}>
        <input aria-label="First" />
        <input aria-label="Second" />
        <button>Save</button>
    </Dialog>
);

// jsdom does no layout, so it cannot tell whether an element is visible.
beforeAll(() => {
    HTMLElement.prototype.checkVisibility = () => true;
});

describe('Dialog', () => {
    it('is announced as a modal dialog with a name', () => {
        render(<Form />);
        const dialog = screen.getByRole('dialog', { name: 'Edit thing' });
        expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('focuses the first field when it opens', () => {
        render(<Form />);
        expect(document.activeElement).toBe(screen.getByLabelText('First'));
    });

    it('keeps Tab inside the dialog', () => {
        render(<Form />);
        const save = screen.getByRole('button', { name: 'Save' });
        save.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(screen.getByLabelText('First'));

        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(save);
    });

    it('closes on Escape', () => {
        const onClose = vi.fn();
        render(<Form onClose={onClose} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stays open on Escape while closing is not allowed', () => {
        render(<Form onClose={undefined} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('returns focus to what was focused before it opened', () => {
        const Host = () => {
            const [open, setOpen] = useState(false);
            return (
                <>
                    <button onClick={() => setOpen(true)}>Open</button>
                    {open && <Form onClose={() => setOpen(false)} />}
                </>
            );
        };
        render(<Host />);
        const opener = screen.getByRole('button', { name: 'Open' });
        opener.focus();
        fireEvent.click(opener);
        expect(document.activeElement).toBe(screen.getByLabelText('First'));

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(document.activeElement).toBe(opener);
    });

    // Regression: the trap re-ran whenever the parent re-rendered with a new
    // inline onClose, pulling focus back to the first field mid-typing.
    it('does not move focus when the parent re-renders', () => {
        const Parent = () => {
            const [tick, setTick] = useState(0);
            return (
                <>
                    {/* fireEvent.click does not move focus, so it can re-render without disturbing it. */}
                    <button onClick={() => setTick(tick + 1)}>Re-render {tick}</button>
                    <Form onClose={() => undefined} />
                </>
            );
        };
        render(<Parent />);
        const second = screen.getByLabelText('Second');
        second.focus();

        act(() => { fireEvent.click(screen.getByRole('button', { name: /Re-render/ })); });
        expect(screen.getByRole('button', { name: 'Re-render 1' })).toBeTruthy();

        expect(document.activeElement).toBe(second);
    });
});
