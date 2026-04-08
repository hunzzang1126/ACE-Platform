import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';

// ★ Force-preload template fonts at startup.
// Google Fonts display=swap only downloads font files when a DOM element uses the font.
// document.fonts.load() forces the browser to download the font file immediately,
// so it's cached in memory by the time the user opens the editor.
const PRELOAD_FONTS = [
    'Anton', 'Bebas Neue', 'Oswald', 'Poppins', 'Montserrat', 'Inter',
    'Playfair Display', 'Roboto', 'Outfit', 'DM Sans', 'Lato', 'Open Sans',
    'Raleway', 'Space Grotesk', 'Plus Jakarta Sans', 'Nunito', 'Work Sans',
];
if (typeof document !== 'undefined' && document.fonts) {
    for (const f of PRELOAD_FONTS) {
        document.fonts.load(`400 16px "${f}"`).catch(() => {});
        document.fonts.load(`700 16px "${f}"`).catch(() => {});
    }
}

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
