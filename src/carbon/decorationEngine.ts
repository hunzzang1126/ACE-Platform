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
            // ★ v717 P3: Subtler accent line — wider but thinner, lower opacity for elegance
            const lineW = Math.round(canvasMin * 0.18);
            const lineH = Math.max(1, Math.round(canvasMin * 0.003));

            let lineX: number;
            if (headline.x! < canvasW * 0.3) {
                lineX = headline.x!;
            } else if (headline.x! > canvasW * 0.5) {
                lineX = headline.x! + headline.w! - lineW;
            } else {
                lineX = Math.round((canvasW - lineW) / 2);
            }

            decorations.push({
                name: 'accent_line',
                type: 'rect' as any,
                x: lineX, y: lineY, w: lineW, h: lineH,
                r, g, b, a: 0.35,
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

    // ── Gradient Orb Mesh (2 soft orbs for ambient glow) ──
    // ★ v717 P3: Dual-orb creates a mesh gradient effect — much richer than single orb
    if (rules.gradientOrb) {
        const orbSize = Math.round(canvasMin * 0.45);
        // Orb 1: top-right (accent color, larger)
        decorations.push({
            name: 'deco_gradient_orb',
            type: 'ellipse' as any,
            x: canvasW - orbSize * 0.5, y: -orbSize * 0.35,
            w: orbSize, h: orbSize,
            r: r * 0.7, g: g * 0.7, b: b * 0.7, a: 0.12,
        });
        // Orb 2: bottom-left (shifted hue, smaller)
        const orb2Size = Math.round(canvasMin * 0.35);
        decorations.push({
            name: 'deco_gradient_orb_2',
            type: 'ellipse' as any,
            x: -orb2Size * 0.3, y: canvasH - orb2Size * 0.65,
            w: orb2Size, h: orb2Size,
            r: r * 0.5, g: g * 0.9, b: b * 1.0, a: 0.10,
        });
    }

    // ── Logo Placeholder — REMOVED in v717 P3 ──
    // Was rendering an empty transparent rect that confused users.
    // Actual brand logo is placed by agentGenerateFlow.ts when brandLogoUrl exists.

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
