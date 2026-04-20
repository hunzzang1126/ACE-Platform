// ─────────────────────────────────────────────────
// liveSizePreviewStyles — Styles for LiveSizePreview
// ─────────────────────────────────────────────────
// Glassmorphism panel on the right side of the editor.
// ─────────────────────────────────────────────────

import type { CSSProperties } from 'react';

const PANEL_WIDTH = 210;

export const LIVE_PREVIEW_STYLES = {
    panel: {
        width: PANEL_WIDTH,
        minWidth: PANEL_WIDTH,
        maxWidth: PANEL_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(15, 18, 30, 0.85)',
        backdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(99, 102, 241, 0.12)',
        overflow: 'hidden',
        transition: 'width 0.3s ease, min-width 0.3s ease',
    } as CSSProperties,

    panelCollapsed: {
        width: 36,
        minWidth: 36,
        maxWidth: 36,
    } as CSSProperties,

    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'transparent',
        color: '#e2e8f0',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'inherit',
        width: '100%',
        textAlign: 'left' as const,
        transition: 'background 0.15s',
    } as CSSProperties,

    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
    } as CSSProperties,

    chevron: {
        display: 'flex',
        alignItems: 'center',
        transition: 'transform 0.2s ease',
        opacity: 0.5,
        flexShrink: 0,
    } as CSSProperties,

    cardList: {
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    } as CSSProperties,

    card: {
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 8,
        padding: 8,
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'default',
    } as CSSProperties,

    cardLabel: {
        fontSize: 10,
        fontWeight: 600,
        color: '#94a3b8',
        marginBottom: 6,
        letterSpacing: '0.02em',
    } as CSSProperties,

    cardPreview: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        overflow: 'hidden',
        background: '#0d1117',
    } as CSSProperties,

    overflow: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: 11,
        fontWeight: 500,
        padding: '8px 0',
    } as CSSProperties,
} as const;
