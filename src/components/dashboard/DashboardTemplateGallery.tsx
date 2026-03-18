// ─────────────────────────────────────────────────
// DashboardTemplateGallery — Canva-level template browser
// ─────────────────────────────────────────────────
// Rich visual preview cards with mini-layout mockups.
// Built-in templates: select only. User templates: can delete.
// Category pills, search, responsive grid, hover overlays.
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateStore, type DesignTemplate, type TemplateCategory } from '@/stores/templateStore';
import { useDesignStore } from '@/stores/designStore';
import type { ShapeElement } from '@/schema/elements.types';
import { BANNER_PRESETS } from '@/schema/presets';
import type { DesignElement } from '@/schema/elements.types';
import type { BannerVariant } from '@/schema/design.types';
import './DashboardTemplateGallery.css';

type SortBy = 'newest' | 'popular' | 'name';
const CATEGORIES: { key: string; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'display', label: 'Display' },
    { key: 'social', label: 'Social' },
    { key: 'email', label: 'Email' },
    { key: 'video', label: 'Video' },
];

export function DashboardTemplateGallery() {
    const navigate = useNavigate();
    const { templates, search, getByCategory, toggleFavorite, instantiate } = useTemplateStore();
    const createCreativeSet = useDesignStore(s => s.createCreativeSet);

    const [category, setCategory] = useState('all');
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('newest');
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        let result = query.trim()
            ? search(query)
            : category !== 'all'
                ? getByCategory(category as TemplateCategory)
                : templates;
        return [...result].sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'popular') return b.usageCount - a.usageCount;
            return a.name.localeCompare(b.name);
        });
    }, [templates, category, query, sortBy, search, getByCategory]);

    const handleUse = useCallback((id: string) => {
        const templateVariant = instantiate(id);
        if (!templateVariant) return;
        const tmpl = templates.find(t => t.id === id);
        const preset = BANNER_PRESETS.find(p => p.width === (tmpl?.width ?? 300) && p.height === (tmpl?.height ?? 250))
            ?? { id: `custom-${Date.now()}`, name: `${tmpl?.width ?? 300}x${tmpl?.height ?? 250}`, width: tmpl?.width ?? 300, height: tmpl?.height ?? 250, category: 'display' as const };
        const setId = createCreativeSet(tmpl?.name ?? 'From Template', preset);

        // ★ FIX: Actually inject template elements into the created creative set.
        // createCreativeSet makes an empty master variant — we need to populate it.
        const ds = useDesignStore.getState();
        const cs = ds.allCreativeSets[setId];
        if (cs) {
            const masterVid = cs.masterVariantId;
            ds.replaceVariantElements(masterVid, templateVariant.elements);
        }

        navigate(`/editor/${setId}`);
    }, [instantiate, templates, createCreativeSet, navigate]);

    return (
        <div className="tmpl-gallery">
            {/* ── Header Bar ── */}
            <div className="tmpl-gallery__header">
                <div className="tmpl-gallery__search">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="tmpl-gallery__search-input"
                        placeholder="Search templates..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
                <select className="tmpl-gallery__sort" value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
                    <option value="newest">Newest</option>
                    <option value="popular">Popular</option>
                    <option value="name">A-Z</option>
                </select>
            </div>

            {/* ── Category Pills ── */}
            <div className="tmpl-gallery__pills">
                {CATEGORIES.map(c => (
                    <button
                        key={c.key}
                        className={`tmpl-pill ${category === c.key && !query ? 'tmpl-pill--active' : ''}`}
                        onClick={() => { setCategory(c.key); setQuery(''); }}
                    >
                        {c.label}
                    </button>
                ))}
                <span className="tmpl-gallery__count">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* ── Grid ── */}
            {filtered.length === 0 ? (
                <div className="tmpl-gallery__empty">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.25">
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    <p>{query ? `No templates match "${query}"` : 'Create designs to build your template library'}</p>
                </div>
            ) : (
                <div className="tmpl-grid">
                    {filtered.map(t => (
                        <TemplateCard
                            key={t.id}
                            template={t}
                            isHovered={hoveredId === t.id}
                            onHover={setHoveredId}
                            onUse={handleUse}
                            onToggleFav={toggleFavorite}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TemplateCard — Rich visual preview with mini-layout
// ═══════════════════════════════════════════════════

interface CardProps {
    template: DesignTemplate;
    isHovered: boolean;
    onHover: (id: string | null) => void;
    onUse: (id: string) => void;
    onToggleFav: (id: string) => void;
}

function TemplateCard({ template: t, isHovered, onHover, onUse, onToggleFav }: CardProps) {
    const elements = useMemo(() => parseElements(t), [t]);
    const bgColor = useMemo(() => parseBgColor(t), [t]);
    const aspectRatio = t.width / t.height;
    // Clamp aspect ratio for card display
    const displayRatio = Math.max(0.6, Math.min(aspectRatio, 2.0));

    return (
        <div
            className={`tmpl-card ${isHovered ? 'tmpl-card--hover' : ''}`}
            onMouseEnter={() => onHover(t.id)}
            onMouseLeave={() => onHover(null)}
        >
            {/* ── Preview ── */}
            <div
                className="tmpl-card__preview"
                style={{ backgroundColor: bgColor, aspectRatio: `${displayRatio}` }}
            >
                {/* Mini layout mockup — uses padding-bottom trick for reliable sizing */}
                <div className="tmpl-card__layout" style={{ position: 'relative', width: '85%' }}>
                    <div style={{ paddingBottom: `${(t.height / t.width) * 100}%` }} />
                    <div style={{ position: 'absolute', inset: 0 }}>
                        {elements.map((el, i) => (
                            <MiniElement key={i} el={el} canvasW={t.width} canvasH={t.height} />
                        ))}
                    </div>
                </div>

                {/* Badges */}
                <div className="tmpl-card__badges">
                    {t.isBuiltIn && <span className="tmpl-badge tmpl-badge--builtin">Starter</span>}
                    <span className="tmpl-badge tmpl-badge--size">{t.width} x {t.height}</span>
                </div>

                {/* Favorite button */}
                <button
                    className={`tmpl-card__fav ${t.isFavorite ? 'tmpl-card__fav--active' : ''}`}
                    onClick={e => { e.stopPropagation(); onToggleFav(t.id); }}
                    title={t.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    {t.isFavorite ? '\u2605' : '\u2606'}
                </button>

                {/* Hover Overlay */}
                <div className="tmpl-card__overlay" onClick={() => onUse(t.id)}>
                    <button className="tmpl-card__use-btn">
                        Use This Template
                    </button>
                </div>
            </div>

            {/* ── Info ── */}
            <div className="tmpl-card__info">
                <div className="tmpl-card__name">{t.name}</div>
                <div className="tmpl-card__desc">{t.description}</div>
                <div className="tmpl-card__meta">
                    {t.category} · {t.usageCount > 0 ? `${t.usageCount} uses` : 'New'}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// MiniElement — Renders a scaled-down element representation
// ═══════════════════════════════════════════════════

function MiniElement({ el, canvasW, canvasH }: { el: MiniElementData; canvasW: number; canvasH: number }) {
    const left = `${(el.x / canvasW) * 100}%`;
    const top = `${(el.y / canvasH) * 100}%`;
    const width = `${(el.w / canvasW) * 100}%`;
    const height = `${(el.h / canvasH) * 100}%`;

    if (el.type === 'text') {
        return (
            <div
                className="tmpl-mini tmpl-mini--text"
                style={{ left, top, width, height, color: el.color }}
            >
                <div
                    className="tmpl-mini__text"
                    style={{
                        fontSize: `${Math.max(4, (el.fontSize ?? 12) * 0.35)}px`,
                        fontWeight: el.fontWeight,
                        textAlign: el.textAlign as any,
                        lineHeight: 1.1,
                    }}
                >
                    {el.content}
                </div>
            </div>
        );
    }

    if (el.type === 'button') {
        return (
            <div
                className="tmpl-mini tmpl-mini--btn"
                style={{
                    left, top, width, height,
                    backgroundColor: el.bgColor,
                    borderRadius: `${el.borderRadius ?? 4}px`,
                    color: el.color,
                    fontSize: `${Math.max(3, (el.fontSize ?? 12) * 0.3)}px`,
                }}
            >
                {el.label}
            </div>
        );
    }

    // Shape
    const bg = el.gradientStart && el.gradientEnd
        ? `linear-gradient(${el.gradientAngle ?? 135}deg, ${el.gradientStart}, ${el.gradientEnd})`
        : el.fill;

    return (
        <div
            className="tmpl-mini tmpl-mini--shape"
            style={{
                left, top, width, height,
                background: bg,
                borderRadius: el.borderRadius ? `${Math.min(el.borderRadius, 50)}px` : undefined,
                opacity: el.opacity,
            }}
        />
    );
}

// ── Data Extraction ──

interface MiniElementData {
    type: 'text' | 'shape' | 'button';
    x: number; y: number; w: number; h: number;
    // Text
    content?: string; fontSize?: number; fontWeight?: number;
    color?: string; textAlign?: string;
    // Shape
    fill?: string; gradientStart?: string; gradientEnd?: string;
    gradientAngle?: number; borderRadius?: number; opacity?: number;
    // Button
    label?: string; bgColor?: string;
}

function parseElements(t: DesignTemplate): MiniElementData[] {
    try {
        const variant: BannerVariant = JSON.parse(t.variantSnapshot);
        if (!variant.elements) return [];
        return variant.elements
            .filter((e: DesignElement) => e.visible !== false)
            .sort((a: DesignElement, b: DesignElement) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
            .map((e: DesignElement): MiniElementData => {
                const c = e.constraints;
                const base = {
                    x: c.horizontal.offset,
                    y: c.vertical.offset,
                    w: c.size.width,
                    h: c.size.height,
                };
                if (e.type === 'text') {
                    return {
                        ...base, type: 'text',
                        content: e.content, fontSize: e.fontSize, fontWeight: e.fontWeight,
                        color: e.color, textAlign: e.textAlign,
                    };
                }
                if (e.type === 'button') {
                    return {
                        ...base, type: 'button',
                        label: e.label, fontSize: e.fontSize, color: e.color,
                        bgColor: e.backgroundColor, borderRadius: e.borderRadius,
                    };
                }
                // Cast to ShapeElement for shape-specific fields
                const shape = e as ShapeElement;
                return {
                    ...base, type: 'shape',
                    fill: shape.fill, borderRadius: shape.borderRadius, opacity: e.opacity,
                    gradientStart: shape.gradientStart, gradientEnd: shape.gradientEnd,
                    gradientAngle: shape.gradientAngle,
                };
            });
    } catch {
        return [];
    }
}

function parseBgColor(t: DesignTemplate): string {
    try {
        const v: BannerVariant = JSON.parse(t.variantSnapshot);
        return v.backgroundColor ?? '#1a1f2e';
    } catch {
        return '#1a1f2e';
    }
}
