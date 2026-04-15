// ─────────────────────────────────────────────────
// agentColorRecolor — Recolor template elements to match AI palette
// ─────────────────────────────────────────────────
// ★ Fixes: template elements keeping original colors instead of
// adapting to the AI-generated color palette.
// Called after resolveTemplateElements() in agentGenerateFlow.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';

interface ColorGuide {
    colors: {
        gradientStart: string;
        gradientEnd: string;
        accent: string;
        foreground: string;
        accentForeground: string;
        secondary: string;
        tertiary: string;
        background: string;
    };
}

/**
 * Recolor template elements to match the AI-determined palette.
 * ★ Background is decided FIRST by generateColorPalette() —
 * this function ensures all other elements harmonize with that background.
 *
 * Mapping:
 * - background shape → guide colors (gradientStart/End or background)
 * - accent shapes → guide accent color
 * - headline/body text → guide foreground
 * - subheadline → guide secondary
 * - CTA button bg → guide accent
 * - CTA label → guide accentForeground
 * - tag text → guide accentForeground
 *
 * Only recolors elements where we can confidently identify the role.
 * Preserves opacity, position, font, etc.
 */
export function recolorTemplateElements(
    elements: RenderElement[],
    guide: ColorGuide,
): RenderElement[] {
    return elements.map(el => {
        const name = (el.name || '').toLowerCase();
        const copy = { ...el };

        // ── Background ──
        if (name === 'background' || name === 'ai_background') {
            if (copy.gradient_start_hex && copy.gradient_end_hex) {
                copy.gradient_start_hex = guide.colors.gradientStart;
                copy.gradient_end_hex = guide.colors.gradientEnd;
            } else {
                // Solid → make gradient
                copy.gradient_start_hex = guide.colors.gradientStart;
                copy.gradient_end_hex = guide.colors.gradientEnd;
                copy.gradient_angle = copy.gradient_angle ?? 135;
                // Clear solid color so gradient takes effect
                copy.r = undefined; copy.g = undefined; copy.b = undefined;
            }
            return copy;
        }

        // ── Accent shapes (accent_zone, accent_line, overlay, etc.) ──
        if (copy.type !== 'text' && (name.includes('accent') || name.includes('overlay') || name.includes('divider'))) {
            applyHexToRgb(copy, guide.colors.accent);
            return copy;
        }

        // ── CTA button background ──
        if (copy.type !== 'text' && (name.includes('cta') || name.includes('button'))) {
            applyHexToRgb(copy, guide.colors.accent);
            return copy;
        }

        // ── CTA label text ──
        if (copy.type === 'text' && (name.includes('cta') || name.includes('label'))) {
            copy.color_hex = guide.colors.accentForeground;
            return copy;
        }

        // ── Tag text ──
        if (copy.type === 'text' && (name.includes('tag'))) {
            copy.color_hex = guide.colors.accentForeground;
            return copy;
        }

        // ── Headline text ──
        if (copy.type === 'text' && name.includes('headline') && !name.includes('sub')) {
            copy.color_hex = guide.colors.foreground;
            return copy;
        }

        // ── Subheadline text ──
        if (copy.type === 'text' && name.includes('sub')) {
            copy.color_hex = guide.colors.secondary;
            return copy;
        }

        // ── Body/generic text ──
        if (copy.type === 'text') {
            copy.color_hex = guide.colors.foreground;
            return copy;
        }

        // ── Tag badge shapes ──
        if (copy.type !== 'text' && (name.includes('tag') || name.includes('badge'))) {
            applyHexToRgb(copy, guide.colors.accent);
            return copy;
        }

        return copy;
    });
}

function applyHexToRgb(el: RenderElement, hex: string): void {
    const clean = hex.replace('#', '');
    el.r = parseInt(clean.substring(0, 2), 16) / 255;
    el.g = parseInt(clean.substring(2, 4), 16) / 255;
    el.b = parseInt(clean.substring(4, 6), 16) / 255;
}
