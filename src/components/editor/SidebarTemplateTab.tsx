// ─────────────────────────────────────────────────
// SidebarTemplateTab — Browse + apply templates with CSS previews
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useTemplateStore, type TemplateCategory, type DesignTemplate } from '@/stores/templateStore';
import { constraintsToAbsolute } from '@/engine/elementConverters';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';
import type { BannerVariant } from '@/schema/design.types';

const CATEGORIES = ['all', 'display', 'social', 'email', 'video'] as const;

interface Props {
    actions?: CanvasEngineActions | null;
}

export function SidebarTemplateTab({ actions }: Props) {
    const { templates, search, getByCategory, instantiate } = useTemplateStore();

    const [category, setCategory] = useState<string>('all');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        if (query.trim()) return search(query);
        if (category !== 'all') return getByCategory(category as TemplateCategory);
        return templates;
    }, [templates, category, query, search, getByCategory]);

    // ★ Apply template to canvas — create each element via engine actions
    const handleApply = useCallback((id: string) => {
        const variant = instantiate(id);
        if (!variant || !actions) return;

        applyVariantToCanvas(variant, actions);
    }, [instantiate, actions]);

    return (
        <div className="sidebar-templates">
            {/* Search */}
            <input
                className="sidebar-search"
                type="text"
                placeholder="Search templates..."
                value={query}
                onChange={e => { setQuery(e.target.value); }}
            />

            {/* Category pills */}
            <div className="sidebar-pills">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`sidebar-pill ${category === cat ? 'active' : ''}`}
                        onClick={() => { setCategory(cat); setQuery(''); }}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Template grid — apply only (admin editing via /templates page) */}
            <div className="sidebar-template-grid">
                {filtered.length === 0 && (
                    <div className="sidebar-empty">
                        No templates found. Create a design and save it as a template.
                    </div>
                )}
                {filtered.map(t => (
                    <div key={t.id} className="sidebar-template-card" onClick={() => handleApply(t.id)} style={{ position: 'relative' }}>
                        <TemplatePreview template={t} />
                        <div className="sidebar-template-info">
                            <span className="sidebar-template-name">{t.name}</span>
                            <span className="sidebar-template-meta">
                                {t.width}x{t.height}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════
// CSS-based template preview — renders elements as mini-preview
// ═════════════════════════════════════════════════════

function TemplatePreview({ template }: { template: DesignTemplate }) {
    // Parse the variant to render a scaled CSS preview
    let variant: BannerVariant | null = null;
    try {
        variant = JSON.parse(template.variantSnapshot);
    } catch {
        // noop
    }

    if (!variant) {
        return (
            <div className="sidebar-template-placeholder">
                {template.width} x {template.height}
            </div>
        );
    }

    const tw = template.width;
    const th = template.height;
    // ★ CSS transform:scale approach — render at FULL size, shrink with transform
    // This avoids all text overflow/clipping issues from manual font scaling
    const previewW = 130;
    const scale = previewW / tw;
    const previewH = th * scale;

    return (
        <div
            className="sidebar-template-css-preview"
            style={{
                width: previewW,
                height: previewH,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 6,
            }}
        >
            {/* Inner container at FULL template size, scaled down via CSS transform */}
            <div style={{
                width: tw,
                height: th,
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                backgroundColor: variant.backgroundColor || '#f0f0f0',
            }}>
                {variant.elements.map((el) => {
                    // ★ Use constraintsToAbsolute — single source of truth for positions
                    const pos = el.constraints
                        ? constraintsToAbsolute(el.constraints, tw, th)
                        : { x: 0, y: 0, w: 0, h: 0 };

                    const baseStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: pos.x,
                        top: pos.y,
                        width: pos.w,
                        height: pos.h,
                        opacity: el.opacity ?? 1,
                        zIndex: el.zIndex ?? 0,
                        overflow: 'hidden',
                        pointerEvents: 'none',
                    };

                    if (el.type === 'shape') {
                        const bg = el.gradientStart && el.gradientEnd
                            ? `linear-gradient(${el.gradientAngle ?? 0}deg, ${el.gradientStart}, ${el.gradientEnd})`
                            : el.fill;
                        return (
                            <div key={el.id} style={{
                                ...baseStyle,
                                background: bg,
                                borderRadius: el.borderRadius ?? 0,
                            }} />
                        );
                    }

                    if (el.type === 'text') {
                        return (
                            <div key={el.id} style={{
                                ...baseStyle,
                                color: el.color,
                                fontSize: el.fontSize,
                                fontWeight: el.fontWeight,
                                fontFamily: el.fontFamily || 'Inter, sans-serif',
                                textAlign: (el.textAlign as React.CSSProperties['textAlign']) || 'left',
                                lineHeight: el.lineHeight || 1.2,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}>
                                {el.content}
                            </div>
                        );
                    }

                    if (el.type === 'button') {
                        return (
                            <div key={el.id} style={{
                                ...baseStyle,
                                backgroundColor: el.backgroundColor,
                                color: el.color,
                                fontSize: el.fontSize,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
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

// ═════════════════════════════════════════════════════
// Apply variant elements to canvas via engine actions
// ═════════════════════════════════════════════════════

function applyVariantToCanvas(variant: BannerVariant, actions: CanvasEngineActions) {
    const elements = variant.elements ?? [];

    // ★ Template original dimensions
    const tW = variant.preset?.width || 1080;
    const tH = variant.preset?.height || 1080;

    // ★ Current canvas dimensions
    const cW = actions.canvasWidth || 300;
    const cH = actions.canvasHeight || 250;

    // ★ FIX: Uniform scale preserves ALL proportions (gaps, font ratios, aspect ratios).
    // Non-uniform scale was causing spacing collapse when template aspect ≠ canvas aspect.
    const uniformScale = Math.min(cW / tW, cH / tH);
    // Center the scaled template within the canvas
    const offsetX = Math.round((cW - tW * uniformScale) / 2);
    const offsetY = Math.round((cH - tH * uniformScale) / 2);

    for (const el of elements) {
        // Resolve positions against the TEMPLATE's native size
        const abs = el.constraints
            ? constraintsToAbsolute(el.constraints, tW, tH)
            : { x: 0, y: 0, w: 100, h: 100 };

        // ★ Structural element detection — 4 categories:
        // 1. Full background (covers both axes) → fill entire canvas
        // 2. Full-height element (accent bars, dividers) → stretch height, scale x proportionally
        // 3. Full-width element (top bars) → stretch width, scale y proportionally
        // 4. Content element → uniform scale + center offset
        const coversW = abs.w >= tW * 0.98;
        const coversH = abs.h >= tH * 0.98;

        let x: number, y: number, w: number, h: number;
        if (coversW && coversH) {
            x = 0; y = 0; w = cW; h = cH;
        } else if (coversH) {
            // Full-height element (e.g., accent bar at x=0) — pin to edge, stretch height
            x = Math.round(abs.x * (cW / tW)); y = 0;
            w = Math.max(1, Math.round(abs.w * (cW / tW))); h = cH;
        } else if (coversW) {
            // Full-width element (e.g., top bar at y=0) — pin to edge, stretch width
            x = 0; y = Math.round(abs.y * (cH / tH));
            w = cW; h = Math.max(1, Math.round(abs.h * (cH / tH)));
        } else {
            // Content element — uniform scale + center
            x = Math.round(abs.x * uniformScale) + offsetX;
            y = Math.round(abs.y * uniformScale) + offsetY;
            w = Math.round(abs.w * uniformScale);
            h = Math.round(abs.h * uniformScale);
        }
        const scaledRadius = Math.round(((el as any).borderRadius ?? 0) * uniformScale);
        let nodeId: number | null = null;

        if (el.type === 'shape') {
            if (el.gradientStart && el.gradientEnd) {
                nodeId = actions.addGradientRect(
                    x, y, w, h,
                    el.gradientStart, el.gradientEnd,
                    el.gradientAngle ?? 0,
                    scaledRadius, el.name,
                );
            } else {
                nodeId = actions.addRect(x, y);
                if (nodeId != null) {
                    actions.setNodeSize(nodeId, w, h);
                    const fillHex = el.fill || '#808080';
                    const parsed = parseColor(fillHex);
                    if (parsed) {
                        actions.setFillColor(nodeId, parsed.r, parsed.g, parsed.b, 1);
                    }
                }
            }
        } else if (el.type === 'text') {
            const scaledFontSize = Math.max(Math.round(el.fontSize * uniformScale), 6);
            nodeId = actions.addText(x, y, el.content ?? 'Text', {
                fontSize: scaledFontSize,
                fontFamily: el.fontFamily ?? 'Inter, sans-serif',
                fontWeight: String(el.fontWeight),
                color: el.color,
                textAlign: el.textAlign,
                lineHeight: el.lineHeight,
                width: w,
            });
        } else if (el.type === 'button') {
            const bgHex = el.backgroundColor || '#7c3aed';
            nodeId = actions.addGradientRect(
                x, y, w, h,
                bgHex, bgHex, 0,
                Math.round((el.borderRadius ?? 8) * uniformScale),
                el.name,
            );
            const scaledFontSize = Math.max(Math.round(el.fontSize * uniformScale), 6);
            actions.addText(x, y, el.label, {
                fontSize: scaledFontSize,
                fontFamily: 'Inter, sans-serif',
                fontWeight: '700',
                color: el.color,
                textAlign: 'center',
                width: w,
            });
        } else if (el.type === 'image' && el.src) {
            actions.addImage(x, y, el.src, w, h);
        }

        // ★ FIX: Apply opacity AFTER creation — previously lost for ALL element types
        if (nodeId != null && el.opacity !== undefined && el.opacity !== 1) {
            actions.setNodeOpacity(nodeId, el.opacity);
        }
    }
}

// ── Parse hex/rgb color to 0-1 floats ──
function parseColor(c: string): { r: number; g: number; b: number } | null {
    if (c.startsWith('#')) {
        const hex = c.slice(1);
        if (hex.length === 6) {
            return {
                r: parseInt(hex.slice(0, 2), 16) / 255,
                g: parseInt(hex.slice(2, 4), 16) / 255,
                b: parseInt(hex.slice(4, 6), 16) / 255,
            };
        }
    }
    // rgba(...) support
    const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        return {
            r: Number(match[1]) / 255,
            g: Number(match[2]) / 255,
            b: Number(match[3]) / 255,
        };
    }
    return null;
}
