// ─────────────────────────────────────────────────
// SidebarBrandTab Styles
// ─────────────────────────────────────────────────

import type React from 'react';

export const sidebarBrandStyles: Record<string, React.CSSProperties> = {
    root: { display: 'flex', flexDirection: 'column', gap: 0, height: '100%' },
    searchWrap: {
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '8px 12px', padding: '6px 10px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
    },
    searchInput: {
        flex: 1, background: 'none', border: 'none', outline: 'none',
        color: 'var(--text-primary, #e4e4e7)', fontSize: 12,
    },
    kitSelect: { margin: '0 12px', padding: '5px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 11 },
    navList: { display: 'flex', flexDirection: 'column', gap: 1, padding: '4px 8px' },
    navItem: {
        display: 'flex', alignItems: 'center', padding: '7px 12px',
        background: 'none', border: 'none', borderRadius: 6,
        color: 'var(--text-secondary, #a1a1aa)', fontSize: 12, cursor: 'pointer',
        textAlign: 'left' as const, transition: 'all 0.15s',
    },
    navItemActive: {
        background: 'rgba(129,140,248,0.12)', color: 'var(--text-primary, #e4e4e7)', fontWeight: 500,
    },
    divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 12px' },
    content: { flex: 1, padding: '8px 12px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column', gap: 8 },
    // Assets
    dropZone: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 8px', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.2s' },
    dropZoneActive: { borderColor: '#818cf8', background: 'rgba(129,140,248,0.05)' },
    dropText: { fontSize: 11, color: 'var(--text-secondary, #a1a1aa)' },
    dropHint: { fontSize: 10, color: 'var(--text-muted, #71717a)' },
    noItems: { fontSize: 11, color: 'var(--text-muted, #71717a)', textAlign: 'center', padding: 12 },
    assetGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
    assetCard: { position: 'relative' as const, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'border-color 0.15s' },
    assetImg: { width: '100%', height: 70, objectFit: 'cover' as const, display: 'block' },
    assetInfo: { padding: '4px 6px', display: 'flex', flexDirection: 'column' },
    assetName: { fontSize: 10, color: 'var(--text-primary, #e4e4e7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    assetMeta: { fontSize: 9, color: 'var(--text-muted, #71717a)' },
    assetDel: { position: 'absolute' as const, top: 4, right: 4, width: 18, height: 18, borderRadius: 9, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#999', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
    // Common
    sectionTitle: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #e4e4e7)', margin: '0 0 8px 0' },
    empty: { padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
    emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #e4e4e7)', margin: 0 },
    emptyDesc: { fontSize: 11, color: 'var(--text-muted, #71717a)', margin: 0, lineHeight: 1.4 },
    createBtn: { marginTop: 8, padding: '8px 20px', background: 'var(--accent, #818cf8)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    // Colors
    colorSection: { display: 'flex', flexDirection: 'column' },
    colorGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
    colorRow: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
    swatch: { width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', position: 'relative' as const, overflow: 'hidden', flexShrink: 0 },
    hiddenInput: { position: 'absolute' as const, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' },
    colorInfo: { display: 'flex', flexDirection: 'column' },
    colorLabel: { fontSize: 12, color: 'var(--text-primary, #e4e4e7)', textTransform: 'capitalize' as const },
    colorHex: { fontSize: 10, color: 'var(--text-muted, #71717a)', fontFamily: 'monospace' },
    // Fonts
    fontSection: { display: 'flex', flexDirection: 'column', gap: 12 },
    fontRow: { display: 'flex', flexDirection: 'column', gap: 4 },
    fontLabel: { fontSize: 11, color: 'var(--text-secondary, #a1a1aa)', textTransform: 'capitalize' as const, fontWeight: 500 },
    fontInput: { padding: '5px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 12 },
    fontPreview: { fontSize: 11, color: 'var(--text-muted, #71717a)', padding: '4px 0', fontStyle: 'italic' as const },
    // Guidelines
    guideSection: { display: 'flex', flexDirection: 'column', gap: 10 },
    guideRow: { display: 'flex', flexDirection: 'column', gap: 3 },
    guideLabel: { fontSize: 11, color: 'var(--text-secondary, #a1a1aa)', fontWeight: 500 },
    guideInput: { padding: '6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 12, width: '100%' },
    guideSelect: { padding: '6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 12, width: '100%' },
};
