// ─────────────────────────────────────────────────
// SidebarTemplateTab — Browse + apply templates with CSS previews
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useTemplateStore, type TemplateCategory, type DesignTemplate } from '@/stores/templateStore';
import { constraintsToAbsolute } from '@/engine/elementConverters';
import { computeUniformScale, scaleElementRect, scaleFontSize } from './templateScaling';
import { textEffectToCSS, parseShadowColorForEngine } from './templateEffectHelpers';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';
import { ensureGoogleFont } from './contextToolbarConstants';
import type { BannerVariant } from '@/schema/design.types';
import { useAppI18n } from '@/i18n';

const CATEGORIES = ['all', 'display', 'social', 'email', 'video'] as const;

interface Props {
    actions?: CanvasEngineActions | null;
}

export function SidebarTemplateTab({ actions }: Props) {
    const { templates, search, getByCategory, instantiate } = useTemplateStore();
    const { t } = useAppI18n();

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
                placeholder={t('editor.searchTemplates')}
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
                        {t(`editor.cat${cat.charAt(0).toUpperCase() + cat.slice(1)}`)}
                    </button>
                ))}
            </div>

            {/* Template grid — apply only (admin editing via /templates page) */}
            <div className="sidebar-template-grid">
                {filtered.length === 0 && (
                    <div className="sidebar-empty">
                        {t('editor.noTemplatesFound')}
                    </div>
                )}
                {filtered.map(tpl => (
                    <div key={tpl.id} className="sidebar-template-card" onClick={() => handleApply(tpl.id)} style={{ position: 'relative' }}>
                        <TemplatePreview template={tpl} />
                        <div className="sidebar-template-info">
                            <span className="sidebar-template-name">{tpl.name}</span>
                            <span className="sidebar-template-meta">
                                {tpl.width}x{tpl.height}
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

                    const shadow = el.shadow;
                    const shadowCSS = shadow
                        ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`
                        : undefined;

                    const baseStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: pos.x,
                        top: pos.y,
                        width: pos.w,
                        height: pos.h,
                        opacity: el.opacity ?? 1,
                        zIndex: el.zIndex ?? 0,
                        overflow: 'visible',
                        pointerEvents: 'none',
                        boxShadow: el.type !== 'text' ? shadowCSS : undefined,
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
                        // ★ FIX: Convert textEffect to CSS text-shadow for preview (glow, neon, etc.)
                        const effectShadow = el.textEffect && el.textEffect.type !== 'none'
                            ? textEffectToCSS(el.textEffect.type, el.textEffect.intensity ?? 50, el.textEffect.color ?? '#ffffff')
                            : undefined;
                        const finalTextShadow = [effectShadow, shadowCSS].filter(Boolean).join(', ') || undefined;

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
                                textShadow: finalTextShadow,
                                ...(el.textEffect?.type === 'outline' || el.textEffect?.type === 'splice'
                                    ? { WebkitTextStroke: `${Math.max(1, 2 * (el.textEffect.intensity / 50))}px ${el.textEffect.color}` }
                                    : {}),
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

    const sp = { tW, tH, cW, cH };
    const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);

    // ★ FIX: Preload ALL fonts used by text elements BEFORE creating Textboxes.
    // Fabric.js Textbox calculates line breaks at creation time using current font metrics.
    // If the font isn't loaded yet, it uses fallback metrics → wrong wrapping.
    const textFonts = new Set<string>();
    for (const el of elements) {
        if ((el.type === 'text' || el.type === 'button') && (el as any).fontFamily) {
            textFonts.add(((el as any).fontFamily as string).split(',')[0].trim());
        }
    }
    for (const font of textFonts) {
        ensureGoogleFont(font);
    }

    for (const el of elements) {
        const abs = el.constraints
            ? constraintsToAbsolute(el.constraints, tW, tH)
            : { x: 0, y: 0, w: 100, h: 100 };

        const { x, y, w, h } = scaleElementRect(abs, sp, uniformScale, offsetX, offsetY);
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
            const scaledFontSize = scaleFontSize(el.fontSize, uniformScale);
            nodeId = actions.addText(x, y, el.content ?? 'Text', {
                fontSize: scaledFontSize,
                fontFamily: el.fontFamily ?? 'Inter, sans-serif',
                fontWeight: String(el.fontWeight),
                color: el.color,
                textAlign: el.textAlign,
                lineHeight: el.lineHeight,
                width: w,
            });

            // ★ FIX: Apply textEffect (glow, outline, neon, etc.) — previously not carried over from templates
            if (nodeId != null && el.textEffect && el.textEffect.type !== 'none') {
                actions.setTextEffect(nodeId, el.textEffect.type, el.textEffect.intensity ?? 50, el.textEffect.color ?? '#ffffff');
            }
            // ★ FIX: Apply shadow — previously not carried over from templates
            if (nodeId != null && el.shadow) {
                const sc = parseShadowColorForEngine(el.shadow.color);
                actions.setShadow(nodeId, el.shadow.offsetX, el.shadow.offsetY, el.shadow.blur, sc[0], sc[1], sc[2], sc[3]);
            }
        } else if (el.type === 'button') {
            const bgHex = el.backgroundColor || '#7c3aed';
            nodeId = actions.addGradientRect(
                x, y, w, h,
                bgHex, bgHex, 0,
                Math.round((el.borderRadius ?? 8) * uniformScale),
                el.name,
            );
            const scaledFontSize = scaleFontSize(el.fontSize, uniformScale);
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

        // ★ FIX: Apply shadow for non-text elements (shapes, images) — previously not carried over
        if (nodeId != null && el.type !== 'text' && (el as any).shadow) {
            const s = (el as any).shadow;
            const sc = parseShadowColorForEngine(s.color);
            actions.setShadow(nodeId, s.offsetX, s.offsetY, s.blur, sc[0], sc[1], sc[2], sc[3]);
        }
    }

    // ★ FIX: After all elements are created, wait for SPECIFIC fonts to load then
    // recalculate Textbox dimensions. document.fonts.ready can resolve immediately
    // if no new fonts were requested. We explicitly load each font to force waiting.
    if (typeof document !== 'undefined' && textFonts.size > 0 && actions.refreshTextCoords) {
        const fontPromises = [...textFonts].map(f =>
            document.fonts.load(`bold 48px "${f}"`).catch(() => { /* font may not exist */ })
        );
        Promise.all(fontPromises).then(() => {
            actions.refreshTextCoords?.();
            console.log('[templateDrop] Fonts loaded — refreshed text dimensions');
        });
        // ★ Safety net: delayed refresh in case font load takes longer than expected
        setTimeout(() => { actions.refreshTextCoords?.(); }, 500);
        setTimeout(() => { actions.refreshTextCoords?.(); }, 1500);
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
