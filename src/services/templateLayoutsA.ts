// ─────────────────────────────────────────────────
// templateLayoutsA — Layouts 1-6
// ─────────────────────────────────────────────────
// centeredStack, leftAlignedCard, boldHeadline,
// splitHorizontal, diagonalSplit, topDownCascade
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';
import type { DesignStyleGuide } from '@/services/designStyleGuides';
import type { DesignTemplate, GeneratedContent } from './designTemplates';

function hex(c: string): [number, number, number] {
    const h = c.replace('#', '');
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

function adaptiveFont(baseCap: number, W: number, H: number, ratio: number): number {
    const diag = Math.sqrt(W * W + H * H);
    const scale = Math.max(1, diag / 500);
    return Math.max(baseCap, Math.round(baseCap * scale * ratio));
}

// ═══ LAYOUT 1: Centered Stack ═══
export const centeredStack: DesignTemplate = {
    id: 'centered-stack', name: 'Centered Stack',
    description: 'All content centered vertically — clean, balanced, professional',
    aspectRatios: ['landscape', 'square', 'portrait', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.08);
        const headFs = Math.max(16, Math.min(adaptiveFont(48, W, H, 1), Math.round(Math.min(W, H) * 0.07)));
        const subFs = Math.max(10, Math.round(headFs * 0.4));
        const tagFs = Math.max(8, Math.round(headFs * 0.3));
        const ctaFs = Math.max(10, Math.round(headFs * 0.35));
        const ctaW = Math.min(Math.round(W * 0.45), 200);
        const ctaH = Math.round(ctaFs * 2.8);
        const totalH = tagFs + 8 + headFs * 2 + 8 + subFs * 2 + 16 + ctaH;
        const startY = Math.max(pad, Math.round((H - totalH) / 2));
        let y = startY;
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },
            { type: 'text', name: 'tag_text', x: pad, y, w: W - 2 * pad, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_family: g.typography.primaryFont, font_weight: '600', color_hex: g.colors.accent, text_align: 'center', letter_spacing: 3 },
            (y += tagFs + 10, { type: 'text', name: 'headline', x: pad, y, w: W - 2 * pad, h: headFs * 2.2, content: c.headline, font_size: headFs, font_family: g.typography.primaryFont, font_weight: '800', color_hex: g.colors.foreground, text_align: 'center', letter_spacing: -0.5, line_height: 1.1 }),
            (y += headFs * 2 + 8, { type: 'text', name: 'subheadline', x: pad, y, w: W - 2 * pad, h: subFs * 2.5, content: c.subheadline, font_size: subFs, font_family: g.typography.secondaryFont, font_weight: '400', color_hex: g.colors.secondary, text_align: 'center', line_height: 1.45 }),
            (y += subFs * 2 + 16, { type: 'rounded_rect', name: 'cta_button', x: Math.round((W - ctaW) / 2), y, w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius }),
            { type: 'text', name: 'cta_label', x: Math.round((W - ctaW) / 2), y: y + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_family: g.typography.primaryFont, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
            { type: 'rect', name: 'bottom_accent', x: Math.round(W * 0.35), y: H - 3, w: Math.round(W * 0.3), h: 3, r: ar, g: ag, b: ab, a: 0.3 },
        ];
    },
};

// ═══ LAYOUT 2: Left-Aligned Card ═══
export const leftAlignedCard: DesignTemplate = {
    id: 'left-aligned-card', name: 'Left-Aligned Card',
    description: 'Content left-aligned with accent bar — corporate, structured',
    aspectRatios: ['landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const pad = Math.round(W * 0.08);
        const [ar, ag, ab] = hex(g.colors.accent);
        const headFs = Math.max(16, Math.min(adaptiveFont(36, W, H, 1), Math.round(Math.min(W, H) * 0.07)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const tagFs = Math.max(8, Math.round(headFs * 0.3));
        const ctaFs = Math.max(10, Math.round(headFs * 0.35));
        const ctaH = Math.round(ctaFs * 2.8);
        const ctaW = Math.round(W * 0.42);
        let y = pad;
        const azH = Math.round(H * 0.15);
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },
            { type: 'rect', name: 'accent_zone', x: 0, y: 0, w: W, h: azH, r: hex(g.colors.surface)[0], g: hex(g.colors.surface)[1], b: hex(g.colors.surface)[2], a: 0.4 },
            { type: 'rect', name: 'accent_line', x: pad, y: azH, w: Math.round(W * 0.13), h: 2, r: ar, g: ag, b: ab, a: 1.0 },
            { type: 'text', name: 'tag_text', x: pad, y, w: W - 2 * pad, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_family: g.typography.primaryFont, font_weight: '600', color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },
            (y = azH + 8, { type: 'text', name: 'headline', x: pad, y, w: W - 2 * pad, h: headFs * 2.2, content: c.headline, font_size: headFs, font_family: g.typography.primaryFont, font_weight: '800', color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.1 }),
            (y += headFs * 2 + 6, { type: 'text', name: 'subheadline', x: pad, y, w: Math.round(W * 0.82), h: subFs * 2.5, content: c.subheadline, font_size: subFs, font_family: g.typography.secondaryFont, font_weight: '400', color_hex: g.colors.secondary, text_align: 'left', line_height: 1.45 }),
            { type: 'rounded_rect', name: 'cta_button', x: pad, y: H - pad - ctaH, w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius, shadow_offset_x: 2, shadow_offset_y: 4, shadow_blur: 10, shadow_opacity: 0.25 },
            { type: 'text', name: 'cta_label', x: pad, y: H - pad - ctaH + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_family: g.typography.primaryFont, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
            { type: 'rect', name: 'bottom_border', x: 0, y: H - 3, w: W, h: 3, r: ar, g: ag, b: ab, a: 0.25 },
        ];
    },
};

// ═══ LAYOUT 3: Bold Headline ═══
export const boldHeadline: DesignTemplate = {
    id: 'bold-headline', name: 'Bold Headline',
    description: 'Giant headline dominates — high-impact, Nike-style',
    aspectRatios: ['landscape', 'square', 'portrait', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.06);
        const headFs = Math.max(24, Math.min(adaptiveFont(80, W, H, 1), Math.round(H * 0.1)));
        const subFs = Math.max(10, Math.round(headFs * 0.28));
        const tagFs = Math.max(8, Math.round(headFs * 0.22));
        const ctaFs = Math.max(10, Math.round(headFs * 0.25));
        const ctaW = Math.min(Math.round(W * 0.35), 180);
        const ctaH = Math.round(ctaFs * 2.8);
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },
            { type: 'rect', name: 'accent_block', x: 0, y: Math.round(H * 0.25), w: W, h: Math.round(H * 0.45), r: ar, g: ag, b: ab, a: 0.04 },
            { type: 'text', name: 'tag_text', x: pad, y: pad, w: W - 2 * pad, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_family: g.typography.primaryFont, font_weight: '600', color_hex: g.colors.accent, text_align: 'left', letter_spacing: 4 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.25), w: W - 2 * pad, h: headFs * 2.5, content: c.headline, font_size: headFs, font_family: g.typography.primaryFont, font_weight: '900', color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -1.5, line_height: 0.95 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.65), w: Math.round(W * 0.7), h: subFs * 2, content: c.subheadline, font_size: subFs, font_family: g.typography.secondaryFont, font_weight: '400', color_hex: g.colors.secondary, text_align: 'left', line_height: 1.4 },
            { type: 'rounded_rect', name: 'cta_button', x: pad, y: Math.round(H * 0.82), w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: 0 },
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.82) + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_family: g.typography.primaryFont, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 2 },
        ];
    },
};

// ═══ LAYOUT 4: Split Horizontal ═══
export const splitHorizontal: DesignTemplate = {
    id: 'split-horizontal', name: 'Split Horizontal',
    description: 'Left zone for image, right zone for content — product-focused',
    aspectRatios: ['landscape', 'square', 'wide'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const splitX = Math.round(W * 0.42);
        const rp = Math.round((W - splitX) * 0.1);
        const headFs = Math.max(14, Math.min(adaptiveFont(32, W, H, 1), Math.round((W - splitX) * 0.08)));
        const subFs = Math.max(10, Math.round(headFs * 0.45));
        const tagFs = Math.max(8, Math.round(headFs * 0.3));
        const ctaFs = Math.max(9, Math.round(headFs * 0.35));
        const ctaW = Math.round((W - splitX) * 0.6);
        const ctaH = Math.round(ctaFs * 2.6);
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 90 },
            { type: 'rect', name: 'image_zone', x: 0, y: 0, w: splitX, h: H, r: ar, g: ag, b: ab, a: 0.08 },
            { type: 'text', name: 'zone_label', x: Math.round(splitX * 0.15), y: Math.round(H * 0.4), w: Math.round(splitX * 0.7), h: 20, content: 'PRODUCT IMAGE', font_size: Math.max(9, Math.round(splitX * 0.06)), font_family: g.typography.secondaryFont, font_weight: '500', color_hex: g.colors.muted, text_align: 'center', letter_spacing: 3 },
            { type: 'text', name: 'tag_text', x: splitX + rp, y: Math.round(H * 0.12), w: W - splitX - 2 * rp, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_family: g.typography.primaryFont, font_weight: '600', color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },
            { type: 'text', name: 'headline', x: splitX + rp, y: Math.round(H * 0.24), w: W - splitX - 2 * rp, h: headFs * 2.5, content: c.headline, font_size: headFs, font_family: g.typography.primaryFont, font_weight: '800', color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.1 },
            { type: 'text', name: 'subheadline', x: splitX + rp, y: Math.round(H * 0.52), w: W - splitX - 2 * rp, h: subFs * 3, content: c.subheadline, font_size: subFs, font_family: g.typography.secondaryFont, font_weight: '400', color_hex: g.colors.secondary, text_align: 'left', line_height: 1.4 },
            { type: 'rounded_rect', name: 'cta_button', x: splitX + rp, y: Math.round(H * 0.78), w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius },
            { type: 'text', name: 'cta_label', x: splitX + rp, y: Math.round(H * 0.78) + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_family: g.typography.primaryFont, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1 },
            { type: 'rect', name: 'divider', x: splitX, y: Math.round(H * 0.1), w: 1, h: Math.round(H * 0.8), r: ar, g: ag, b: ab, a: 0.15 },
        ];
    },
};

// ═══ LAYOUT 5: Diagonal Split ═══
export const diagonalSplit: DesignTemplate = {
    id: 'diagonal-split', name: 'Diagonal Split',
    description: 'Angled accent zone — modern, tech-forward',
    aspectRatios: ['landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.08);
        const headFs = Math.max(16, Math.min(adaptiveFont(40, W, H, 1), Math.round(Math.min(W, H) * 0.08)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const tagFs = Math.max(8, Math.round(headFs * 0.28));
        const ctaFs = Math.max(10, Math.round(headFs * 0.32));
        const ctaW = Math.min(Math.round(W * 0.38), 160);
        const ctaH = Math.round(ctaFs * 2.6);
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 135 },
            { type: 'rect', name: 'diagonal_accent', x: Math.round(W * 0.5), y: -Math.round(H * 0.2), w: Math.round(W * 0.7), h: Math.round(H * 1.4), r: ar, g: ag, b: ab, a: 0.04 },
            { type: 'rect', name: 'top_accent', x: 0, y: 0, w: Math.round(W * 0.25), h: 3, r: ar, g: ag, b: ab, a: 1.0 },
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.1), w: W - 2 * pad, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_family: g.typography.primaryFont, font_weight: '600', color_hex: g.colors.accent, text_align: 'left', letter_spacing: 4 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.22), w: Math.round(W * 0.65), h: headFs * 2.5, content: c.headline, font_size: headFs, font_family: g.typography.primaryFont, font_weight: '800', color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.05 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.58), w: Math.round(W * 0.55), h: subFs * 2.5, content: c.subheadline, font_size: subFs, font_family: g.typography.secondaryFont, font_weight: '400', color_hex: g.colors.secondary, text_align: 'left', line_height: 1.4 },
            { type: 'rounded_rect', name: 'cta_button', x: pad, y: Math.round(H * 0.8), w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius },
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.8) + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_family: g.typography.primaryFont, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ═══ LAYOUT 6: Top-Down Cascade ═══
export const topDownCascade: DesignTemplate = {
    id: 'top-down-cascade', name: 'Top-Down Cascade',
    description: 'Flowing content cascade with offsets — events, campaigns',
    aspectRatios: ['portrait', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(W * 0.08);
        const headFs = Math.max(18, Math.min(adaptiveFont(42, W, H, 1), Math.round(Math.min(W, H) * 0.07)));
        const subFs = Math.max(10, Math.round(headFs * 0.4));
        const tagFs = Math.max(8, Math.round(headFs * 0.28));
        const ctaFs = Math.max(10, Math.round(headFs * 0.32));
        const ctaW = Math.round(W * 0.5);
        const ctaH = Math.round(ctaFs * 2.8);
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },
            { type: 'rect', name: 'accent_bar', x: 0, y: 0, w: W, h: Math.round(H * 0.04), r: ar, g: ag, b: ab, a: 1.0 },
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.08), w: W - 2 * pad, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_family: g.typography.primaryFont, font_weight: '600', color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },
            { type: 'text', name: 'headline', x: pad + Math.round(W * 0.04), y: Math.round(H * 0.18), w: W - 2 * pad - Math.round(W * 0.04), h: headFs * 2.8, content: c.headline, font_size: headFs, font_family: g.typography.primaryFont, font_weight: '800', color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.05 },
            { type: 'rect', name: 'cascade_line', x: pad, y: Math.round(H * 0.45), w: Math.round(W * 0.2), h: 2, r: ar, g: ag, b: ab, a: 0.4 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.5), w: Math.round(W * 0.8), h: subFs * 3, content: c.subheadline, font_size: subFs, font_family: g.typography.secondaryFont, font_weight: '400', color_hex: g.colors.secondary, text_align: 'left', line_height: 1.5 },
            { type: 'rounded_rect', name: 'cta_button', x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.78), w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: Math.round(ctaH / 2) },
            { type: 'text', name: 'cta_label', x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.78) + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_family: g.typography.primaryFont, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};
