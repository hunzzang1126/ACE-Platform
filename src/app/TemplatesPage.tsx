// ─────────────────────────────────────────────────
// TemplatesPage — Dashboard-level template management
// ─────────────────────────────────────────────────
// All users: browse + search + filter templates
// Admin only: edit pencil icon → opens canvas editor for template
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateStore, type TemplateCategory, type DesignTemplate } from '@/stores/templateStore';
import { useDesignStore } from '@/stores/designStore';
import { useAuthStore } from '@/stores/authStore';
import { AppSidebar } from '@/components/layout/AppSidebar';
import type { BannerVariant, BannerPreset } from '@/schema/design.types';

const CATEGORIES = ['all', 'display', 'social', 'email', 'video'] as const;

export function TemplatesPage() {
    const navigate = useNavigate();
    const { templates, search, getByCategory, instantiate } = useTemplateStore();
    const setEditingTemplateId = useTemplateStore(s => s.setEditingTemplateId);
    const isAdmin = useAuthStore(s => s.isAdmin);
    const createCreativeSet = useDesignStore(s => s.createCreativeSet);

    const [category, setCategory] = useState<string>('all');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        if (query.trim()) return search(query);
        if (category !== 'all') return getByCategory(category as TemplateCategory);
        return templates;
    }, [templates, category, query, search, getByCategory]);

    // ★ Admin: click edit → create temp creative set from template → open editor
    const handleEdit = useCallback((tmpl: DesignTemplate) => {
        let variant: BannerVariant;
        try {
            variant = JSON.parse(tmpl.variantSnapshot);
        } catch {
            console.error('[TemplatesPage] Failed to parse template variant');
            return;
        }

        // Create a temporary creative set from the template
        const preset: BannerPreset = {
            id: `tmpl-preset-${tmpl.id}`,
            name: `${tmpl.width}x${tmpl.height}`,
            width: tmpl.width,
            height: tmpl.height,
            category: 'display',
        };
        const csId = createCreativeSet(`[Template] ${tmpl.name}`, preset);
        const cs = useDesignStore.getState().creativeSet;
        if (!cs || cs.variants.length === 0) return;

        const targetVariantId = cs.variants[0]!.id;

        // Copy template elements into the variant
        useDesignStore.setState(state => {
            const v = state.creativeSet?.variants.find(v => v.id === targetVariantId);
            if (v) {
                v.elements = variant.elements ?? [];
                v.backgroundColor = variant.backgroundColor || '#ffffff';
            }
        });

        // Set editing flags so save knows to update the template and clean up
        setEditingTemplateId(tmpl.id);
        useTemplateStore.getState().setEditingTempCsId(csId);

        // Navigate to the canvas editor
        navigate(`/editor/detail/${targetVariantId}`);
    }, [createCreativeSet, setEditingTemplateId, navigate]);

    const adminMode = isAdmin();

    return (
        <div style={S.layout}>
            <AppSidebar />
            <div style={S.main}>
                {/* Header */}
                <div style={S.header}>
                    <h1 style={S.title}>Templates</h1>
                    <p style={S.subtitle}>
                        Browse and apply design templates to your projects.
                        {adminMode && ' As an admin, you can edit templates directly.'}
                    </p>
                </div>

                {/* Search + Filters */}
                <div style={S.toolbar}>
                    <input
                        style={S.search}
                        type="text"
                        placeholder="Search templates..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <div style={S.pills}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                style={{
                                    ...S.pill,
                                    ...(category === cat ? S.pillActive : {}),
                                }}
                                onClick={() => { setCategory(cat); setQuery(''); }}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template Grid */}
                <div style={S.grid}>
                    {filtered.length === 0 && (
                        <div style={S.empty}>
                            No templates found.
                        </div>
                    )}
                    {filtered.map(t => (
                        <div key={t.id} style={S.card}>
                            <div style={S.previewWrap}>
                                <TemplatePreview template={t} />
                                {/* Admin edit button */}
                                {adminMode && (
                                    <button
                                        onClick={() => handleEdit(t)}
                                        title="Edit template (Admin)"
                                        style={S.editBtn}
                                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div style={S.cardInfo}>
                                <span style={S.cardName}>{t.name}</span>
                                <span style={S.cardMeta}>{t.width} x {t.height}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// CSS-based template preview (shared with SidebarTemplateTab)
// ═══════════════════════════════════════════════════

function TemplatePreview({ template }: { template: DesignTemplate }) {
    let variant: BannerVariant | null = null;
    try {
        variant = JSON.parse(template.variantSnapshot);
    } catch { /* noop */ }

    if (!variant) {
        return (
            <div style={S.thumbPlaceholder}>
                {template.width} x {template.height}
            </div>
        );
    }

    const tw = template.width;
    const th = template.height;
    const previewW = 220;
    const scale = previewW / tw;
    const previewH = th * scale;

    return (
        <div style={{ width: previewW, height: previewH, position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
            <div style={{
                width: tw, height: th,
                position: 'absolute', left: 0, top: 0,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                backgroundColor: variant.backgroundColor || '#f0f0f0',
            }}>
                {variant.elements.map((el) => {
                    const x = el.constraints?.horizontal?.offset ?? 0;
                    const y = el.constraints?.vertical?.offset ?? 0;
                    const w = el.constraints?.size?.width ?? 0;
                    const h = el.constraints?.size?.height ?? 0;

                    const baseStyle: React.CSSProperties = {
                        position: 'absolute', left: x, top: y, width: w, height: h,
                        opacity: el.opacity ?? 1, zIndex: el.zIndex ?? 0,
                        overflow: 'hidden', pointerEvents: 'none',
                    };

                    if (el.type === 'shape') {
                        const bg = el.gradientStart && el.gradientEnd
                            ? `linear-gradient(${el.gradientAngle ?? 0}deg, ${el.gradientStart}, ${el.gradientEnd})`
                            : el.fill;
                        return <div key={el.id} style={{ ...baseStyle, background: bg, borderRadius: el.borderRadius ?? 0 }} />;
                    }

                    if (el.type === 'text') {
                        return (
                            <div key={el.id} style={{
                                ...baseStyle,
                                color: el.color, fontSize: el.fontSize,
                                fontWeight: el.fontWeight,
                                fontFamily: el.fontFamily || 'Inter, sans-serif',
                                textAlign: (el.textAlign as React.CSSProperties['textAlign']) || 'left',
                                lineHeight: el.lineHeight || 1.2,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>
                                {el.content}
                            </div>
                        );
                    }

                    if (el.type === 'button') {
                        return (
                            <div key={el.id} style={{
                                ...baseStyle,
                                backgroundColor: el.backgroundColor, color: el.color,
                                fontSize: el.fontSize, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: el.borderRadius ?? 6,
                            }}>
                                {el.label}
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════

const S: Record<string, React.CSSProperties> = {
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
};
