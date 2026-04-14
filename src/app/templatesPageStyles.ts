// ─────────────────────────────────────────────────
// templatesPageStyles — CSS-in-JS for TemplatesPage
// ─────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export const S: Record<string, CSSProperties> = {
    layout: {
        display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden',
        background: '#0a0a0f', color: '#e4e4e7', fontFamily: 'Inter, system-ui, sans-serif',
    },
    main: {
        flex: 1, overflow: 'auto', padding: '32px 40px',
        display: 'flex', flexDirection: 'column', gap: 24,
    },
    header: {
        display: 'flex', flexDirection: 'column', gap: 4,
    },
    title: {
        fontSize: 24, fontWeight: 700, margin: 0, color: '#f5f5f7',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13, color: '#86868b', margin: 0, lineHeight: 1.5,
    },
    toolbar: {
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
    },
    search: {
        padding: '8px 14px', background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
        color: '#e4e4e7', fontSize: 13, outline: 'none', width: 260,
        fontFamily: 'Inter, system-ui, sans-serif',
    },
    pills: {
        display: 'flex', gap: 6,
    },
    pill: {
        padding: '6px 14px', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6, color: '#86868b', cursor: 'pointer',
        fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
    },
    pillActive: {
        borderColor: '#818cf8', color: '#a5b4fc',
        background: 'rgba(129,140,248,0.1)',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 20,
    },
    card: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden', transition: 'border-color 0.2s, transform 0.15s',
        cursor: 'default',
    },
    previewWrap: {
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12,
        background: 'rgba(255,255,255,0.02)',
        minHeight: 140,
    },
    editBtn: {
        position: 'absolute', top: 8, right: 8, zIndex: 5,
        width: 32, height: 32, borderRadius: 8,
        border: 'none', background: 'rgba(0,0,0,0.7)',
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0.7, transition: 'opacity 0.15s, background 0.15s',
        backdropFilter: 'blur(8px)',
    },
    cardInfo: {
        padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2,
        borderTop: '1px solid rgba(255,255,255,0.04)',
    },
    cardName: {
        fontSize: 13, fontWeight: 500, color: '#e4e4e7',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
    cardMeta: {
        fontSize: 11, color: '#86868b',
    },
    empty: {
        gridColumn: '1 / -1',
        textAlign: 'center', color: '#555', padding: '60px 20px',
        fontSize: 14, lineHeight: 1.6,
    },
    thumbPlaceholder: {
        width: 220, height: 160,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#555', fontSize: 16, fontWeight: 600,
        background: 'rgba(255,255,255,0.02)', borderRadius: 8,
    },
    addBtn: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', background: 'linear-gradient(135deg, #818cf8, #6366f1)',
        border: 'none', borderRadius: 8, color: '#fff',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'opacity 0.15s', whiteSpace: 'nowrap',
    },
    deleteBtn: {
        position: 'absolute', top: 8, left: 8, zIndex: 5,
        width: 32, height: 32, borderRadius: 8,
        border: 'none', background: 'rgba(239,68,68,0.8)',
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0.7, transition: 'opacity 0.15s',
        backdropFilter: 'blur(8px)',
    },
    createForm: {
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '12px 16px', marginTop: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
    },
    // Featured section
    featuredSection: {
        marginBottom: 8,
    },
    featuredTitle: {
        fontSize: 14, fontWeight: 600, color: '#a5b4fc', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
    },
    featuredGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
    },
    featuredCard: {
        background: 'linear-gradient(145deg, rgba(99,102,241,0.08), rgba(45,212,191,0.04))',
        borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)',
        overflow: 'hidden', transition: 'border-color 0.2s, transform 0.15s',
        cursor: 'default',
    },
    featuredBadge: {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 4,
        background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
        fontSize: 9, fontWeight: 700, color: '#fff',
        textTransform: 'uppercase' as const, letterSpacing: '0.05em',
    },
};
