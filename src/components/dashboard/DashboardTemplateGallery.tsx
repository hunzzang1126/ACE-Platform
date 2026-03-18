// ─────────────────────────────────────────────────
// DashboardTemplateGallery — Full-width template grid
// ─────────────────────────────────────────────────
// Shows all templates (built-in + user-saved) in dashboard.
// Filter by category, search, sort, one-click apply.
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateStore, type TemplateCategory } from '@/stores/templateStore';
import { useDesignStore } from '@/stores/designStore';
import { BANNER_PRESETS } from '@/schema/presets';

type SortBy = 'newest' | 'most-used' | 'name';
const CATEGORIES = ['all', 'display', 'social', 'email', 'video', 'custom'] as const;

export function DashboardTemplateGallery() {
    const navigate = useNavigate();
    const { templates, search, getByCategory, getFavorites, toggleFavorite, instantiate, deleteTemplate } = useTemplateStore();
    const createCreativeSet = useDesignStore(s => s.createCreativeSet);

    const [category, setCategory] = useState<string>('all');
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('newest');
    const [showFavs, setShowFavs] = useState(false);

    const filtered = useMemo(() => {
        let result = showFavs
            ? getFavorites()
            : query.trim()
                ? search(query)
                : category !== 'all'
                    ? getByCategory(category as TemplateCategory)
                    : templates;

        // Sort
        result = [...result].sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'most-used') return b.usageCount - a.usageCount;
            return a.name.localeCompare(b.name);
        });
        return result;
    }, [templates, category, query, sortBy, showFavs, getFavorites, search, getByCategory]);

    const handleUseTemplate = useCallback((id: string) => {
        const variant = instantiate(id);
        if (!variant) return;
        const tmpl = templates.find(t => t.id === id);
        const preset = BANNER_PRESETS.find(p => p.width === (tmpl?.width ?? 300) && p.height === (tmpl?.height ?? 250))
            ?? { id: `custom-${Date.now()}`, name: `${tmpl?.width ?? 300}x${tmpl?.height ?? 250}`, width: tmpl?.width ?? 300, height: tmpl?.height ?? 250, category: 'display' as const };

        const setId = createCreativeSet(tmpl?.name ?? 'From Template', preset);
        // projectStore sync happens automatically via DashboardPage useEffect
        navigate(`/editor/${setId}`);
    }, [instantiate, templates, createCreativeSet, navigate]);

    return (
        <div style={{ padding: '0 24px' }}>
            {/* Controls bar */}
            <div style={S.controls}>
                {/* Search */}
                <div style={S.searchWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        style={S.searchInput}
                        placeholder="Search templates..."
                        value={query}
                        onChange={e => { setQuery(e.target.value); setShowFavs(false); }}
                    />
                </div>
                {/* Sort */}
                <select style={S.select} value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
                    <option value="newest">Newest</option>
                    <option value="most-used">Most Used</option>
                    <option value="name">Name</option>
                </select>
            </div>

            {/* Category tabs */}
            <div style={S.tabs}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        style={{ ...S.tab, ...(category === cat && !showFavs ? S.tabActive : {}) }}
                        onClick={() => { setCategory(cat); setQuery(''); setShowFavs(false); }}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
                <button
                    style={{ ...S.tab, ...(showFavs ? S.tabActive : {}), marginLeft: 'auto' }}
                    onClick={() => { setShowFavs(!showFavs); setQuery(''); }}
                >
                    Favorites
                </button>
            </div>

            {/* Template grid */}
            {filtered.length === 0 ? (
                <div style={S.empty}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3">
                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                    <p style={{ color: '#64748b', fontSize: 13, margin: '12px 0 0' }}>
                        {query ? 'No templates match your search' : 'Generate your first design to start building your template library'}
                    </p>
                </div>
            ) : (
                <div style={S.grid}>
                    {filtered.map(t => (
                        <div key={t.id} style={S.card}>
                            {/* Thumbnail */}
                            <div style={{ ...S.thumb, backgroundColor: getTemplateBg(t) }}>
                                {t.thumbnailSrc ? (
                                    <img src={t.thumbnailSrc} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={S.thumbPlaceholder}>
                                        <span style={{ fontSize: 11, fontWeight: 600 }}>{t.width}x{t.height}</span>
                                        <span style={{ fontSize: 9, opacity: 0.5 }}>{t.category}</span>
                                    </div>
                                )}
                                {t.isBuiltIn && (
                                    <span style={S.builtInBadge}>Built-in</span>
                                )}
                            </div>
                            {/* Info */}
                            <div style={S.cardBody}>
                                <div style={S.cardName}>{t.name}</div>
                                <div style={S.cardMeta}>
                                    {t.width}x{t.height} · {t.usageCount} uses
                                    {t.tags.length > 0 && ` · ${t.tags.slice(0, 2).join(', ')}`}
                                </div>
                            </div>
                            {/* Actions */}
                            <div style={S.cardActions}>
                                <button style={S.favBtn} onClick={() => toggleFavorite(t.id)}>
                                    {t.isFavorite ? '★' : '☆'}
                                </button>
                                <button style={S.useBtn} onClick={() => handleUseTemplate(t.id)}>
                                    Use Template
                                </button>
                                {!t.isBuiltIn && (
                                    <button style={S.delBtn} onClick={() => deleteTemplate(t.id)}>x</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Helpers ──

function getTemplateBg(t: { variantSnapshot: string }): string {
    try {
        const v = JSON.parse(t.variantSnapshot);
        return v.backgroundColor ?? '#1a1f2e';
    } catch {
        return '#1a1f2e';
    }
}

// ── Styles ──

const S = {
    controls: {
        display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center',
    },
    searchWrap: {
        display: 'flex', alignItems: 'center', gap: 8, flex: 1,
        padding: '6px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
    },
    searchInput: {
        background: 'none', border: 'none', outline: 'none', color: '#e5e5e7',
        fontSize: 12, fontFamily: 'inherit', flex: 1,
    } as React.CSSProperties,
    select: {
        padding: '6px 10px', borderRadius: 8, fontSize: 11, color: '#ccc',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
    } as React.CSSProperties,
    tabs: {
        display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' as const,
    },
    tab: {
        padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' as const,
        background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#888',
    } as React.CSSProperties,
    tabActive: {
        borderColor: 'rgba(129,140,248,0.4)', color: '#818cf8',
        background: 'rgba(129,140,248,0.08)',
    },
    empty: {
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        justifyContent: 'center', padding: '60px 20px', textAlign: 'center' as const, color: '#555',
    },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16,
    },
    card: {
        borderRadius: 10, overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        transition: 'border-color 0.2s, transform 0.2s',
    },
    thumb: {
        width: '100%', height: 140, position: 'relative' as const,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    thumbPlaceholder: {
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        gap: 2, color: 'rgba(255,255,255,0.4)',
    },
    builtInBadge: {
        position: 'absolute' as const, top: 6, right: 6,
        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        color: '#818cf8', letterSpacing: '0.03em',
    },
    cardBody: {
        padding: '10px 12px 6px',
    },
    cardName: {
        fontSize: 13, fontWeight: 600, color: '#e5e5e7',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
    },
    cardMeta: {
        fontSize: 10, color: '#888', marginTop: 2,
    },
    cardActions: {
        display: 'flex', gap: 6, padding: '6px 12px 10px', alignItems: 'center',
    },
    favBtn: {
        background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer',
        fontSize: 16, padding: 0,
    } as React.CSSProperties,
    useBtn: {
        flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', fontSize: 11,
        fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        background: 'rgba(129,140,248,0.15)', color: '#818cf8',
    } as React.CSSProperties,
    delBtn: {
        background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4,
        color: '#666', cursor: 'pointer', fontSize: 10, padding: '2px 6px',
    } as React.CSSProperties,
};
