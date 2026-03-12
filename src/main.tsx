import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';

// ★ Auto-reload on stale chunk error (happens after Vercel deploy).
// Vite changes JS filenames on each build. If the browser cached old HTML,
// dynamic import() will 404. We catch this and reload once.
window.addEventListener('error', (e) => {
    if (e.message?.includes('Failed to fetch dynamically imported module')) {
        const key = 'ace-chunk-reload';
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            window.location.reload();
        }
    }
});
window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message ?? String(e.reason ?? '');
    if (msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed')) {
        const key = 'ace-chunk-reload';
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            window.location.reload();
        }
    }
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
