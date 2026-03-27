// ─────────────────────────────────────────────────
// autoDesignPanelStyles — Style constants for AutoDesignPanel
// ─────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
    panel: {
        background: '#f0f2f5', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
        fontSize: 12, color: '#c9d1d9', fontFamily: 'Inter, system-ui, sans-serif',
    },
    header: { display: 'flex', flexDirection: 'column', gap: 3 },
    titleRow: { display: 'flex', alignItems: 'center', gap: 8 },
    title: { fontWeight: 600, fontSize: 13, color: '#f0f6fc', letterSpacing: -0.2 },
    modeBadge: {
        fontSize: 10, fontWeight: 500, color: '#8b949e',
        background: '#e2e8f0', border: '1px solid #e2e8f0',
        borderRadius: 4, padding: '1px 6px',
    },
    subtitle: { color: '#6e7681', fontSize: 11 },
    dropZone: {
        border: '1px dashed', borderRadius: 7,
        padding: '12px 10px', minHeight: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.12s ease', userSelect: 'none',
    },
    dropContent: { display: 'flex', alignItems: 'center', gap: 8 },
    dropText: { fontSize: 11, color: '#6e7681' },
    thumbRow: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    thumb: { width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' },
    dropHintSmall: { fontSize: 10, color: '#6e7681' },
    inputWrapper: { position: 'relative' },
    textarea: {
        width: '100%', boxSizing: 'border-box',
        background: '#fafbfc', border: '1px solid',
        borderRadius: 7, padding: '8px 10px',
        color: '#e6edf3', fontSize: 12, lineHeight: 1.5,
        fontFamily: 'inherit', resize: 'none', outline: 'none',
        transition: 'border-color 0.12s ease',
    },
    inputHint: { fontSize: 10, color: '#94a3b8', marginTop: 3, textAlign: 'right' },
    examples: { display: 'flex', flexDirection: 'column', gap: 5 },
    examplesLabel: { fontSize: 10, color: '#6e7681', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.6 },
    examplesList: { display: 'flex', flexDirection: 'column', gap: 3 },
    exampleChip: {
        background: 'transparent', border: '1px solid #e2e8f0',
        borderRadius: 5, padding: '4px 8px',
        color: '#6e7681', fontSize: 10, textAlign: 'left',
        cursor: 'pointer', transition: 'all 0.1s ease', lineHeight: 1.4,
    },
    progressRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#0d1f38', border: '1px solid', borderRadius: 6, padding: '7px 10px',
    },
    progressText: { fontSize: 11, fontWeight: 500 },
    successBlock: {
        background: 'transparent', border: '1px solid #238636',
        borderRadius: 6, padding: '6px 10px',
        color: '#3fb950', fontSize: 11,
        display: 'flex', alignItems: 'center',
    },
    errorBlock: {
        background: 'transparent', border: '1px solid #f85149',
        borderRadius: 6, padding: '6px 10px',
        color: '#f85149', fontSize: 11,
    },
    btn: {
        background: '#238636',
        color: '#fff', border: 'none', borderRadius: 6,
        padding: '8px 14px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 6, justifyContent: 'center', width: '100%',
        transition: 'opacity 0.12s ease', letterSpacing: -0.1,
    },
    btnRunning: { background: 'transparent', color: '#f85149', border: '1px solid #e2e8f0' },
    spinner: {
        width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
        border: '1.5px solid rgba(120,192,255,0.2)', borderTopColor: '#79c0ff',
        animation: 'spin 0.7s linear infinite', display: 'inline-block',
    },
    hint: { color: '#94a3b8', fontSize: 10, textAlign: 'center' },
};
