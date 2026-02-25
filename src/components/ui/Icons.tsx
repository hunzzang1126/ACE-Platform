// ─────────────────────────────────────────────────
// Icons — Premium inline SVG icons (no emojis)
// ─────────────────────────────────────────────────

import type { CSSProperties } from 'react';

interface IconProps {
    size?: number;
    color?: string;
    style?: CSSProperties;
    className?: string;
}

const defaults = { size: 16, color: 'currentColor' };

// ── AI / Brain ──────────────────────────────────

export function IcAi({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
            <path d="M6 10a2 2 0 0 0-2 2v1a2 2 0 0 0 4 0v-1a2 2 0 0 0-2-2z" />
            <path d="M18 10a2 2 0 0 0-2 2v1a2 2 0 0 0 4 0v-1a2 2 0 0 0-2-2z" />
            <path d="M12 11v3" />
            <path d="M8 14l-2-1" />
            <path d="M16 14l2-1" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 18v4" />
        </svg>
    );
}

// ── Settings / Gear ─────────────────────────────

export function IcSettings({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

// ── Search ──────────────────────────────────────

export function IcSearch({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

// ── Export / Upload ─────────────────────────────

export function IcExport({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}

// ── Play / Pause / Stop ─────────────────────────

export function IcPlay({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
            <polygon points="5,3 19,12 5,21" />
        </svg>
    );
}

export function IcPause({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
            <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
    );
}

export function IcStop({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
            <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
    );
}

// ── Loop / Repeat ───────────────────────────────

export function IcLoop({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
    );
}

// ── Warning / Error ─────────────────────────────

export function IcWarning({ size = defaults.size, color = '#f59e0b', ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function IcError({ size = defaults.size, color = '#ef4444', ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}

// ── Bell / Notification ─────────────────────────

export function IcBell({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

// ── Image ───────────────────────────────────────

export function IcImage({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
        </svg>
    );
}

// ── Film / Video ────────────────────────────────

export function IcFilm({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" />
            <line x1="17" y1="17" x2="22" y2="17" />
        </svg>
    );
}

// ── Code / JSON ─────────────────────────────────

export function IcCode({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
    );
}

// ── Sparkle / Effect ────────────────────────────

export function IcSparkle({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
    );
}

// ── Bolt / Lightning ────────────────────────────

export function IcBolt({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
        </svg>
    );
}

// ── Align icons ─────────────────────────────────

export function IcAlignLeft({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" {...rest}>
            <line x1="3" y1="3" x2="3" y2="21" /><rect x="7" y="6" width="14" height="4" rx="1" /><rect x="7" y="14" width="10" height="4" rx="1" />
        </svg>
    );
}

export function IcAlignCenterH({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" {...rest}>
            <line x1="12" y1="2" x2="12" y2="22" /><rect x="4" y="6" width="16" height="4" rx="1" /><rect x="6" y="14" width="12" height="4" rx="1" />
        </svg>
    );
}

export function IcAlignRight({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" {...rest}>
            <line x1="21" y1="3" x2="21" y2="21" /><rect x="3" y="6" width="14" height="4" rx="1" /><rect x="7" y="14" width="10" height="4" rx="1" />
        </svg>
    );
}

export function IcAlignTop({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" {...rest}>
            <line x1="3" y1="3" x2="21" y2="3" /><rect x="6" y="7" width="4" height="14" rx="1" /><rect x="14" y="7" width="4" height="10" rx="1" />
        </svg>
    );
}

export function IcAlignCenterV({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" {...rest}>
            <line x1="2" y1="12" x2="22" y2="12" /><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="6" width="4" height="12" rx="1" />
        </svg>
    );
}

export function IcAlignBottom({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" {...rest}>
            <line x1="3" y1="21" x2="21" y2="21" /><rect x="6" y="3" width="4" height="14" rx="1" /><rect x="14" y="7" width="4" height="10" rx="1" />
        </svg>
    );
}

// ── Cursor / Select ─────────────────────────────

export function IcCursor({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
            <path d="M4 2l14 10-6 1.5L10 20z" />
        </svg>
    );
}

// ── Layout / Grid ───────────────────────────────

export function IcLayout({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
        </svg>
    );
}

// ── Close / X ───────────────────────────────────

export function IcClose({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

// ── Chevron / Toggle ────────────────────────────

export function IcChevronLeft({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

export function IcChevronRight({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

export function IcChevronDown({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

export function IcChevronUp({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <polyline points="18 15 12 9 6 15" />
        </svg>
    );
}

// ── Send / ArrowUp ──────────────────────────────

export function IcSend({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
        </svg>
    );
}

// ── Help / Question ─────────────────────────────

export function IcHelp({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

// ── Loader / Spinner ────────────────────────────

export function IcLoader({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }} {...rest}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}

// ── Folder ──────────────────────────────────────

export function IcFolder({ size = defaults.size, color = defaults.color, ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    );
}

// ── Check ───────────────────────────────────────

export function IcCheck({ size = defaults.size, color = '#22c55e', ...rest }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

// ── Type shortcuts ──────────────────────────────
// Map element types to icons

export function elementTypeIcon(type: string, size = 12, color = 'currentColor') {
    switch (type) {
        case 'text': return <span style={{ fontWeight: 700, fontSize: size, color }}>T</span>;
        case 'image': return <IcImage size={size} color={color} />;
        case 'shape': return <span style={{ fontSize: size, color }}>◆</span>;
        case 'button': return <span style={{ fontSize: size, color }}>▣</span>;
        default: return <IcLayout size={size} color={color} />;
    }
}
