// ─────────────────────────────────────────────────
// PropertyFields — Reusable input components for PropertyPanel
// Section, ScrubField, PropField, OpacitySlider
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';

// ── Section wrapper ──

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="pp-section">
            <div className="pp-section-label">{label}</div>
            {children}
        </div>
    );
}

// ── Scrub Field: drag the label horizontally to adjust value ──

export function ScrubField({ label, value, min, max, step = 1, unit, onChange }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (v: number) => void;
}) {
    const isDecimal = step < 1;
    const fmt = (v: number) => isDecimal ? v.toFixed(1) : String(Math.round(v));

    const [localVal, setLocalVal] = useState(fmt(value));
    const [isFocused, setIsFocused] = useState(false);
    const scrubbing = useRef(false);
    const scrubStartX = useRef(0);
    const scrubStartVal = useRef(0);

    // Sync external value when not editing
    useEffect(() => {
        if (!isFocused && !scrubbing.current) setLocalVal(fmt(value));
    }, [value, isFocused]);

    // Commit typed value
    const handleCommit = useCallback(() => {
        setIsFocused(false);
        const parsed = parseFloat(localVal);
        if (!isNaN(parsed) && parsed >= min && parsed <= max) onChange(parsed);
        else setLocalVal(fmt(value));
    }, [localVal, onChange, value, min, max]);

    // ── Scrub handlers ──
    const handleScrubStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        scrubbing.current = true;
        scrubStartX.current = e.clientX;
        scrubStartVal.current = value;

        const handleMove = (ev: MouseEvent) => {
            if (!scrubbing.current) return;
            const dx = ev.clientX - scrubStartX.current;
            const raw = scrubStartVal.current + dx * step;
            const snapped = Math.round(raw / step) * step;
            const newVal = Math.min(max, Math.max(min, snapped));
            setLocalVal(fmt(newVal));
            onChange(newVal);
        };

        const handleUp = () => {
            scrubbing.current = false;
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    }, [value, min, max, step, onChange]);

    return (
        <div className="pp-scrub-row">
            <label
                className="pp-scrub-label"
                onMouseDown={handleScrubStart}
                title="Drag left/right to adjust"
            >
                {label}
            </label>
            <input
                className="pp-input pp-font-size-input"
                type="number"
                min={min}
                max={max}
                step={step}
                value={localVal}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed) && parsed >= min && parsed <= max) onChange(parsed);
                }}
                onBlur={handleCommit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommit();
                    e.stopPropagation();
                }}
            />
            {unit && <span className="pp-unit">{unit}</span>}
        </div>
    );
}

// ── Integer Property Field (for engine shapes) ──

export function PropField({ label, value, onChange }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
}) {
    const [localVal, setLocalVal] = useState(String(Math.round(value)));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) setLocalVal(String(Math.round(value)));
    }, [value, isFocused]);

    const handleCommit = useCallback(() => {
        setIsFocused(false);
        const parsed = parseInt(localVal);
        if (!isNaN(parsed)) onChange(parsed);
        else setLocalVal(String(Math.round(value)));
    }, [localVal, onChange, value]);

    return (
        <div className="pp-field">
            <label className="pp-label">{label}</label>
            <input
                className="pp-input"
                type="number"
                value={localVal}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    const parsed = parseInt(e.target.value);
                    if (!isNaN(parsed)) onChange(parsed);
                }}
                onBlur={handleCommit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommit();
                    e.stopPropagation();
                }}
            />
        </div>
    );
}

// ── Opacity Slider ──

export function OpacitySlider({ value, onChange }: {
    value: number;
    onChange: (v: number) => void;
}) {
    const pct = Math.round(value * 100);
    return (
        <div className="pp-slider-row">
            <input
                className="pp-slider"
                type="range"
                min={0} max={100}
                value={pct}
                onChange={(e) => onChange(parseInt(e.target.value) / 100)}
            />
            <span className="pp-slider-value">{pct} %</span>
        </div>
    );
}
