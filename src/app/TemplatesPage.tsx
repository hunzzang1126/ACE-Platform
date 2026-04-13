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
import { TemplatePreview } from './TemplatePreviewCard';
import type { BannerVariant, BannerPreset } from '@/schema/design.types';
import { useAppI18n } from '@/i18n';

const CATEGORIES = ['all', 'display', 'social', 'email', 'video'] as const;

export function TemplatesPage() {
    const navigate = useNavigate();
    const { templates, search, getByCategory, instantiate } = useTemplateStore();
    const setEditingTemplateId = useTemplateStore(s => s.setEditingTemplateId);
    const addCustomTemplate = useTemplateStore(s => s.addCustomTemplate);
    const deleteCustomTemplate = useTemplateStore(s => s.deleteCustomTemplate);
    const isAdmin = useAuthStore(s => s.isAdmin);
    const createCreativeSet = useDesignStore(s => s.createCreativeSet);

    const [category, setCategory] = useState<string>('all');
    const [query, setQuery] = useState('');
    const { t } = useAppI18n();

    const CATEGORY_LABELS: Record<string, string> = {
        all: t('templates.all'), display: t('templates.display'),
        social: t('templates.social'), email: t('templates.email'),
        video: t('templates.video'),
    };

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

        // ★ ARCHITECTURAL FIX: Do NOT call createCreativeSet().
        // createCreativeSet() persists to allCreativeSets (IndexedDB), causing
        // phantom CSs in the dashboard. Template editing should be IN-MEMORY ONLY.
        // We construct a temp CS and set it directly on designStore.creativeSet
        // WITHOUT touching allCreativeSets.
        const tempCsId = `tmpl-temp-${tmpl.id}-${Date.now()}`;
        const tempVariantId = `tmpl-var-${tmpl.id}-${Date.now()}`;
        const now = new Date().toISOString();

        const preset: BannerPreset = {
            id: `tmpl-preset-${tmpl.id}`,
            name: `${tmpl.width}x${tmpl.height}`,
            width: tmpl.width,
            height: tmpl.height,
            category: 'display',
        };

        const tempVariant: BannerVariant = {
            id: tempVariantId,
            preset,
            elements: variant.elements ?? [],
            backgroundColor: variant.backgroundColor || '#ffffff',
            overriddenElementIds: [],
            syncLocked: false,
        };

        const tempCS = {
            id: tempCsId,
            name: `[Template] ${tmpl.name}`,
            masterVariantId: tempVariantId,
            variants: [tempVariant],
            plugConnections: {},
            brand: { primaryColor: '#000000', secondaryColor: '#FFFFFF', fontFamily: 'Inter' },
            createdAt: now,
            updatedAt: now,
        };

        // Set ONLY creativeSet — NOT allCreativeSets. In-memory only.
        useDesignStore.setState({
            creativeSet: tempCS as any,
            activeCreativeSetId: tempCsId,
        });

        // Set editing flags so save knows to update the template
        setEditingTemplateId(tmpl.id);
        // No editingTempCsId needed — there's nothing to clean up

        // Navigate to the canvas editor
        navigate(`/editor/detail/${tempVariantId}`);
    }, [setEditingTemplateId, navigate]);

    // ★ Admin: create new blank template
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState<TemplateCategory>('social');

    const handleCreate = useCallback(() => {
        const name = newName.trim() || 'New Template';
        // Create an empty variant
        const emptyVariant: BannerVariant = {
            id: `empty-${Date.now()}`,
            preset: { id: 'custom-1080', name: '1080x1080', width: 1080, height: 1080, category: 'social' as const },
            elements: [],
            backgroundColor: '#0f172a',
            overriddenElementIds: [],
            syncLocked: false,
        };
        const newId = addCustomTemplate({ name, category: newCategory, variant: emptyVariant });
        setShowCreateForm(false);
        setNewName('');
        // Open in editor immediately
        const tmpl = useTemplateStore.getState().getById(newId);
        if (tmpl) handleEdit(tmpl);
    }, [newName, newCategory, addCustomTemplate, handleEdit]);

    const handleDelete = useCallback((t: DesignTemplate) => {
        if (!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
        deleteCustomTemplate(t.id);
    }, [deleteCustomTemplate]);

    const adminMode = isAdmin();

    return (
        <div style={S.layout}>
            <AppSidebar />
            <div style={S.main}>
                {/* Header */}
                <div style={S.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={S.title}>{t('templates.title')}</h1>
                            <p style={S.subtitle}>
                                {t('templates.subtitle')}
                                {adminMode && t('templates.subtitleAdmin')}
                            </p>
                        </div>
                        {adminMode && (
                            <button
                                onClick={() => setShowCreateForm(v => !v)}
                                style={S.addBtn}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                {t('templates.addTemplate')}
                            </button>
                        )}
                    </div>
                    {/* Admin: inline create form */}
                    {adminMode && showCreateForm && (
                        <div style={S.createForm}>
                            <input
                                style={S.search}
                                placeholder={t('templates.templateName')}
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            />
                            <select
                                style={{ ...S.search, width: 120 }}
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value as TemplateCategory)}
                            >
                                <option value="display">Display</option>
                                <option value="social">Social</option>
                                <option value="email">Email</option>
                                <option value="video">Video</option>
                            </select>
                            <span style={{ fontSize: 11, color: '#86868b' }}>1080 x 1080</span>
                            <button onClick={handleCreate} style={S.addBtn}>{t('templates.create')}</button>
                            <button onClick={() => setShowCreateForm(false)} style={{ ...S.pill, cursor: 'pointer' }}>{t('templates.cancel')}</button>
                        </div>
                    )}
                </div>

                {/* Search + Filters */}
                <div style={S.toolbar}>
                    <input
                        style={S.search}
                        type="text"
                        placeholder={t('templates.searchPlaceholder')}
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
                                {CATEGORY_LABELS[cat] || cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template Grid */}
                <div style={S.grid}>
                    {filtered.length === 0 && (
                        <div style={S.empty}>
                            {t('templates.noFound')}
                        </div>
                    )}
                    {filtered.map(tmpl => (
                        <div key={tmpl.id} style={S.card}>
                            <div style={S.previewWrap}>
                                <TemplatePreview template={tmpl} />
                                {/* Admin edit button */}
                                {adminMode && (
                                    <button
                                        onClick={() => handleEdit(tmpl)}
                                        title={t('templates.editTemplate')}
                                        style={S.editBtn}
                                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                        </svg>
                                    </button>
                                )}
                                {/* Admin delete button */}
                                {adminMode && (
                                    <button
                                        onClick={() => handleDelete(tmpl)}
                                        title={t('templates.deleteTemplate')}
                                        style={S.deleteBtn}
                                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div style={S.cardInfo}>
                                <span style={S.cardName}>{tmpl.name}</span>
                                <span style={S.cardMeta}>
                                    {tmpl.width} x {tmpl.height}
                                    {!tmpl.isBuiltIn && ` · ${t('templates.custom')}`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


// TemplatePreview extracted to TemplatePreviewCard.tsx

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
};
