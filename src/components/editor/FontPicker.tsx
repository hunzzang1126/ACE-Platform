// ─────────────────────────────────────────────────
// FontPicker — Custom font dropdown with live font preview
// ─────────────────────────────────────────────────
// Each font name is rendered in its own typeface.
// Search/filter, keyboard navigation, grouped by category.
// ─────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { FONT_FAMILIES, FONT_FAMILIES_BY_CATEGORY, ensureGoogleFont } from './contextToolbarConstants';
import { hasMoodKeywords, matchFontsFromText } from '@/ai/fontMatcher';
import './FontPicker.css';

interface Props {
    value: string;
    onChange: (fontFamily: string) => void;
}

// Pre-group fonts using centralized categories
const FONT_GROUPS = Object.entries(FONT_FAMILIES_BY_CATEGORY).map(
    ([label, fonts]) => ({ label, fonts })
);

export function FontPicker({ value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Focus search on open
    useEffect(() => {
        if (open) { inputRef.current?.focus(); setSearch(''); setHighlightIdx(-1); }
    }, [open]);

    // Filter fonts — mood keywords trigger AI matching, otherwise name search
    const filteredFonts = (() => {
        const q = search.trim();
        if (!q) return null;
        if (hasMoodKeywords(q)) {
            // Mood search: "luxury" → AI-ranked fonts
            return matchFontsFromText(q, 15);
        }
        // Name search: "Inter" → font name filter
        return FONT_FAMILIES.filter(f => f.toLowerCase().includes(q.toLowerCase()));
    })();

    const isMoodSearch = search.trim() ? hasMoodKeywords(search.trim()) : false;

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const list = filteredFonts ?? FONT_FAMILIES;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, list.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter' && highlightIdx >= 0 && highlightIdx < list.length) {
            e.preventDefault();
            const font = list[highlightIdx];
            ensureGoogleFont(font);
            onChange(font);
            setOpen(false);
        }
        else if (e.key === 'Escape') { setOpen(false); }
    }, [filteredFonts, highlightIdx, onChange]);

    // Scroll highlighted into view
    useEffect(() => {
        if (highlightIdx < 0 || !listRef.current) return;
        const el = listRef.current.children[highlightIdx] as HTMLElement;
        el?.scrollIntoView({ block: 'nearest' });
    }, [highlightIdx]);

    const handleSelect = (font: string) => {
        ensureGoogleFont(font);
        onChange(font);
        setOpen(false);
    };

    return (
        <div className="fp-root" ref={containerRef}>
            {/* Trigger button */}
            <button
                className="ctx-select ctx-font-select fp-trigger"
                onClick={() => setOpen(!open)}
                style={{ fontFamily: value }}
            >
                {value}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, opacity: 0.4, flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="fp-dropdown">
                    <div className="fp-search-wrap">
                        <input
                            ref={inputRef}
                            className="fp-search"
                            type="text"
                            placeholder="Search fonts or moods (luxury, modern...)"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setHighlightIdx(0); }}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <div className="fp-list" ref={listRef}>
                        {filteredFonts ? (
                            isMoodSearch && <div className="fp-group-label" style={{ color: '#2DD4BF' }}>AI Match</div>,
                            filteredFonts.length === 0
                                ? <div className="fp-empty">No fonts found</div>
                                : filteredFonts.map((f, i) => (
                                    <button
                                        key={f}
                                        className={`fp-item ${f === value ? 'selected' : ''} ${i === highlightIdx ? 'highlighted' : ''}`}
                                        style={{ fontFamily: f }}
                                        onClick={() => handleSelect(f)}
                                        onMouseEnter={() => setHighlightIdx(i)}
                                    >
                                        {f}
                                        {f === value && <span className="fp-check">&#10003;</span>}
                                    </button>
                                ))
                        ) : (
                            // Grouped list
                            FONT_GROUPS.map(group => (
                                <div key={group.label}>
                                    <div className="fp-group-label">{group.label}</div>
                                    {group.fonts.map(f => {
                                        const globalIdx = FONT_FAMILIES.indexOf(f);
                                        return (
                                            <button
                                                key={f}
                                                className={`fp-item ${f === value ? 'selected' : ''} ${globalIdx === highlightIdx ? 'highlighted' : ''}`}
                                                style={{ fontFamily: f }}
                                                onClick={() => handleSelect(f)}
                                                onMouseEnter={() => setHighlightIdx(globalIdx)}
                                            >
                                                {f}
                                                {f === value && <span className="fp-check">&#10003;</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
