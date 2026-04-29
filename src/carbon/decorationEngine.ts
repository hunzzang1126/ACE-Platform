// ─────────────────────────────────────────────────
// Carbon Decoration Engine — Accent Lines, Dividers, Borders
// ─────────────────────────────────────────────────
// Adds visual polish to Carbon layouts. Each decoration is
// deterministic — no AI involvement. Variant controls which
// decorations appear.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import type { LayoutVariant } from './layoutRules';
import { hexR, hexG, hexB } from './colorHelpers';

// ── Decoration Rules per Variant ─────────────────

interface DecorationSet {
    accentLine: boolean;     // Horizontal line between headline & subheadline
    tagUnderline: boolean;   // Short line under tag text
    topBorder: boolean;      // Thin accent bar at canvas top
    bottomBorder: boolean;   // Thin accent bar at canvas bottom
    cornerDot: boolean;      // Small decorative circle in corner
    gradientOrb: boolean;    // Soft gradient circle as decorative element
    infoBar: boolean;        // Bottom info strip (e.g. "Free Shipping · 30-Day Returns")
    logoPlaceholder: boolean; // Small logo area in corner
}

const DECORATION_MAP: Record<LayoutVariant, DecorationSet> = {
    'centered':        { accentLine: true,  tagUnderline: false, topBorder: false, bottomBorder: false, cornerDot: false, gradientOrb: true,  infoBar: false, logoPlaceholder: true },
    'left-hero':       { accentLine: true,  tagUnderline: true,  topBorder: false, bottomBorder: false, cornerDot: false, gradientOrb: false, infoBar: false, logoPlaceholder: true },
    'offset-right':    { accentLine: true,  tagUnderline: true,  topBorder: false, bottomBorder: false, cornerDot: false, gradientOrb: false, infoBar: false, logoPlaceholder: true },
    'top-heavy':       { accentLine: false, tagUnderline: false, topBorder: true,  bottomBorder: false, cornerDot: false, gradientOrb: true,  infoBar: true,  logoPlaceholder: false },
    'bottom-stack':    { accentLine: false, tagUnderline: false, topBorder: false, bottomBorder: true,  cornerDot: false, gradientOrb: false, infoBar: false, logoPlaceholder: true },
    'split-left':      { accentLine: true,  tagUnderline: false, topBorder: false, bottomBorder: false, cornerDot: true,  gradientOrb: false, infoBar: false, logoPlaceholder: true },
    'minimal-center':  { accentLine: false, tagUnderline: false, topBorder: false, bottomBorder: false, cornerDot: false, gradientOrb: false, infoBar: false, logoPlaceholder: true },
    'bold-statement':  { accentLine: false, tagUnderline: false, topBorder: true,  bottomBorder: true,  cornerDot: false, gradientOrb: false, infoBar: false, logoPlaceholder: false },
    'editorial':       { accentLine: true,  tagUnderline: true,  topBorder: false, bottomBorder: false, cornerDot: false, gradientOrb: true,  infoBar: true,  logoPlaceholder: false },
    'compact-bar':     { accentLine: false, tagUnderline: false, topBorder: false, bottomBorder: false, cornerDot: false, gradientOrb: false, infoBar: false, logoPlaceholder: false },
};

// ── Public API ───────────────────────────────────

/**
 * Generate decoration elements based on the layout variant and content positions.
 * @param variant - Which layout variant to decorate
 * @param elements - Already-positioned content elements (to find gaps)
 * @param accentColor - Hex accent color for decorations
 * @param canvasW - Canvas width
 * @param canvasH - Canvas height
 */
export function buildDecorations(
    variant: LayoutVariant,
    elements: RenderElement[],
    accentColor: string,
    canvasW: number,
    canvasH: number,
): RenderElement[] {
    const rules = DECORATION_MAP[variant] ?? DECORATION_MAP['centered'];
    const decorations: RenderElement[] = [];
    const canvasMin = Math.min(canvasW, canvasH);

    const r = hexR(accentColor);
    const g = hexG(accentColor);
    const b = hexB(accentColor);

    // ── Accent line (between headline and next element) ──
    if (rules.accentLine) {
        const headline = elements.find(el => el.name === 'headline');
        const nextEl = elements.find(el =>
            el.name === 'subheadline' || el.name === 'cta_button'
        );
        if (headline && nextEl) {
            const lineY = Math.round(
                (headline.y! + headline.h!) * 0.5 + nextEl.y! * 0.5
            );
            const lineW = Math.round(canvasMin * 0.12);
            const lineH = Math.max(2, Math.round(canvasMin * 0.006));

            let lineX: number;
            if (headline.x! < canvasW * 0.3) {
                // Left-aligned: line starts at headline x
                lineX = headline.x!;
            } else if (headline.x! > canvasW * 0.5) {
                // Right-aligned: line ends at headline right edge
                lineX = headline.x! + headline.w! - lineW;
            } else {
                // Centered
                lineX = Math.round((canvasW - lineW) / 2);
            }

            decorations.push({
                name: 'accent_line',
                type: 'rect' as any,
                x: lineX, y: lineY, w: lineW, h: lineH,
                r, g, b, a: 0.8,
            });
        }
    }

    // ── Tag underline ──
    if (rules.tagUnderline) {
        const tag = elements.find(el => el.name === 'tag_text');
        if (tag) {
            const ulW = Math.min(tag.w! * 0.6, canvasMin * 0.08);
            const ulH = Math.max(2, Math.round(canvasMin * 0.004));
            const gap = Math.round(canvasMin * 0.01);

            decorations.push({
                name: 'tag_underline',
                type: 'rect' as any,
                x: tag.x!, y: tag.y! + tag.h! + gap,
                w: ulW, h: ulH,
                r, g, b, a: 0.6,
            });
        }
    }

    // ── Top border bar ──
    if (rules.topBorder) {
        const barH = Math.max(3, Math.round(canvasMin * 0.008));
        decorations.push({
            name: 'top_accent_bar',
            type: 'rect' as any,
            x: 0, y: 0, w: canvasW, h: barH,
            r, g, b, a: 0.9,
        });
    }

    // ── Bottom border bar ──
    if (rules.bottomBorder) {
        const barH = Math.max(3, Math.round(canvasMin * 0.008));
        decorations.push({
            name: 'bottom_accent_bar',
            type: 'rect' as any,
            x: 0, y: canvasH - barH, w: canvasW, h: barH,
            r, g, b, a: 0.9,
        });
    }

    // ── Corner dot ──
    if (rules.cornerDot) {
        const dotSize = Math.max(4, Math.round(canvasMin * 0.02));
        const margin = Math.round(canvasMin * 0.04);
        decorations.push({
            name: 'corner_accent',
            type: 'rect' as any,
            x: canvasW - dotSize - margin,
            y: margin,
            w: dotSize, h: dotSize,
            r, g, b, a: 0.5,
            radius: Math.round(dotSize / 2),
        });
    }

    // ── Gradient Orb (soft decorative circle) ──
    if (rules.gradientOrb) {
        const orbSize = Math.round(canvasMin * 0.25);
        // Position in a corner opposite the content
        const orbX = canvasW - orbSize * 0.6;
        const orbY = -orbSize * 0.3;
        decorations.push({
            name: 'deco_gradient_orb',
            type: 'ellipse' as any,
            x: orbX, y: orbY, w: orbSize, h: orbSize,
            r: r * 0.8, g: g * 0.8, b: b * 0.8, a: 0.15,
        });
    }

    // ── Logo Placeholder (small branded area) ──
    if (rules.logoPlaceholder) {
        const logoW = Math.round(canvasMin * 0.12);
        const logoH = Math.round(canvasMin * 0.04);
        const logoMargin = Math.round(canvasMin * 0.04);
        decorations.push({
            name: 'logo_area',
            type: 'rect' as any,
            x: logoMargin, y: logoMargin,
            w: logoW, h: logoH,
            r: 1, g: 1, b: 1, a: 0.15,
            radius: Math.round(logoH / 4),
        });
    }

    // ── Info Bar (bottom strip) ──
    if (rules.infoBar) {
        const barH = Math.round(canvasMin * 0.05);
        const barY = canvasH - barH;
        decorations.push({
            name: 'info_bar',
            type: 'rect' as any,
            x: 0, y: barY, w: canvasW, h: barH,
            r: 0, g: 0, b: 0, a: 0.30,
        });
    }

    return decorations;
}

/** Check if a variant has any decorations enabled */
export function hasDecorations(variant: LayoutVariant): boolean {
    const rules = DECORATION_MAP[variant];
    if (!rules) return false;
    return rules.accentLine || rules.tagUnderline || rules.topBorder
        || rules.bottomBorder || rules.cornerDot || rules.gradientOrb
        || rules.infoBar || rules.logoPlaceholder;
}

/** Get the decoration configuration for a variant */
export function getDecorationRules(variant: LayoutVariant): DecorationSet {
    return DECORATION_MAP[variant] ?? DECORATION_MAP['centered'];
}
