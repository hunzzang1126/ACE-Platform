// ─────────────────────────────────────────────────
// TemplateGallery — Browse + use design templates
// ─────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useTemplateStore, type TemplateCategory } from '@/stores/templateStore';

interface Props {
    onApply?: (variantData: any) => void;
    onClose?: () => void;
}

const CATEGORIES = ['all', 'display', 'social', 'email', 'video', 'custom'] as const;

export function TemplateGallery({ onApply, onClose }: Props) {
    const { templates, search, getByCategory, getFavorites, toggleFavorite, instantiate, deleteTemplate } = useTemplateStore();
    const [category, setCategory] = useState<string>('all');
    const [query, setQuery] = useState('');
    const [showFavs, setShowFavs] = useState(false);

    const filtered = useMemo(() => {
        if (showFavs) return getFavorites();
        if (query.trim()) return search(query);
        if (category !== 'all') return getByCategory(category as TemplateCategory);
        return templates;
    }, [templates, category, query, showFavs, getFavorites, search, getByCategory]);

    const handleApply = (id: string) => {
        const result = instantiate(id);
        if (result) onApply?.(result);
    };

    return (
        <div style={styles.root}>
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.title}>Templates</span>
                {onClose && (
                    <button style={styles.closeBtn} onClick={onClose}>x</button>
                )}
            </div>

            {/* Search */}
            <input
                style={styles.search}
                type="text"
                placeholder="Search templates..."
                value={query}
                onChange={e => { setQuery(e.target.value); setShowFavs(false); }}
            />

            {/* Category tabs */}
            <div style={styles.tabs}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        style={{ ...styles.tab, ...(category === cat && !showFavs ? styles.tabActive : {}) }}
                        onClick={() => { setCategory(cat); setQuery(''); setShowFavs(false); }}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
                <button
                    style={{ ...styles.tab, ...(showFavs ? styles.tabActive : {}) }}
                    onClick={() => { setShowFavs(!showFavs); setQuery(''); }}
                >
                    Favorites
                </button>
            </div>

            {/* Template grid */}
            <div style={styles.grid}>
                {filtered.length === 0 && (
                    <div style={styles.empty}>
                        No templates found. Save a design as a template to get started.
                    </div>
                )}
                {filtered.map(t => (
                    <div key={t.id} style={styles.card}>
                        {/* Thumbnail */}
                        <div style={styles.thumb}>
                            {t.thumbnailSrc ? (
                                <img src={t.thumbnailSrc} alt={t.name} style={styles.thumbImg} />
                            ) : (
                                <div style={styles.thumbPlaceholder}>
                                    {t.width} x {t.height}
                                </div>
                            )}
                        </div>
                        {/* Info */}
                        <div style={styles.info}>
                            <span style={styles.cardName} title={t.name}>{t.name}</span>
                            <span style={styles.cardMeta}>
                                {t.width}x{t.height} · used {t.usageCount}x
                            </span>
                        </div>
                        {/* Actions */}
                        <div style={styles.actions}>
                            <button
                                style={styles.favBtn}
                                onClick={() => toggleFavorite(t.id)}
                                title={t.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                {t.isFavorite ? '★' : '☆'}
                            </button>
                            <button
                                style={styles.applyBtn}
                                onClick={() => handleApply(t.id)}
                            >
                                Use
                            </button>
                            <button
                                style={styles.deleteBtn}
                                onClick={() => deleteTemplate(t.id)}
                                title="Delete template"
                            >
                                x
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
    root: {
        width: 320, background: '#1a1f2e', borderLeft: '1px solid #2a2f3e',
        display: 'flex', flexDirection: 'column', gap: 8, color: '#e0e0e0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
        height: '100%', overflow: 'hidden',
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 14px 0',
    },
    title: { fontSize: 14, fontWeight: 600, letterSpacing: -0.3 },
    closeBtn: {
        background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14,
        padding: '2px 6px',
    },
    search: {
        margin: '0 14px', padding: '6px 10px', background: '#0f1218',
        border: '1px solid #2a2f3e', borderRadius: 6, color: '#ccc',
        fontSize: 11, outline: 'none',
    },
    tabs: {
        display: 'flex', gap: 2, padding: '0 14px', flexWrap: 'wrap',
    },
    tab: {
        padding: '4px 8px', background: 'transparent', border: '1px solid #2a2f3e',
        borderRadius: 4, color: '#888', cursor: 'pointer', fontSize: 9,
        transition: 'all 0.15s',
    },
    tabActive: {
        borderColor: '#2563eb', color: '#60a5fa', background: '#2563eb15',
    },
    grid: {
        flex: 1, overflowY: 'auto', padding: '0 14px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
    },
    empty: {
        textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: 11,
        lineHeight: 1.6,
    },
    card: {
        background: '#0f1218', borderRadius: 6, border: '1px solid #2a2f3e',
        overflow: 'hidden', transition: 'border-color 0.15s',
    },
    thumb: {
        width: '100%', height: 100, background: '#161b26',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
    },
    thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
    thumbPlaceholder: {
        color: '#555', fontSize: 14, fontWeight: 600,
    },
    info: {
        padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 2,
    },
    cardName: {
        fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    cardMeta: { fontSize: 9, color: '#888' },
    actions: {
        display: 'flex', gap: 4, padding: '0 10px 8px',
    },
    favBtn: {
        background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer',
        fontSize: 14, padding: 0,
    },
    applyBtn: {
        flex: 1, padding: '4px 0', background: '#2563eb', border: 'none',
        borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer',
    },
    deleteBtn: {
        background: 'none', border: '1px solid #333', borderRadius: 4, color: '#666',
        cursor: 'pointer', fontSize: 10, padding: '2px 6px',
    },
};
