// ─────────────────────────────────────────────────
// SidebarTemplateTab — Browse + apply templates with CSS previews
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useTemplateStore, type TemplateCategory, type DesignTemplate } from '@/stores/templateStore';
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

            {/* Template grid */}
            <div className="sidebar-template-grid">
                {filtered.length === 0 && (
                    <div className="sidebar-empty">
                        No templates found. Create a design and save it as a template.
                    </div>
                )}
                {filtered.map(t => (
                    <div key={t.id} className="sidebar-template-card" onClick={() => handleApply(t.id)}>
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
    // Scale to fit 130px wide preview
    const previewW = 130;
    const scale = previewW / tw;
    const previewH = Math.min(th * scale, 120); // cap height

    return (
        <div
            className="sidebar-template-css-preview"
            style={{
                width: previewW,
                height: previewH,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 6,
                backgroundColor: variant.backgroundColor || '#f0f0f0',
            }}
        >
            {variant.elements.map((el) => {
                const x = (el.constraints?.horizontal?.offset ?? 0) * scale;
                const y = (el.constraints?.vertical?.offset ?? 0) * scale;
                const w = (el.constraints?.size?.width ?? 0) * scale;
                const h = (el.constraints?.size?.height ?? 0) * scale;

                const baseStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: w,
                    height: h,
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
                            borderRadius: el.borderRadius ? el.borderRadius * scale : 0,
                        }} />
                    );
                }

                if (el.type === 'text') {
                    return (
                        <div key={el.id} style={{
                            ...baseStyle,
                            color: el.color,
                            fontSize: Math.max(el.fontSize * scale, 3),
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
                            fontSize: Math.max(el.fontSize * scale, 3),
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: (el.borderRadius ?? 6) * scale,
                        }}>
                            {el.label}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ═════════════════════════════════════════════════════
// Apply variant elements to canvas via engine actions
// ═════════════════════════════════════════════════════

function applyVariantToCanvas(variant: BannerVariant, actions: CanvasEngineActions) {
    const elements = variant.elements ?? [];

    for (const el of elements) {
        const x = el.constraints?.horizontal?.offset ?? 0;
        const y = el.constraints?.vertical?.offset ?? 0;
        const w = el.constraints?.size?.width ?? 100;
        const h = el.constraints?.size?.height ?? 100;

        if (el.type === 'shape') {
            // Use gradient rect if gradient is defined
            if (el.gradientStart && el.gradientEnd) {
                actions.addGradientRect(
                    x, y, w, h,
                    el.gradientStart,
                    el.gradientEnd,
                    el.gradientAngle ?? 0,
                    el.borderRadius ?? 0,
                    el.name,
                );
            } else {
                // Plain rect with specific color
                const nodeId = actions.addRect(x, y);
                if (nodeId != null) {
                    actions.setNodeSize(nodeId, w, h);
                    // Parse fill color
                    const fillHex = el.fill || '#808080';
                    const parsed = parseColor(fillHex);
                    if (parsed) {
                        actions.setFillColor(nodeId, parsed.r, parsed.g, parsed.b, el.opacity ?? 1);
                    }
                    if (el.borderRadius && el.borderRadius > 0) {
                        // Round rect — set via gradient with same colors
                        // The addGradientRect handles border radius
                    }
                }
            }
        } else if (el.type === 'text') {
            actions.addText(x, y, el.content ?? 'Text', {
                fontSize: el.fontSize,
                fontFamily: el.fontFamily ?? 'Inter, sans-serif',
                fontWeight: String(el.fontWeight),
                color: el.color,
                textAlign: el.textAlign,
                lineHeight: el.lineHeight,
                width: w,
            });
        } else if (el.type === 'button') {
            // Create button as a colored rect + text overlay
            const bgHex = el.backgroundColor || '#7c3aed';
            const nodeId = actions.addGradientRect(
                x, y, w, h,
                bgHex, bgHex, // solid color via gradient
                0,
                el.borderRadius ?? 8,
                el.name,
            );
            // Add text label on top
            actions.addText(x, y, el.label, {
                fontSize: el.fontSize,
                fontFamily: 'Inter, sans-serif',
                fontWeight: '700',
                color: el.color,
                textAlign: 'center',
                width: w,
            });
            // Only suppress lint — nodeId may be null
            void nodeId;
        } else if (el.type === 'image' && el.src) {
            actions.addImage(x, y, el.src, w, h);
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
