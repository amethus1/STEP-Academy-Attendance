import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Traps keyboard focus inside the returned ref while `active` is true.
 * - Focuses the first focusable element when activated.
 * - Restores focus to the previously focused element when deactivated.
 * - Calls the optional onEscape callback when Escape is pressed.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
    const containerRef = useRef<T | null>(null);

    // Read through a ref so the effect depends only on `active`. Callers pass
    // inline callbacks; depending on them re-ran the effect on every parent
    // render, which moved focus back to the first field mid-typing.
    const onEscapeRef = useRef(onEscape);
    useEffect(() => {
        onEscapeRef.current = onEscape;
    });

    useEffect(() => {
        if (!active) return;

        const container = containerRef.current;
        if (!container) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        const focusables = (): HTMLElement[] => {
            const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
            const result: HTMLElement[] = [];
            nodes.forEach(el => {
                // checkVisibility (Chromium, WebKit 17.4+) understands CSS hiding
                // properly; offsetParent is the fallback for older WebKit.
                const visible = typeof el.checkVisibility === 'function'
                    ? el.checkVisibility()
                    : el.offsetParent !== null;
                if (!el.hasAttribute('aria-hidden') && visible) {
                    result.push(el);
                }
            });
            return result;
        };

        // Prefer an element the dialog marked for initial focus.
        const preferred = container.querySelector<HTMLElement>('[data-autofocus]');
        (preferred ?? focusables()[0] ?? container).focus();

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onEscapeRef.current) {
                e.stopPropagation();
                onEscapeRef.current();
                return;
            }
            if (e.key !== 'Tab') return;

            const items = focusables();
            if (items.length === 0) {
                e.preventDefault();
                return;
            }
            const firstEl = items[0];
            const lastEl = items[items.length - 1];
            const activeEl = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (activeEl === firstEl || !container.contains(activeEl)) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (activeEl === lastEl || !container.contains(activeEl)) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('keydown', handleKey);
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, [active]);

    return containerRef;
}
