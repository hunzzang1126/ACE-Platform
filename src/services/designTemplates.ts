// ─────────────────────────────────────────────────
// designTemplates.ts — 12 Layout Templates
// ─────────────────────────────────────────────────
// Templates define STRUCTURAL LAYOUT only.
// They are canvas-size-adaptive (work at ANY size).
// Colors come from AI-generated ColorPalette.
// Content comes from AI copywriter.
//
// Layout selection is based on:
//   - Aspect ratio category (wide, landscape, square, portrait)
//   - Variety (multiple layouts per category, rotated)
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';
import type { DesignStyleGuide } from '@/services/designStyleGuides';

// ── Types ────────────────────────────────────────

export interface GeneratedContent {
    headline: string;
    subheadline: string;
    cta: string;
    tag: string;
}

export interface DesignTemplate {
    id: string;
    name: string;
    description: string;
    /** Aspect ratio categories this layout works best for */
    aspectRatios: ('wide' | 'landscape' | 'square' | 'portrait' | 'any')[];
    /** Build the element array from template + palette + content */
    build: (canvasW: number, canvasH: number, guide: DesignStyleGuide, content: GeneratedContent) => RenderElement[];
}

// ── Helper: hex→rgb 0-1 ──────────────────────────

function hex(c: string): [number, number, number] {
    const h = c.replace('#', '');
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

// ── Aspect ratio classification ──────────────────

type AspectCategory = 'wide' | 'landscape' | 'square' | 'portrait';

function classifyAspect(w: number, h: number): AspectCategory {
    const ratio = w / h;
    if (ratio > 2.5) return 'wide';
    if (ratio > 1.3) return 'landscape';
    if (ratio >= 0.7) return 'square';
    return 'portrait';
}

// ══════════════════════════════════════════════════
// LAYOUT 1: Centered Stack
// Everything centered vertically, clean and balanced
// ══════════════════════════════════════════════════

const centeredStack: DesignTemplate = {
    id: 'centered-stack',
    name: 'Centered Stack',
    description: 'All content centered vertically — clean, balanced, professional',
    aspectRatios: ['landscape', 'square', 'portrait', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.08);
        const headFs = Math.max(16, Math.min(48, Math.round(Math.min(W, H) * 0.12)));
        const subFs = Math.max(10, Math.round(headFs * 0.4));
        const tagFs = Math.max(8, Math.round(headFs * 0.3));
        const ctaFs = Math.max(10, Math.round(headFs * 0.35));
        const ctaW = Math.min(Math.round(W * 0.45), 200);
        const ctaH = Math.round(ctaFs * 2.8);

        // Vertical centering waterfall
        const totalH = tagFs + 8 + headFs * 2 + 8 + subFs * 2 + 16 + ctaH;
        const startY = Math.max(pad, Math.round((H - totalH) / 2));
        let y = startY;

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },

            { type: 'text', name: 'tag_text', x: pad, y, w: W - 2 * pad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'center', letter_spacing: 3 },

            (y += tagFs + 10, { type: 'text', name: 'headline', x: pad, y, w: W - 2 * pad, h: headFs * 2.2,
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'center', letter_spacing: -0.5, line_height: 1.1 }),

            (y += headFs * 2 + 8, { type: 'text', name: 'subheadline', x: pad, y, w: W - 2 * pad, h: subFs * 2.5,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'center', line_height: 1.45 }),

            (y += subFs * 2 + 16, { type: 'rounded_rect', name: 'cta_button',
              x: Math.round((W - ctaW) / 2), y, w: ctaW, h: ctaH,
              r: ar, g: ag, b: ab, a: 1.0, radius: g.radius }),
            { type: 'text', name: 'cta_label',
              x: Math.round((W - ctaW) / 2), y: y + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },

            { type: 'rect', name: 'bottom_accent', x: Math.round(W * 0.35), y: H - 3, w: Math.round(W * 0.3), h: 3,
              r: ar, g: ag, b: ab, a: 0.3 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 2: Left-Aligned Card
// Content left-aligned, accent zone top, professional
// ══════════════════════════════════════════════════

const leftAlignedCard: DesignTemplate = {
    id: 'left-aligned-card',
    name: 'Left-Aligned Card',
    description: 'Content left-aligned with accent bar — corporate, structured',
    aspectRatios: ['landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const pad = Math.round(W * 0.08);
        const [ar, ag, ab] = hex(g.colors.accent);
        const headFs = Math.max(16, Math.min(36, Math.round(Math.min(W, H) * 0.13)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const tagFs = Math.max(8, Math.round(headFs * 0.3));
        const ctaFs = Math.max(10, Math.round(headFs * 0.35));
        const ctaH = Math.round(ctaFs * 2.8);
        const ctaW = Math.round(W * 0.42);

        let y = pad;
        const accentZoneH = Math.round(H * 0.15);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },
            { type: 'rect', name: 'accent_zone', x: 0, y: 0, w: W, h: accentZoneH,
              r: hex(g.colors.surface)[0], g: hex(g.colors.surface)[1], b: hex(g.colors.surface)[2], a: 0.4 },
            { type: 'rect', name: 'accent_line', x: pad, y: accentZoneH, w: Math.round(W * 0.13), h: 2,
              r: ar, g: ag, b: ab, a: 1.0 },

            { type: 'text', name: 'tag_text', x: pad, y, w: W - 2 * pad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },

            (y = accentZoneH + 8, { type: 'text', name: 'headline', x: pad, y,
              w: W - 2 * pad, h: headFs * 2.2,
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.1 }),

            (y += headFs * 2 + 6, { type: 'text', name: 'subheadline', x: pad, y,
              w: Math.round(W * 0.82), h: subFs * 2.5,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.45 }),

            { type: 'rounded_rect', name: 'cta_button', x: pad, y: H - pad - ctaH,
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius,
              shadow_offset_x: 2, shadow_offset_y: 4, shadow_blur: 10, shadow_opacity: 0.25 },
            { type: 'text', name: 'cta_label', x: pad, y: H - pad - ctaH + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },

            { type: 'rect', name: 'bottom_border', x: 0, y: H - 3, w: W, h: 3,
              r: ar, g: ag, b: ab, a: 0.25 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 3: Bold Headline
// Giant headline dominates, minimal supporting elements
// Best for: Nike, sports, high-impact messaging
// ══════════════════════════════════════════════════

const boldHeadline: DesignTemplate = {
    id: 'bold-headline',
    name: 'Bold Headline',
    description: 'Giant headline dominates — high-impact, Nike-style',
    aspectRatios: ['landscape', 'square', 'portrait', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.06);
        // Headline takes up 30-40% of canvas height
        const headFs = Math.max(24, Math.min(80, Math.round(H * 0.22)));
        const subFs = Math.max(10, Math.round(headFs * 0.28));
        const tagFs = Math.max(8, Math.round(headFs * 0.22));
        const ctaFs = Math.max(10, Math.round(headFs * 0.25));
        const ctaW = Math.min(Math.round(W * 0.35), 180);
        const ctaH = Math.round(ctaFs * 2.8);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },

            // Large accent shape behind headline
            { type: 'rect', name: 'accent_block', x: 0, y: Math.round(H * 0.25), w: W, h: Math.round(H * 0.45),
              r: ar, g: ag, b: ab, a: 0.04 },

            { type: 'text', name: 'tag_text', x: pad, y: pad, w: W - 2 * pad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 4 },

            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.25),
              w: W - 2 * pad, h: headFs * 2.5,
              content: c.headline, font_size: headFs, font_weight: '900',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -1.5, line_height: 0.95 },

            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.65),
              w: Math.round(W * 0.7), h: subFs * 2,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.4 },

            { type: 'rounded_rect', name: 'cta_button', x: pad, y: Math.round(H * 0.82),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: 0 },
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.82) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 2 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 4: Split Horizontal
// Left side = image zone, Right side = content
// Best for: product ads, e-commerce
// ══════════════════════════════════════════════════

const splitHorizontal: DesignTemplate = {
    id: 'split-horizontal',
    name: 'Split Horizontal',
    description: 'Left zone for image, right zone for content — product-focused',
    aspectRatios: ['landscape', 'square', 'wide'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const splitX = Math.round(W * 0.42);
        const rightPad = Math.round((W - splitX) * 0.1);
        const headFs = Math.max(14, Math.min(32, Math.round((W - splitX) * 0.12)));
        const subFs = Math.max(10, Math.round(headFs * 0.45));
        const tagFs = Math.max(8, Math.round(headFs * 0.3));
        const ctaFs = Math.max(9, Math.round(headFs * 0.35));
        const ctaW = Math.round((W - splitX) * 0.6);
        const ctaH = Math.round(ctaFs * 2.6);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 90 },

            // Left: image zone (accent-tinted block)
            { type: 'rect', name: 'image_zone', x: 0, y: 0, w: splitX, h: H,
              r: ar, g: ag, b: ab, a: 0.08 },
            { type: 'text', name: 'zone_label', x: Math.round(splitX * 0.15), y: Math.round(H * 0.4),
              w: Math.round(splitX * 0.7), h: 20,
              content: 'PRODUCT IMAGE', font_size: Math.max(9, Math.round(splitX * 0.06)), font_weight: '500',
              color_hex: g.colors.muted, text_align: 'center', letter_spacing: 3 },

            // Right: content
            { type: 'text', name: 'tag_text', x: splitX + rightPad, y: Math.round(H * 0.12),
              w: W - splitX - 2 * rightPad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },

            { type: 'text', name: 'headline', x: splitX + rightPad, y: Math.round(H * 0.24),
              w: W - splitX - 2 * rightPad, h: headFs * 2.5,
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.1 },

            { type: 'text', name: 'subheadline', x: splitX + rightPad, y: Math.round(H * 0.52),
              w: W - splitX - 2 * rightPad, h: subFs * 3,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.4 },

            { type: 'rounded_rect', name: 'cta_button', x: splitX + rightPad, y: Math.round(H * 0.78),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius },
            { type: 'text', name: 'cta_label', x: splitX + rightPad, y: Math.round(H * 0.78) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1 },

            // Vertical divider between zones
            { type: 'rect', name: 'divider', x: splitX, y: Math.round(H * 0.1),
              w: 1, h: Math.round(H * 0.8),
              r: ar, g: ag, b: ab, a: 0.15 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 5: Diagonal Split
// Angled divider, two-tone background — modern, techy
// ══════════════════════════════════════════════════

const diagonalSplit: DesignTemplate = {
    id: 'diagonal-split',
    name: 'Diagonal Split',
    description: 'Angled accent zone — modern, tech-forward',
    aspectRatios: ['landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.08);
        const headFs = Math.max(16, Math.min(40, Math.round(Math.min(W, H) * 0.14)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const tagFs = Math.max(8, Math.round(headFs * 0.28));
        const ctaFs = Math.max(10, Math.round(headFs * 0.32));
        const ctaW = Math.min(Math.round(W * 0.38), 160);
        const ctaH = Math.round(ctaFs * 2.6);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 135 },

            // Diagonal accent zone (approximated with rotated rect — large tilted block)
            { type: 'rect', name: 'diagonal_accent', x: Math.round(W * 0.5), y: -Math.round(H * 0.2),
              w: Math.round(W * 0.7), h: Math.round(H * 1.4),
              r: ar, g: ag, b: ab, a: 0.04 },

            // Top line accent
            { type: 'rect', name: 'top_accent', x: 0, y: 0, w: Math.round(W * 0.25), h: 3,
              r: ar, g: ag, b: ab, a: 1.0 },

            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.1), w: W - 2 * pad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 4 },

            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.22),
              w: Math.round(W * 0.65), h: headFs * 2.5,
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.05 },

            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.58),
              w: Math.round(W * 0.55), h: subFs * 2.5,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.4 },

            { type: 'rounded_rect', name: 'cta_button', x: pad, y: Math.round(H * 0.8),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius },
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.8) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 6: Top-Down Cascade
// Flowing cascade with offset elements
// Best for: events, creative campaigns
// ══════════════════════════════════════════════════

const topDownCascade: DesignTemplate = {
    id: 'top-down-cascade',
    name: 'Top-Down Cascade',
    description: 'Flowing content cascade with offsets — events, campaigns',
    aspectRatios: ['portrait', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(W * 0.08);
        const headFs = Math.max(18, Math.min(42, Math.round(Math.min(W, H) * 0.12)));
        const subFs = Math.max(10, Math.round(headFs * 0.4));
        const tagFs = Math.max(8, Math.round(headFs * 0.28));
        const ctaFs = Math.max(10, Math.round(headFs * 0.32));
        const ctaW = Math.round(W * 0.5);
        const ctaH = Math.round(ctaFs * 2.8);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },

            // Accent bar top
            { type: 'rect', name: 'accent_bar', x: 0, y: 0, w: W, h: Math.round(H * 0.04),
              r: ar, g: ag, b: ab, a: 1.0 },

            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.08), w: W - 2 * pad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },

            // Offset headline (slightly indented for cascade feel)
            { type: 'text', name: 'headline', x: pad + Math.round(W * 0.04), y: Math.round(H * 0.18),
              w: W - 2 * pad - Math.round(W * 0.04), h: headFs * 2.8,
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.05 },

            // Decorative line
            { type: 'rect', name: 'cascade_line', x: pad, y: Math.round(H * 0.45),
              w: Math.round(W * 0.2), h: 2,
              r: ar, g: ag, b: ab, a: 0.4 },

            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.5),
              w: Math.round(W * 0.8), h: subFs * 3,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.5 },

            { type: 'rounded_rect', name: 'cta_button',
              x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.78),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: Math.round(ctaH / 2) },
            { type: 'text', name: 'cta_label',
              x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.78) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 7: Right-Aligned
// Text right-aligned, accent left edge — editorial
// ══════════════════════════════════════════════════

const rightAligned: DesignTemplate = {
    id: 'right-aligned',
    name: 'Right-Aligned',
    description: 'Content right-aligned — editorial, luxury feel',
    aspectRatios: ['landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(W * 0.08);
        const headFs = Math.max(16, Math.min(38, Math.round(Math.min(W, H) * 0.13)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const tagFs = Math.max(8, Math.round(headFs * 0.28));
        const ctaFs = Math.max(10, Math.round(headFs * 0.32));
        const ctaW = Math.round(W * 0.38);
        const ctaH = Math.round(ctaFs * 2.6);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },

            // Left accent bar
            { type: 'rect', name: 'left_accent', x: 0, y: 0, w: 4, h: H,
              r: ar, g: ag, b: ab, a: 0.6 },

            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.1), w: W - 2 * pad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'right', letter_spacing: 3 },

            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.22),
              w: W - 2 * pad, h: headFs * 2.5,
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'right', letter_spacing: -0.5, line_height: 1.1 },

            { type: 'text', name: 'subheadline', x: Math.round(W * 0.3), y: Math.round(H * 0.55),
              w: W - Math.round(W * 0.3) - pad, h: subFs * 2.5,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'right', line_height: 1.4 },

            { type: 'rounded_rect', name: 'cta_button', x: W - pad - ctaW, y: Math.round(H * 0.78),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius },
            { type: 'text', name: 'cta_label', x: W - pad - ctaW, y: Math.round(H * 0.78) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 8: Minimal Clean
// Tons of whitespace, small refined text — Apple-style
// ══════════════════════════════════════════════════

const minimalClean: DesignTemplate = {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    description: 'Maximum whitespace, restrained typography — Apple-style premium',
    aspectRatios: ['landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.12); // Extra large padding
        const headFs = Math.max(14, Math.min(32, Math.round(Math.min(W, H) * 0.1)));
        const subFs = Math.max(9, Math.round(headFs * 0.42));
        const tagFs = Math.max(7, Math.round(headFs * 0.28));
        const ctaFs = Math.max(9, Math.round(headFs * 0.3));

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },

            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.15), w: W - 2 * pad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '500',
              color_hex: g.colors.tertiary, text_align: 'center', letter_spacing: 5 },

            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.35),
              w: W - 2 * pad, h: headFs * 2,
              content: c.headline, font_size: headFs, font_weight: '300',
              color_hex: g.colors.foreground, text_align: 'center', letter_spacing: 0.5, line_height: 1.3 },

            { type: 'text', name: 'subheadline', x: Math.round(W * 0.15), y: Math.round(H * 0.58),
              w: Math.round(W * 0.7), h: subFs * 2,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'center', line_height: 1.5 },

            // Text-only CTA (no button bg) — minimal style
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.78),
              w: W - 2 * pad, h: ctaFs + 4,
              content: c.cta + ' >', font_size: ctaFs, font_weight: '500',
              color_hex: g.colors.accent, text_align: 'center', letter_spacing: 1 },

            // Thin bottom line
            { type: 'rect', name: 'bottom_line', x: Math.round(W * 0.4), y: H - 1, w: Math.round(W * 0.2), h: 1,
              r: ar, g: ag, b: ab, a: 0.2 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 9: Full Bleed Hero
// Full background emphasis, text overlay at bottom
// Best for: travel, lifestyle, imagery
// ══════════════════════════════════════════════════

const fullBleedHero: DesignTemplate = {
    id: 'full-bleed-hero',
    name: 'Full Bleed Hero',
    description: 'Hero background with text overlay — travel, lifestyle',
    aspectRatios: ['landscape', 'square', 'portrait', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.07);
        const headFs = Math.max(18, Math.min(44, Math.round(Math.min(W, H) * 0.14)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const ctaFs = Math.max(10, Math.round(headFs * 0.3));
        const ctaW = Math.min(Math.round(W * 0.4), 180);
        const ctaH = Math.round(ctaFs * 2.6);

        return [
            // Full bleed background
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.accent, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 160 },

            // Dark overlay at bottom for text readability
            { type: 'rect', name: 'text_overlay', x: 0, y: Math.round(H * 0.5), w: W, h: Math.round(H * 0.5),
              gradient_start_hex: 'rgba(0,0,0,0)', gradient_end_hex: '#000000', gradient_angle: 180,
              r: 0, g: 0, b: 0, a: 0.6 },

            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.55),
              w: W - 2 * pad, h: headFs * 2.5,
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: '#ffffff', text_align: 'left', letter_spacing: -0.5, line_height: 1.05 },

            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.76),
              w: Math.round(W * 0.7), h: subFs * 2,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: '#cccccc', text_align: 'left', line_height: 1.4 },

            { type: 'rounded_rect', name: 'cta_button', x: pad, y: Math.round(H * 0.88),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius },
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.88) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 10: Badge Focus
// Central badge/stamp, circular accent — promos
// ══════════════════════════════════════════════════

const badgeFocus: DesignTemplate = {
    id: 'badge-focus',
    name: 'Badge Focus',
    description: 'Central badge with circular accent — sales, promotional',
    aspectRatios: ['square', 'landscape', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.06);
        const headFs = Math.max(16, Math.min(36, Math.round(Math.min(W, H) * 0.12)));
        const subFs = Math.max(10, Math.round(headFs * 0.4));
        const tagFs = Math.max(12, Math.round(headFs * 0.5));
        const ctaFs = Math.max(10, Math.round(headFs * 0.32));
        const ctaW = Math.min(Math.round(W * 0.4), 160);
        const ctaH = Math.round(ctaFs * 2.6);

        const badgeSize = Math.round(Math.min(W, H) * 0.35);
        const badgeX = Math.round((W - badgeSize) / 2);
        const badgeY = Math.round(H * 0.08);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },

            // Central badge circle
            { type: 'ellipse', name: 'badge_circle', x: badgeX, y: badgeY,
              w: badgeSize, h: badgeSize, r: ar, g: ag, b: ab, a: 0.12 },
            { type: 'ellipse', name: 'badge_inner', x: badgeX + Math.round(badgeSize * 0.08), y: badgeY + Math.round(badgeSize * 0.08),
              w: Math.round(badgeSize * 0.84), h: Math.round(badgeSize * 0.84), r: ar, g: ag, b: ab, a: 0.08 },

            // Tag inside badge area
            { type: 'text', name: 'tag_text', x: pad, y: badgeY + Math.round(badgeSize * 0.3),
              w: W - 2 * pad, h: tagFs + 4,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '800',
              color_hex: g.colors.accent, text_align: 'center', letter_spacing: 4 },

            // Headline below badge
            { type: 'text', name: 'headline', x: pad, y: badgeY + badgeSize + Math.round(H * 0.04),
              w: W - 2 * pad, h: headFs * 2.2,
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'center', letter_spacing: -0.3, line_height: 1.1 },

            { type: 'text', name: 'subheadline', x: pad, y: badgeY + badgeSize + headFs * 2 + Math.round(H * 0.06),
              w: W - 2 * pad, h: subFs * 2,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'center', line_height: 1.4 },

            { type: 'rounded_rect', name: 'cta_button',
              x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.82),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: Math.round(ctaH / 2) },
            { type: 'text', name: 'cta_label',
              x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.82) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 11: Horizontal Strip (for wide/leaderboard)
// Horizontal flow: tag | headline | cta
// ══════════════════════════════════════════════════

const horizontalStrip: DesignTemplate = {
    id: 'horizontal-strip',
    name: 'Horizontal Strip',
    description: 'Horizontal flow for leaderboard/banner — content left, CTA right',
    aspectRatios: ['wide'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const padX = Math.round(W * 0.03);
        const headFs = Math.max(14, Math.round(H * 0.3));
        const subFs = Math.max(10, Math.round(H * 0.16));
        const ctaFs = Math.max(10, Math.round(H * 0.16));
        const ctaW = Math.round(W * 0.18);
        const ctaH = Math.round(H * 0.5);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 90 },
            { type: 'rect', name: 'accent_line', x: 0, y: 0, w: W, h: 2,
              r: ar, g: ag, b: ab, a: 0.8 },

            { type: 'text', name: 'headline', x: padX, y: Math.round(H * 0.18),
              w: Math.round(W * 0.52), h: Math.round(headFs * 1.3),
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5 },
            { type: 'text', name: 'subheadline', x: padX, y: Math.round(H * 0.58),
              w: Math.round(W * 0.52), h: Math.round(subFs * 1.3),
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left' },

            { type: 'rounded_rect', name: 'cta_button',
              x: W - padX - ctaW, y: Math.round((H - ctaH) / 2),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: 0 },
            { type: 'text', name: 'cta_label',
              x: W - padX - ctaW, y: Math.round((H - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },

            { type: 'rect', name: 'divider', x: W - padX - ctaW - Math.round(W * 0.03), y: Math.round(H * 0.22),
              w: 1, h: Math.round(H * 0.56), r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
        ];
    },
};

// ══════════════════════════════════════════════════
// LAYOUT 12: Tower (for portrait/skyscraper)
// Vertical stack, center-aligned, generous spacing
// ══════════════════════════════════════════════════

const tower: DesignTemplate = {
    id: 'tower',
    name: 'Tower',
    description: 'Vertical tower with center-aligned stack — for portrait sizes',
    aspectRatios: ['portrait'],
    build: (W, H, g, c) => {
        const padX = Math.round(W * 0.1);
        const [ar, ag, ab] = hex(g.colors.accent);
        const headFs = Math.max(16, Math.round(W * 0.16));
        const subFs = Math.max(10, Math.round(W * 0.08));
        const tagFs = Math.max(8, Math.round(W * 0.06));
        const ctaFs = Math.max(10, Math.round(W * 0.07));
        const ctaW = W - 2 * padX;
        const ctaH = Math.round(H * 0.06);

        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },
            { type: 'rect', name: 'accent_line', x: 0, y: 0, w: W, h: 4,
              r: ar, g: ag, b: ab, a: 1.0 },

            { type: 'text', name: 'tag_text', x: padX, y: Math.round(H * 0.06), w: W - 2 * padX, h: tagFs + 6,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'center', letter_spacing: 2 },

            { type: 'text', name: 'headline', x: padX, y: Math.round(H * 0.15),
              w: W - 2 * padX, h: headFs * 3.5,
              content: c.headline, font_size: headFs, font_weight: '700',
              color_hex: g.colors.foreground, text_align: 'center', letter_spacing: -0.3, line_height: 1.1 },

            { type: 'text', name: 'subheadline', x: padX, y: Math.round(H * 0.38),
              w: W - 2 * padX, h: subFs * 5,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'center', line_height: 1.5 },

            { type: 'rounded_rect', name: 'cta_button', x: padX, y: H - Math.round(H * 0.12) - ctaH,
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: 8 },
            { type: 'text', name: 'cta_label', x: padX, y: H - Math.round(H * 0.12) - ctaH + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '600',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },

            { type: 'ellipse', name: 'decorative_dot', x: W - padX - 20, y: Math.round(H * 0.55),
              w: 40, h: 40, r: ar, g: ag, b: ab, a: 0.05 },
        ];
    },
};

// ── All Templates ────────────────────────────────

export const DESIGN_TEMPLATES: DesignTemplate[] = [
    centeredStack,
    leftAlignedCard,
    boldHeadline,
    splitHorizontal,
    diagonalSplit,
    topDownCascade,
    rightAligned,
    minimalClean,
    fullBleedHero,
    badgeFocus,
    horizontalStrip,
    tower,
];

/**
 * Select a layout template for the canvas.
 * Uses aspect ratio to filter compatible layouts, then picks one
 * with variety (different from last used).
 */
let lastTemplateIdx = -1;

export function selectTemplate(canvasW: number, canvasH: number): DesignTemplate | null {
    const aspect = classifyAspect(canvasW, canvasH);

    // Filter templates compatible with this aspect ratio
    const compatible = DESIGN_TEMPLATES.filter(t =>
        t.aspectRatios.includes(aspect) || t.aspectRatios.includes('any')
    );

    if (compatible.length === 0) return DESIGN_TEMPLATES[0] ?? null; // fallback

    // Rotate through templates for variety
    lastTemplateIdx = (lastTemplateIdx + 1) % compatible.length;
    return compatible[lastTemplateIdx]!;
}

/**
 * Build the content-only prompt for the AI.
 */
export function buildContentPrompt(userPrompt: string, canvasW: number, canvasH: number, templateName: string): string {
    const isWide = canvasW > canvasH * 2;
    const isTall = canvasH > canvasW * 2;
    const isSmall = canvasW < 200 || canvasH < 200;

    const headlineLimit = isWide ? '3-5 words, single line' : isTall ? '2-4 words per line, 2-3 lines' : '2-5 words per line, 1-2 lines';
    const subLimit = isSmall ? '1 short sentence (max 8 words)' : '1-2 sentences (max 15 words total)';

    return `You are a world-class copywriter. Generate ad copy for this creative:

Template: ${templateName} (${canvasW}x${canvasH}px)
Brief: "${userPrompt}"

Generate EXACTLY this JSON object:
{
  "headline": "${headlineLimit}. Bold, impactful, no period at end",
  "subheadline": "${subLimit}. Supporting the headline, professional tone. If the headline is already clear and the canvas is small, set to empty string.",
  "cta": "1-3 word action verb. Examples: Learn More, Get Started, Shop Now, Try Free",
  "tag": "1-2 word category label. Examples: NEW, PREMIUM, LIMITED, 2026"
}

Rules:
- Write real, professional ad copy — no lorem ipsum
- Headline should be the star — punchy, memorable
- CTA must be a clear call to action  
- Tag is a tiny category marker, always uppercase
- All text must be in English
- IMPORTANT: If the headline already conveys the full message (e.g. "SUMMER SALE 40% OFF"), the subheadline is OPTIONAL — set it to "" (empty string) to keep the layout clean
- ${isSmall ? 'This canvas is very SMALL — subheadline should be empty "" to avoid crowding' : 'Only include subheadline if it adds genuine value'}
- Return ONLY the JSON object, no explanation`;
}
