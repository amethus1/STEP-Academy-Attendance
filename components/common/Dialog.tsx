import React, { useId } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface DialogProps {
    /**
     * Called on Escape. Omit while closing would lose work in progress (for
     * example during an import); the dialog then stays open on Escape.
     */
    onClose?: () => void;
    /** Accessible name. Use when there is no visible heading to point at. */
    label?: string;
    /** Render-prop id for the visible heading, which becomes the accessible name. */
    children: React.ReactNode | ((titleId: string) => React.ReactNode);
    /** Classes for the dialog panel (size, background, padding). */
    className?: string;
    /** Stacking for dialogs opened on top of another dialog. */
    zIndexClass?: string;
    /** Set false while a nested dialog is open, so focus belongs to that one. */
    active?: boolean;
}

/**
 * Modal dialog: dimmed overlay, focus kept inside while open, Escape to close,
 * focus returned to where it was afterwards, and announced to screen readers
 * as a modal dialog.
 */
export const Dialog: React.FC<DialogProps> = ({
    onClose,
    label,
    children,
    className = 'bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md',
    zIndexClass = 'z-50',
    active = true
}) => {
    const titleId = useId();
    const ref = useFocusTrap<HTMLDivElement>(active, onClose);
    const content = typeof children === 'function' ? children(titleId) : children;

    return (
        <div className={`fixed inset-0 bg-black/50 ${zIndexClass} flex justify-center items-center p-4`} role="presentation">
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                aria-labelledby={label ? undefined : titleId}
                tabIndex={-1}
                className={`${className} focus:outline-none`}
            >
                {content}
            </div>
        </div>
    );
};
