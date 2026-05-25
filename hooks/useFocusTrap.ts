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
 * - Closes via Escape by calling the optional onEscape callback.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
    const containerRef = useRef<T | null>(null);

    useEffect(() => {
        if (!active) return;

        const container = containerRef.current;
        if (!container) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        const focusables = (): HTMLElement[] => {
            const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
            const result: HTMLElement[] = [];
            nodes.forEach(el => {
                if (!el.hasAttribute('aria-hidden') && el.offsetParent !== null) {
                    result.push(el);
                }
            });
            return result;
        };

        const first = focusables()[0];
        first?.focus();

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onEscape) {
                e.stopPropagation();
                onEscape();
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
                if (activeEl === lastEl) {
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
    }, [active, onEscape]);

    return containerRef;
}
