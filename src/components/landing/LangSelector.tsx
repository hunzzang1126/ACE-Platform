// ─────────────────────────────────────────────────
// LangSelector — Landing page language dropdown
// ─────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { useLandingI18n, LANG_OPTIONS } from './landingI18n';
import type { LandingLang } from './landingI18n';

export function LangSelector() {
    const { lang, setLang } = useLandingI18n();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const current = LANG_OPTIONS.find(o => o.code === lang);

    return (
        <div className="lang-selector" ref={ref}>
            <button
                className="lang-selector-btn"
                onClick={() => setOpen(!open)}
                aria-label="Select language"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
                </svg>
                <span>{current?.label ?? 'EN'}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {open && (
                <div className="lang-dropdown">
                    {LANG_OPTIONS.map(opt => (
                        <button
                            key={opt.code}
                            className={`lang-option ${opt.code === lang ? 'active' : ''}`}
                            onClick={() => { setLang(opt.code as LandingLang); setOpen(false); }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
