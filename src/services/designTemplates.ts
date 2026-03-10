// ─────────────────────────────────────────────────
// designTemplates.ts — Professional Layout Templates
// ─────────────────────────────────────────────────
// Templates define EXACT element positions for each canvas format.
// The AI's job is ONLY to generate content copy.
// Template + Style Guide + AI Copy = professional output.
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
    /** Canvas size range this template targets */
    matchCriteria: {
        minW: number; maxW: number;
        minH: number; maxH: number;
    };
    /** Build the element array from template + guide + content */
    build: (canvasW: number, canvasH: number, guide: DesignStyleGuide, content: GeneratedContent) => RenderElement[];
}

// ── Helper: hex→rgb 0-1 ──────────────────────────

function hex(c: string): [number, number, number] {
    const h = c.replace('#', '');
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

// ══════════════════════════════════════════════════
// TEMPLATE 1: Medium Rectangle (280-320 × 230-260)
// Card-style with left-aligned content, gold accent line
// ══════════════════════════════════════════════════

const mediumRect: DesignTemplate = {
    id: 'medium-rect',
    name: 'Medium Rectangle Card',
    description: 'Card-style 300x250 with left-aligned content hierarchy',
    matchCriteria: { minW: 250, maxW: 340, minH: 200, maxH: 280 },
    build: (W, H, g, c) => {
        const pad = Math.round(W * 0.08); // ~24px at 300w
        const [ar, ag, ab] = hex(g.colors.accent);

        // ── Font sizes (capped to prevent overflow) ──
        const tagFs = Math.max(9, Math.round(H * 0.04));
        const headlineFs = Math.max(22, Math.min(34, Math.round(H * 0.13)));
        const subFs = Math.max(10, Math.round(H * 0.045));
        const ctaFs = Math.max(10, Math.round(H * 0.045));
        const ctaH = Math.round(H * 0.14);
        const ctaW = Math.round(W * 0.42);

        // ── Layout waterfall: each Y depends on previous bottom ──
        // Tag
        const tagY = pad;
        const tagH = Math.round(tagFs * 1.4);

        // Accent zone (covers tag area)
        const accentZoneH = tagY + tagH + Math.round(H * 0.04);

        // Accent line (right below accent zone)
        const accentLineY = accentZoneH;

        // Headline (starts below accent line with gap)
        const headlineY = accentLineY + 8;
        // Estimate headline height: single line if short, 2 lines if long
        const headlineLines = c.headline.length > 15 ? 2 : 1;
        const headlineH = Math.round(headlineFs * 1.15 * headlineLines);

        // Subheadline (starts after headline)
        const subY = headlineY + headlineH + 6;
        const subH = Math.round(subFs * 1.5) * 2; // up to 2 lines

        // CTA (anchored to bottom)
        const ctaY = H - pad - ctaH;

        return [
            // STRUCTURE
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },
            { type: 'rect', name: 'accent_zone', x: 0, y: 0, w: W, h: accentZoneH,
              r: hex(g.colors.surface)[0], g: hex(g.colors.surface)[1], b: hex(g.colors.surface)[2], a: 0.4 },
            { type: 'rect', name: 'accent_line', x: pad, y: accentLineY,
              w: Math.round(W * 0.13), h: 2, r: ar, g: ag, b: ab, a: 1.0 },

            // CONTENT
            { type: 'text', name: 'tag_text', x: pad, y: tagY, w: W - 2 * pad, h: tagH,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },
            { type: 'text', name: 'headline', x: pad, y: headlineY,
              w: W - 2 * pad, h: headlineH,
              content: c.headline, font_size: headlineFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.1 },
            { type: 'text', name: 'subheadline', x: pad, y: subY,
              w: Math.round(W * 0.82), h: subH,
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.45 },

            // ACTION
            { type: 'rounded_rect', name: 'cta_button', x: pad, y: ctaY,
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius,
              shadow_offset_x: 2, shadow_offset_y: 4, shadow_blur: 10, shadow_opacity: 0.25 },
            { type: 'text', name: 'cta_label', x: pad, y: ctaY + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },

            // POLISH (decorative circle in top-right, away from content)
            { type: 'ellipse', name: 'decorative_circle', x: W - 50, y: -10,
              w: 60, h: 60, r: ar, g: ag, b: ab, a: 0.06 },
            { type: 'rect', name: 'bottom_border', x: 0, y: H - 3, w: W, h: 3,
              r: ar, g: ag, b: ab, a: 0.25 },
        ];
    },
};

// ══════════════════════════════════════════════════
// TEMPLATE 2: Leaderboard (700-800 × 80-100)
// Horizontal flow: content left, CTA right
// ══════════════════════════════════════════════════

const leaderboard: DesignTemplate = {
    id: 'leaderboard',
    name: 'Leaderboard Horizontal',
    description: 'Horizontal strip with content left, CTA right',
    matchCriteria: { minW: 650, maxW: 800, minH: 60, maxH: 110 },
    build: (W, H, g, c) => {
        const padX = Math.round(W * 0.033);
        const [ar, ag, ab] = hex(g.colors.accent);
        const headFs = Math.max(18, Math.round(H * 0.28));
        const subFs = Math.max(11, Math.round(H * 0.15));
        const ctaFs = Math.max(10, Math.round(H * 0.14));
        const ctaW = Math.round(W * 0.18);
        const ctaH = Math.round(H * 0.48);
        const ctaX = W - padX - ctaW;

        return [
            // STRUCTURE
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 90 },
            { type: 'rect', name: 'accent_line', x: 0, y: 0, w: W, h: 2,
              r: ar, g: ag, b: ab, a: 0.8 },

            // CONTENT
            { type: 'text', name: 'headline', x: padX, y: Math.round(H * 0.18),
              w: Math.round(W * 0.55), h: Math.round(headFs * 1.3),
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5 },
            { type: 'text', name: 'subheadline', x: padX, y: Math.round(H * 0.58),
              w: Math.round(W * 0.55), h: Math.round(subFs * 1.3),
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left' },

            // ACTION
            { type: 'rounded_rect', name: 'cta_button', x: ctaX, y: Math.round((H - ctaH) / 2),
              w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: 0 },
            { type: 'text', name: 'cta_label', x: ctaX, y: Math.round((H - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },

            // POLISH
            { type: 'rect', name: 'divider', x: ctaX - Math.round(W * 0.03), y: Math.round(H * 0.22),
              w: 1, h: Math.round(H * 0.56), r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
        ];
    },
};

// ══════════════════════════════════════════════════
// TEMPLATE 3: Social Square (960-1200 × 960-1200)
// Center-dominant, dramatic typography
// ══════════════════════════════════════════════════

const socialSquare: DesignTemplate = {
    id: 'social-square',
    name: 'Social Square',
    description: 'Center-dominant social post with dramatic typography',
    matchCriteria: { minW: 800, maxW: 1200, minH: 800, maxH: 1200 },
    build: (W, H, g, c) => {
        const pad = Math.round(W * 0.074);
        const [ar, ag2, ab] = hex(g.colors.accent);
        const headFs = Math.max(48, Math.min(120, Math.round(W * 0.1)));
        const subFs = Math.max(16, Math.round(W * 0.02));
        const tagFs = Math.max(12, Math.round(W * 0.013));
        const ctaFs = Math.max(14, Math.round(W * 0.014));
        const ctaW = Math.round(W * 0.2);
        const ctaH = Math.round(H * 0.05);

        return [
            // STRUCTURE
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },
            { type: 'rect', name: 'accent_zone', x: 0, y: 0, w: W, h: Math.round(H * 0.4),
              r: hex(g.colors.accent)[0], g: hex(g.colors.accent)[1], b: hex(g.colors.accent)[2], a: 0.05 },

            // CONTENT
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.074), w: W - 2 * pad, h: Math.round(tagFs * 1.5),
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 4 },
            { type: 'rect', name: 'tag_underline', x: pad, y: Math.round(H * 0.1), w: 32, h: 2,
              r: ar, g: ag2, b: ab, a: 0.5 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.17), w: W - 2 * pad, h: Math.round(headFs * 2.2),
              content: c.headline, font_size: headFs, font_weight: '700',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -2, line_height: 1.0 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.42), w: Math.round(W * 0.6), h: Math.round(subFs * 3),
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.5 },

            // ACTION
            { type: 'rounded_rect', name: 'cta_button', x: pad, y: Math.round(H * 0.52),
              w: ctaW, h: ctaH, r: ar, g: ag2, b: ab, a: 1.0, radius: Math.round(ctaH * 0.18),
              shadow_offset_x: 3, shadow_offset_y: 5, shadow_blur: 12, shadow_opacity: 0.2 },
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.52) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '600',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 2 },

            // POLISH
            { type: 'ellipse', name: 'decorative_circle', x: Math.round(W * 0.7), y: Math.round(H * 0.65),
              w: Math.round(W * 0.28), h: Math.round(W * 0.28),
              r: ar, g: ag2, b: ab, a: 0.04 },
            { type: 'rect', name: 'bottom_accent', x: 0, y: H - 8, w: W, h: 8,
              r: ar, g: ag2, b: ab, a: 0.15 },
        ];
    },
};

// ══════════════════════════════════════════════════
// TEMPLATE 4: Skyscraper (140-180 × 560-640)
// Vertical stack, center-aligned, generous spacing
// ══════════════════════════════════════════════════

const skyscraper: DesignTemplate = {
    id: 'skyscraper',
    name: 'Skyscraper Vertical',
    description: 'Vertical tower with center-aligned content stack',
    matchCriteria: { minW: 120, maxW: 200, minH: 500, maxH: 700 },
    build: (W, H, g, c) => {
        const padX = Math.round(W * 0.1);
        const [ar, ag2, ab] = hex(g.colors.accent);
        const headFs = Math.max(20, Math.round(W * 0.16));
        const subFs = Math.max(11, Math.round(W * 0.08));
        const tagFs = Math.max(9, Math.round(W * 0.06));
        const ctaFs = Math.max(10, Math.round(W * 0.07));
        const ctaW = W - 2 * padX;
        const ctaH = Math.round(H * 0.065);

        return [
            // STRUCTURE
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },
            { type: 'rect', name: 'accent_line', x: 0, y: 0, w: W, h: 4,
              r: ar, g: ag2, b: ab, a: 1.0 },

            // CONTENT
            { type: 'text', name: 'tag_text', x: padX, y: Math.round(H * 0.05), w: W - 2 * padX, h: tagFs + 6,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 2 },
            { type: 'rect', name: 'tag_line', x: padX, y: Math.round(H * 0.085), w: 24, h: 2,
              r: ar, g: ag2, b: ab, a: 0.5 },
            { type: 'text', name: 'headline', x: padX, y: Math.round(H * 0.12),
              w: W - 2 * padX, h: Math.round(headFs * 3.5),
              content: c.headline, font_size: headFs, font_weight: '700',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.3, line_height: 1.1 },
            { type: 'text', name: 'subheadline', x: padX, y: Math.round(H * 0.34),
              w: W - 2 * padX, h: Math.round(subFs * 5),
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.5 },

            // ACTION
            { type: 'rounded_rect', name: 'cta_button', x: padX, y: H - Math.round(H * 0.12) - ctaH,
              w: ctaW, h: ctaH, r: ar, g: ag2, b: ab, a: 1.0, radius: 8 },
            { type: 'text', name: 'cta_label', x: padX, y: H - Math.round(H * 0.12) - ctaH + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '600',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },

            // POLISH
            { type: 'ellipse', name: 'decorative_dot', x: W - padX - 20, y: Math.round(H * 0.53),
              w: 40, h: 40, r: ar, g: ag2, b: ab, a: 0.05 },
        ];
    },
};

// ══════════════════════════════════════════════════
// TEMPLATE 5: Billboard (900-1000 × 220-280)
// Wide split: content left ~60%, accent right
// ══════════════════════════════════════════════════

const billboard: DesignTemplate = {
    id: 'billboard',
    name: 'Billboard Split',
    description: 'Wide horizontal with content left, accent zone right',
    matchCriteria: { minW: 850, maxW: 1100, minH: 180, maxH: 300 },
    build: (W, H, g, c) => {
        const pad = Math.round(W * 0.03);
        const [ar, ag2, ab] = hex(g.colors.accent);
        const headFs = Math.max(24, Math.round(H * 0.16));
        const subFs = Math.max(12, Math.round(H * 0.06));
        const tagFs = Math.max(10, Math.round(H * 0.044));
        const ctaFs = Math.max(11, Math.round(H * 0.05));
        const ctaW = Math.round(W * 0.14);
        const ctaH = Math.round(H * 0.17);
        const splitX = Math.round(W * 0.62);

        return [
            // STRUCTURE
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 135 },
            { type: 'rect', name: 'accent_zone', x: splitX, y: 0, w: W - splitX, h: H,
              r: ar, g: ag2, b: ab, a: 0.06 },
            { type: 'rect', name: 'accent_divider', x: splitX, y: Math.round(H * 0.15),
              w: 2, h: Math.round(H * 0.7), r: ar, g: ag2, b: ab, a: 0.2 },

            // CONTENT
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.1), w: splitX - 2 * pad, h: tagFs + 6,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.28), w: splitX - 2 * pad, h: Math.round(headFs * 2),
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.05 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.64), w: splitX - 2 * pad, h: Math.round(subFs * 2),
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.4 },

            // ACTION (positioned in right zone)
            { type: 'rounded_rect', name: 'cta_button',
              x: splitX + Math.round((W - splitX - ctaW) / 2), y: Math.round((H - ctaH) / 2),
              w: ctaW, h: ctaH, r: ar, g: ag2, b: ab, a: 1.0, radius: g.radius,
              shadow_offset_x: 2, shadow_offset_y: 3, shadow_blur: 8, shadow_opacity: 0.2 },
            { type: 'text', name: 'cta_label',
              x: splitX + Math.round((W - splitX - ctaW) / 2), y: Math.round((H - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },

            // POLISH
            { type: 'rect', name: 'accent_line', x: pad, y: Math.round(H * 0.24), w: 30, h: 2,
              r: ar, g: ag2, b: ab, a: 0.6 },
        ];
    },
};

// ══════════════════════════════════════════════════
// TEMPLATE 6: Story (1080 × 1920 — vertical fullscreen)
// Dramatic vertical with huge headline
// ══════════════════════════════════════════════════

const storyFull: DesignTemplate = {
    id: 'story-full',
    name: 'Story Fullscreen',
    description: 'Vertical fullscreen story with dramatic headline',
    matchCriteria: { minW: 900, maxW: 1200, minH: 1500, maxH: 2100 },
    build: (W, H, g, c) => {
        const pad = Math.round(W * 0.074);
        const [ar, ag2, ab] = hex(g.colors.accent);
        const headFs = Math.max(60, Math.round(W * 0.1));
        const subFs = Math.max(16, Math.round(W * 0.018));
        const tagFs = Math.max(12, Math.round(W * 0.012));
        const ctaFs = Math.max(14, Math.round(W * 0.015));
        const ctaW = Math.round(W * 0.5);
        const ctaH = Math.round(H * 0.035);

        return [
            // STRUCTURE
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H,
              gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },
            { type: 'rect', name: 'accent_zone', x: 0, y: Math.round(H * 0.6), w: W, h: Math.round(H * 0.4),
              r: hex(g.colors.accent)[0], g: hex(g.colors.accent)[1], b: hex(g.colors.accent)[2], a: 0.04 },

            // CONTENT
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.08), w: W - 2 * pad, h: tagFs + 8,
              content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600',
              color_hex: g.colors.accent, text_align: 'left', letter_spacing: 4 },
            { type: 'rect', name: 'tag_underline', x: pad, y: Math.round(H * 0.10), w: 40, h: 2,
              r: ar, g: ag2, b: ab, a: 0.5 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.15),
              w: W - 2 * pad, h: Math.round(headFs * 4),
              content: c.headline, font_size: headFs, font_weight: '800',
              color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -2, line_height: 1.0 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.40),
              w: Math.round(W * 0.7), h: Math.round(subFs * 4),
              content: c.subheadline, font_size: subFs, font_weight: '400',
              color_hex: g.colors.secondary, text_align: 'left', line_height: 1.6 },

            // ACTION
            { type: 'rounded_rect', name: 'cta_button',
              x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.82),
              w: ctaW, h: ctaH, r: ar, g: ag2, b: ab, a: 1.0, radius: Math.round(ctaH / 2),
              shadow_offset_x: 0, shadow_offset_y: 6, shadow_blur: 16, shadow_opacity: 0.25 },
            { type: 'text', name: 'cta_label',
              x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.82) + Math.round((ctaH - ctaFs) / 2),
              w: ctaW, h: ctaFs + 4,
              content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700',
              color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 2 },

            // POLISH
            { type: 'ellipse', name: 'decorative_circle', x: Math.round(W * 0.6), y: Math.round(H * 0.55),
              w: Math.round(W * 0.4), h: Math.round(W * 0.4),
              r: ar, g: ag2, b: ab, a: 0.03 },
            { type: 'rect', name: 'bottom_bar', x: 0, y: H - 6, w: W, h: 6,
              r: ar, g: ag2, b: ab, a: 0.2 },
        ];
    },
};

// ── Registry & Selection ─────────────────────────

export const DESIGN_TEMPLATES: DesignTemplate[] = [
    mediumRect,
    leaderboard,
    socialSquare,
    skyscraper,
    billboard,
    storyFull,
];

/**
 * Select the best template for a given canvas size.
 * Scores by how well the canvas fits each template's criteria.
 * Returns null if no template matches (fallback to freestyle).
 */
export function selectTemplate(canvasW: number, canvasH: number): DesignTemplate | null {
    let bestTemplate: DesignTemplate | null = null;
    let bestScore = 0;

    for (const tmpl of DESIGN_TEMPLATES) {
        const { minW, maxW, minH, maxH } = tmpl.matchCriteria;
        // Must be within range (with 20% tolerance)
        const tolerance = 0.2;
        const wInRange = canvasW >= minW * (1 - tolerance) && canvasW <= maxW * (1 + tolerance);
        const hInRange = canvasH >= minH * (1 - tolerance) && canvasH <= maxH * (1 + tolerance);
        if (!wInRange || !hInRange) continue;

        // Score: closer to center of range = better
        const wCenter = (minW + maxW) / 2;
        const hCenter = (minH + maxH) / 2;
        const wDist = Math.abs(canvasW - wCenter) / (maxW - minW);
        const hDist = Math.abs(canvasH - hCenter) / (maxH - minH);
        const score = 2 - wDist - hDist; // Higher = better match

        if (score > bestScore) {
            bestScore = score;
            bestTemplate = tmpl;
        }
    }

    return bestTemplate;
}

/**
 * Build the content-only prompt for the AI.
 * The AI generates ONLY headline/subheadline/cta/tag text.
 * Everything else comes from the template + style guide.
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
  "subheadline": "${subLimit}. Supporting the headline, professional tone",
  "cta": "1-3 word action verb. Examples: Learn More, Get Started, Shop Now, Try Free",
  "tag": "1-2 word category label. Examples: NEW, PREMIUM, LIMITED, 2026"
}

Rules:
- Write real, professional ad copy — no lorem ipsum
- Headline should be the star — punchy, memorable
- CTA must be a clear call to action  
- Tag is a tiny category marker, always uppercase
- All text must be in English
- Return ONLY the JSON object, no explanation`;
}
