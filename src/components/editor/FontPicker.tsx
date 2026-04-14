// ─────────────────────────────────────────────────
// FontPicker — Custom font dropdown with live font preview
// ─────────────────────────────────────────────────
// Each font name is rendered in its own typeface.
// Search/filter, keyboard navigation, grouped by category.
// ─────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { FONT_FAMILIES, ensureGoogleFont } from './contextToolbarConstants';
import './FontPicker.css';

interface Props {
    value: string;
    onChange: (fontFamily: string) => void;
}

/** Extract display name from "Inter, sans-serif" → "Inter" */
function displayName(full: string): string {
    return full.split(',')[0].trim();
}

/** Group fonts by category based on suffix */
function getCategory(full: string): string {
    if (full.includes('serif') && !full.includes('sans-serif')) return 'Serif';
    if (full.includes('monospace')) return 'Mono';
    return 'Sans-Serif';
}

// Pre-group fonts
const FONT_GROUPS = (() => {
    const groups: { label: string; fonts: string[] }[] = [];
    const map = new Map<string, string[]>();
    for (const f of FONT_FAMILIES) {
        const cat = getCategory(f);
        if (!map.has(cat)) { map.set(cat, []); groups.push({ label: cat, fonts: map.get(cat)! }); }
        map.get(cat)!.push(f);
    }
    return groups;
})();

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

    // Filter fonts
    const filteredFonts = search.trim()
        ? FONT_FAMILIES.filter(f => displayName(f).toLowerCase().includes(search.toLowerCase()))
        : null;

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
                {displayName(value)}
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
                            placeholder="Search fonts..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setHighlightIdx(0); }}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <div className="fp-list" ref={listRef}>
                        {filteredFonts ? (
                            // Filtered flat list
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
                                        {displayName(f)}
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
                                                {displayName(f)}
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
