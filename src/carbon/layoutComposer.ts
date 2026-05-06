// ─────────────────────────────────────────────────
// Carbon Layout Composer — AI Content → Canvas Elements
// ─────────────────────────────────────────────────
// CORE PRINCIPLE: AI decides WHAT → Carbon decides WHERE.
//   - AI provides: headline, subheadline, CTA, tag, background type
//   - Carbon provides: position, size, spacing, typography for each element
//   - Templates are NOT involved. Zero template dependency.
//
// ★ KEY ADAPTATION: Carbon is designed for WEB (1056px viewport).
//   Ad creatives need BIGGER type relative to canvas.
//   We apply an "ad impact multiplier" on top of Carbon's type scale.
//   Web headline: 60px on 1080px page = 5.5% = readable
//   Ad headline: 120px on 1080px canvas = 11% = IMPACTFUL
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import { spacing, resolveTypeStyle, TYPE_SCALE_PX, miniUnit } from './adapter';
import { columns, centeredX, getMargin } from './gridSystem';
import { getAspectCategory } from '@/schema/layoutRoles';
import { hexR, hexG, hexB, hexLuminance, darkenHex, lightenHex } from './colorHelpers';
import { getLayoutRules } from './layoutRules';
import type { ElementRule, LayoutVariant } from './layoutRules';
import { buildDecorations } from './decorationEngine';
import { buildOverlayResult } from './overlayStyles';
import { fixAllOverlaps } from './overlapGuard';
import type { DesignStrategy } from './designStrategy';
import { DEFAULT_STRATEGY } from './designStrategy';
import { buildTextElement } from './textElementBuilder';
import { buildCtaElements } from './ctaStyleBuilder';

// ── Public Types ─────────────────────────────────

export interface DesignContent {
    headline: string;
    subheadline?: string;
    cta?: string;
    tag?: string;
}

export interface DesignPalette {
    gradientStart: string;
    gradientEnd: string;
    accent: string;
    foreground: string;
    background: string;
    typography: { primaryFont: string; secondaryFont: string };
}


export interface BuildResult {
    elements: RenderElement[];
    variant: LayoutVariant;
}

export function buildDesignElements(
    content: DesignContent,
    palette: DesignPalette,
    canvasW: number,
    canvasH: number,
    hasBgImage: boolean,
    layoutVariant?: LayoutVariant,
    designStrategy?: DesignStrategy,
): BuildResult {
    const strategy = designStrategy ?? DEFAULT_STRATEGY;
    const category = getAspectCategory(canvasW, canvasH);
    const { rules, variant } = getLayoutRules(category, layoutVariant);
    const canvasMin = Math.min(canvasW, canvasH);
    const elements: RenderElement[] = [];
    const isUltraWide = category === 'ultra-wide';

    // ── Background (AI-decided) ──
    // ★ Visual Impact Guard: detect flat/boring gradients and fix them.
    if (!hasBgImage) {
        let gStart = palette.gradientStart;
        let gEnd = palette.gradientEnd;

        // If gradient colors are too similar or both very light → boring flat bg.
        // Fix: darken the start to create visible depth.
        const startLum = hexLuminance(gStart);
        const endLum = hexLuminance(gEnd);
        const lumDiff = Math.abs(startLum - endLum);

        if (lumDiff < 0.08) {
            // Colors are nearly identical → force a meaningful gradient
            if (startLum > 0.7) {
                // Both light → darken start significantly for depth
                gStart = darkenHex(gStart, 0.65);
            } else {
                // Both dark → lighten end for contrast
                gEnd = lightenHex(gEnd, 0.3);
            }
        }

        elements.push({
            name: 'background',
            type: 'rect' as any,
            x: 0, y: 0, w: canvasW, h: canvasH,
            gradient_start_hex: gStart,
            gradient_end_hex: gEnd,
            gradient_angle: 135,
        });
    }

    // ★ Text color with contrast guarantee
    let textColor: string;
    if (hasBgImage) {
        textColor = '#FFFFFF';
    } else {
        // Check if foreground actually contrasts against the gradient
        const bgLum = hexLuminance(palette.gradientStart);
        const fgLum = hexLuminance(palette.foreground);
        const contrast = Math.abs(bgLum - fgLum);
        if (contrast < 0.3) {
            // Poor contrast → force high-contrast text
            textColor = bgLum > 0.5 ? '#1A1A2E' : '#FFFFFF';
        } else {
            textColor = palette.foreground;
        }
    }

    // ── Build content block (measure all heights first) ──
    // We build all text elements first, then CENTER the block vertically.
    const contentBlock: { element: RenderElement; gapBefore: number }[] = [];

    // ── Content ordering (controlled by layout variant) ──
    const order = rules.contentOrder ?? 'standard';

    const addTag = () => {
        if (!content.tag) return;
        // ★ v713: Tag uses accent color if strategy says so
        const tagColor = (strategy.textHierarchy.tagIsAccent && !hasBgImage)
            ? palette.accent : textColor;
        const el = buildTextElement('tag_text', content.tag, rules.tag,
            canvasW, canvasH, canvasMin, tagColor, palette, strategy);
        contentBlock.push({ element: el, gapBefore: contentBlock.length > 0 ? spacing(rules.tag.gapStep, canvasMin) : 0 });
    };
    const addHeadline = () => {
        const headlineEl = buildTextElement('headline', content.headline, rules.headline,
            canvasW, canvasH, canvasMin, textColor, palette, strategy);
        contentBlock.push({
            element: headlineEl,
            gapBefore: contentBlock.length > 0 ? spacing(rules.tag.gapStep, canvasMin) : 0,
        });
    };
    const addSubheadline = () => {
        if (!content.subheadline) return;
        const subEl = buildTextElement('subheadline', content.subheadline, rules.subline,
            canvasW, canvasH, canvasMin, textColor, palette, strategy);
        contentBlock.push({ element: subEl, gapBefore: spacing(rules.subline.gapStep, canvasMin) });
    };

    // Execute in order
    if (order === 'headline-first') { addHeadline(); addTag(); addSubheadline(); }
    else if (order === 'tag-last') { addHeadline(); addSubheadline(); addTag(); }
    else { addTag(); addHeadline(); addSubheadline(); }

    // ── Calculate total content height ──
    let totalContentH = 0;
    for (const item of contentBlock) {
        totalContentH += item.gapBefore + (item.element.h ?? 0);
    }

    // ── CTA dimensions (calculated early for vertical layout) ──
    let ctaH = 0;
    let ctaGap = 0;
    if (content.cta) {
        const ctaType = resolveTypeStyle(rules.cta.typeStyle, canvasMin);
        const ctaFontSize = Math.max(10, Math.round(ctaType.fontSize * rules.cta.adScale));
        ctaH = Math.max(
            Math.round(canvasMin * rules.ctaHeightFactor),
            Math.round(ctaFontSize * 2.5),
        );
        ctaGap = spacing(rules.cta.gapStep, canvasMin);
        totalContentH += ctaGap + ctaH;
    }

    // ── Vertical positioning (controlled by verticalBias) ──
    const bias = rules.verticalBias ?? 'center';
    let startY: number;
    if (isUltraWide) {
        startY = Math.round((canvasH - totalContentH) / 2);
    } else if (bias === 'top') {
        // Top-heavy: content starts at ~15% from top
        const topTarget = Math.round(canvasH * 0.12);
        startY = Math.max(spacing(3, canvasMin), topTarget);
    } else if (bias === 'bottom') {
        // Bottom-stack: content ends at ~85% from top
        const bottomTarget = Math.round(canvasH * 0.85 - totalContentH);
        startY = Math.max(spacing(3, canvasMin), bottomTarget);
    } else {
        // Center with slight upward bias (golden ratio ~38% from top)
        const goldenTop = Math.round(canvasH * 0.38 - totalContentH / 2);
        const minTop = spacing(5, canvasMin); // minimum top margin
        startY = Math.max(minTop, goldenTop);
    }

    // ── If content overflows canvas, compress everything to fit ──
    let compressionRatio = 1;
    if (totalContentH > canvasH * 0.92) {
        compressionRatio = (canvasH * 0.88) / totalContentH;
        totalContentH = Math.round(totalContentH * compressionRatio);
        for (const item of contentBlock) {
            item.element.h = Math.round((item.element.h ?? 0) * compressionRatio);
            item.element.font_size = Math.max(8, Math.round((item.element.font_size ?? 16) * compressionRatio));
            item.gapBefore = Math.round(item.gapBefore * compressionRatio);
        }
        ctaH = Math.round(ctaH * compressionRatio);
        ctaGap = Math.round(ctaGap * compressionRatio);
        startY = Math.max(spacing(3, canvasMin), Math.round((canvasH - totalContentH) / 2));
    }

    // ── Place content elements (cursor-based stacking) ──
    let cursorY = startY;
    for (const item of contentBlock) {
        cursorY += item.gapBefore;
        item.element.y = cursorY;
        elements.push(item.element);
        cursorY += item.element.h ?? 0;
    }

    // ── CTA Button (optional) — v714: strategy-driven style ──
    if (content.cta) {
        const ctaRule = rules.cta;
        const ctaType = resolveTypeStyle(ctaRule.typeStyle, canvasMin);
        const ctaFontSize = Math.max(10, Math.round(ctaType.fontSize * ctaRule.adScale));
        const ctaW = columns(ctaRule.cols, canvasW);

        let ctaX: number;
        if (ctaRule.align === 'center') ctaX = centeredX(ctaRule.cols, canvasW);
        else if (ctaRule.align === 'right') ctaX = canvasW - ctaW - getMargin(canvasW);
        else ctaX = getMargin(canvasW);

        let ctaY = cursorY + ctaGap;
        ctaY = Math.min(ctaY, canvasH - ctaH);
        ctaY = Math.max(ctaY, 0);

        // ★ v714: AI-chosen CTA style (pill, outlined, solid, text-arrow, rounded-square)
        const ctaElements = buildCtaElements(strategy.ctaStyle, {
            text: content.cta,
            x: ctaX, y: ctaY, w: ctaW, h: ctaH,
            fontSize: ctaFontSize,
            fontWeight: String(ctaRule.fontWeight ?? 600),
            fontFamily: palette.typography.primaryFont,
            lineHeight: ctaType.lineHeight,
            accentColor: palette.accent,
            gradientEndColor: palette.gradientEnd,
            canvasMin,
        });
        elements.push(...ctaElements);
    }

    // ★ OVERLAP GUARD (v711): Runs AFTER CTA placement.
    // Checks ALL text/CTA pairs (not just adjacent) to guarantee zero overlap.
    fixAllOverlaps(elements, canvasH, canvasMin);

    // ── Text-on-image overlay (v713: Premium overlay system) ──
    // ★ Uses AI-chosen DesignStrategy instead of monotonous black rects.
    if (hasBgImage) {
        const { overlayApproach, imageFilters: aiFilters } = strategy;
        const overlay = buildOverlayResult(
            overlayApproach, canvasW, canvasH,
            palette.background, palette.accent,
            aiFilters.brightness, aiFilters.blur,
        );

        // Insert overlay elements at the beginning (after background)
        if (overlay.overlayElements.length > 0) {
            elements.splice(0, 0, ...overlay.overlayElements);
        }

        // ★ Apply text shadows from overlay strategy to ALL text elements
        if (overlay.textModifiers.shadowBlur > 0) {
            for (const el of elements) {
                if (el.type === 'text') {
                    el.shadow_blur = overlay.textModifiers.shadowBlur;
                    el.shadow_offset_x = 0;
                    el.shadow_offset_y = overlay.textModifiers.shadowOffsetY;
                    el.shadow_opacity = overlay.textModifiers.shadowOpacity;
                }
            }
        }

        // ★ Store image filter hints for the render pipeline to apply
        // These get applied to the background image node in agentGenerateFlow.ts
        (elements as any).__imageFilters = overlay.imageFilters;
    }

    // ── Decoration elements (accent lines, borders, dots) ──
    const decos = buildDecorations(variant, elements, palette.accent, canvasW, canvasH);
    elements.push(...decos);

    return { elements, variant };
}

// ★ buildTextElement → extracted to textElementBuilder.ts
