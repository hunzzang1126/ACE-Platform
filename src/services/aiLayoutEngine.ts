// ─────────────────────────────────────────────────
// aiLayoutEngine.ts — AI-Powered Layout Generation
// ─────────────────────────────────────────────────
// Phase 5 of the pipeline: Combine + Validate
//
// Takes: LayoutSpec + GeneratedContent + DesignStyleGuide
// Returns: RenderElement[] (ready for rendering)
//
// Two modes:
//   1. Deterministic (buildLayoutFromSpec) — fast, no API call
//   2. AI-powered (generateAILayout) — creative, calls Claude
//
// Used by useUnifiedAgent.ts in the design pipeline.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';
import type { GeneratedContent } from '@/services/designTemplates';
import type { DesignStyleGuide } from '@/services/designStyleGuides';
import type { LayoutSpec } from '@/services/aiStructureService';

// ── Hex to RGBA helper ──────────────────────────

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16) / 255,
        g: parseInt(h.slice(2, 4), 16) / 255,
        b: parseInt(h.slice(4, 6), 16) / 255,
        a: 1,
    };
}

// ── Deterministic Layout Builder ─────────────────
// Builds RenderElement[] from LayoutSpec without AI.
// This is the primary layout builder — fast and reliable.

export function buildLayoutFromSpec(
    spec: LayoutSpec,
    content: GeneratedContent,
    palette: DesignStyleGuide,
    canvasW: number,
    canvasH: number,
): RenderElement[] {
    const elements: RenderElement[] = [];
    const colors = palette.colors;

    // ── 1. Background (always first) ──
    elements.push({
        type: 'rect',
        name: 'background',
        x: 0, y: 0, w: canvasW, h: canvasH,
        gradient_start_hex: colors.gradientStart,
        gradient_end_hex: colors.gradientEnd,
        gradient_angle: colors.gradientAngle,
    });

    // ── 2. Accent decoration ──
    const accentColor = hexToRgba(colors.accent);
    switch (spec.accentStrategy) {
        case 'top-bar':
            elements.push({
                type: 'rect',
                name: 'accent_bar',
                x: 0, y: 0, w: canvasW, h: Math.round(canvasH * 0.015) + 2,
                ...accentColor,
            });
            break;
        case 'side-bar':
            elements.push({
                type: 'rect',
                name: 'accent_bar',
                x: 0, y: 0, w: Math.round(canvasW * 0.015) + 2, h: canvasH,
                ...accentColor,
            });
            break;
        case 'bottom-line':
            elements.push({
                type: 'rect',
                name: 'accent_line',
                x: Math.round(canvasW * 0.3),
                y: Math.round(canvasH * spec.headlineZone.yPct + canvasH * spec.headlineZone.hPct + canvasH * 0.02),
                w: Math.round(canvasW * 0.4),
                h: 2,
                ...accentColor,
            });
            break;
        case 'circle':
            elements.push({
                type: 'ellipse',
                name: 'accent_circle',
                x: Math.round(canvasW * 0.7),
                y: Math.round(canvasH * 0.05),
                w: Math.round(Math.min(canvasW, canvasH) * 0.25),
                h: Math.round(Math.min(canvasW, canvasH) * 0.25),
                ...accentColor,
                a: 0.2,
            });
            break;
        case 'overlay':
            elements.push({
                type: 'rect',
                name: 'text_overlay',
                x: 0,
                y: Math.round(canvasH * 0.5),
                w: canvasW,
                h: Math.round(canvasH * 0.5),
                r: 0, g: 0, b: 0, a: 0.5,
            });
            break;
        case 'diagonal': {
            // Bold angular accent — two offset bars creating depth
            const dw = Math.round(canvasW * 0.15);
            elements.push({
                type: 'rect',
                name: 'accent_diagonal',
                x: Math.round(canvasW * 0.65),
                y: 0,
                w: dw,
                h: canvasH,
                ...accentColor,
                a: 0.25,
            });
            elements.push({
                type: 'rect',
                name: 'accent_divider',
                x: Math.round(canvasW * 0.65) + dw,
                y: 0,
                w: Math.round(dw * 0.3),
                h: canvasH,
                ...accentColor,
                a: 0.10,
            });
            break;
        }
        case 'none':
        default:
            break;
    }

    // ── 3. Tag/label text (if present) ──
    if (content.tag) {
        const tagW = Math.round(canvasW * spec.headlineZone.wPct);
        let tagX = Math.round(canvasW * spec.headlineZone.xPct);
        // ★ CENTER OVERRIDE: center tag on canvas
        if (spec.alignment === 'center') tagX = Math.round((canvasW - tagW) / 2);
        const tagY = Math.round(canvasH * spec.headlineZone.yPct - canvasH * 0.06);
        elements.push({
            type: 'text',
            name: 'tag_text',
            x: tagX,
            y: Math.max(4, tagY),
            w: tagW,
            h: Math.round(spec.subheadlineFontSize * 1.4),
            content: content.tag.toUpperCase(),
            font_size: Math.round(spec.subheadlineFontSize * 0.85),
            font_weight: '600',
            color_hex: colors.accent,
            text_align: spec.alignment,
            letter_spacing: 2,
        });
    }

    // ── 4. Headline (auto-shrink to fit zone) ──
    const headlineW = Math.round(canvasW * spec.headlineZone.wPct);
    let headlineX = Math.round(canvasW * spec.headlineZone.xPct);
    if (spec.alignment === 'center') headlineX = Math.round((canvasW - headlineW) / 2);
    const headlineY = Math.round(canvasH * spec.headlineZone.yPct);
    const headlineMaxH = Math.round(canvasH * spec.headlineZone.hPct);

    // ★ Auto-shrink: reduce font size until headline fits within zone.
    // 4 lines → shrink font → 3 lines → shrink → 2 lines, etc.
    let headlineFs = spec.headlineFontSize;
    let headlineH: number = 0;
    const MIN_HEADLINE_FS = 16;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const cpl = Math.max(1, Math.floor(headlineW / (headlineFs * 0.55)));
        const explicit = content.headline.split(/\n/).length;
        const wrapped = Math.ceil(content.headline.replace(/\n/g, '').length / cpl);
        const lines = Math.max(explicit, wrapped);
        headlineH = Math.round(headlineFs * 1.45 * lines + 12);
        if (headlineH <= headlineMaxH || headlineFs <= MIN_HEADLINE_FS) break;
        headlineFs -= 2;
    }
    headlineH = Math.min(headlineH, headlineMaxH);

    elements.push({
        type: 'text',
        name: 'headline',
        x: headlineX,
        y: headlineY,
        w: headlineW,
        h: headlineH,
        content: content.headline,
        font_size: headlineFs,
        font_weight: palette.typography.weights.bold,
        color_hex: colors.foreground,
        text_align: spec.alignment,
        letter_spacing: palette.typography.letterSpacing.tight,
    });

    // ── 5. Subheadline (auto-shrink to fit before CTA) ──
    const subW = headlineW;
    let subX = headlineX;
    if (spec.alignment === 'center') subX = Math.round((canvasW - subW) / 2);
    const subY = headlineY + headlineH + 8;

    // Available space: from subY to CTA top (or 80% of canvas)
    const ctaTopY = Math.round(canvasH * spec.ctaZone.yPct);
    const subMaxH = Math.max(30, ctaTopY - subY - 12);

    // ★ Auto-shrink subheadline: reduce font until it fits before CTA
    let subFs = spec.subheadlineFontSize;
    let subH: number = 0;
    const MIN_SUB_FS = 10;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const cpl = Math.max(1, Math.floor(subW / (subFs * 0.5)));
        const explicit = content.subheadline.split(/\n/).length;
        const wrapped = Math.ceil(content.subheadline.replace(/\n/g, '').length / cpl);
        const lines = Math.max(explicit, wrapped);
        subH = Math.round(subFs * 1.4 * lines + 8);
        if (subH <= subMaxH || subFs <= MIN_SUB_FS) break;
        subFs -= 2;
    }
    subH = Math.min(subH, subMaxH);

    elements.push({
        type: 'text',
        name: 'subheadline',
        x: subX,
        y: subY,
        w: subW,
        h: subH,
        content: content.subheadline,
        font_size: subFs,
        font_weight: palette.typography.weights.normal,
        color_hex: colors.secondary,
        text_align: spec.alignment,
    });

    // ── 6. CTA Button ──
    const ctaW = Math.round(canvasW * spec.ctaZone.wPct);
    let ctaX = Math.round(canvasW * spec.ctaZone.xPct);
    // ★ CENTER OVERRIDE: center CTA on canvas
    if (spec.alignment === 'center') ctaX = Math.round((canvasW - ctaW) / 2);
    const ctaY = Math.round(canvasH * spec.ctaZone.yPct);
    const ctaH = Math.round(canvasH * spec.ctaZone.hPct);
    const ctaColor = hexToRgba(colors.accent);

    elements.push({
        type: 'rounded_rect',
        name: 'cta_button',
        x: ctaX,
        y: ctaY,
        w: ctaW,
        h: ctaH,
        ...ctaColor,
        radius: palette.radius,
    });

    // CTA Label (centered on button)
    const ctaFs = Math.max(10, Math.round(Math.min(ctaH * 0.45, spec.subheadlineFontSize)));
    elements.push({
        type: 'text',
        name: 'cta_label',
        x: ctaX,
        y: ctaY + Math.round((ctaH - ctaFs - 4) / 2),
        w: ctaW,
        h: ctaFs + 4,
        content: content.cta.toUpperCase(),
        font_size: ctaFs,
        font_weight: '700',
        color_hex: colors.accentForeground,
        text_align: 'center',
        letter_spacing: 1,
    });

    return elements;
}
