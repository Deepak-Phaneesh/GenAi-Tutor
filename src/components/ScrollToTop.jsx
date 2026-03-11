import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 * Resets the scroll position of the main-content container on every route change.
 * Must be rendered inside the <BrowserRouter> context.
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Target the main scrollable container (overrides window-based scroll)
        const mainEl = document.querySelector('.main-content');
        if (mainEl) {
            mainEl.scrollTop = 0;
        } else {
            // Fallback for non-layout pages (login, landing, etc.)
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
    }, [pathname]);

    return null;
}
