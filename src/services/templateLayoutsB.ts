// ─────────────────────────────────────────────────
// templateLayoutsB — Layouts 7-12
// ─────────────────────────────────────────────────
// rightAligned, minimalClean, fullBleedHero,
// badgeFocus, horizontalStrip, tower
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

// ═══ LAYOUT 7: Right-Aligned ═══
export const rightAligned: DesignTemplate = {
    id: 'right-aligned', name: 'Right-Aligned',
    description: 'Content right-aligned — editorial, luxury feel',
    aspectRatios: ['landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(W * 0.08);
        const headFs = Math.max(16, Math.min(adaptiveFont(38, W, H, 1), Math.round(Math.min(W, H) * 0.07)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const tagFs = Math.max(8, Math.round(headFs * 0.28));
        const ctaFs = Math.max(10, Math.round(headFs * 0.32));
        const ctaW = Math.round(W * 0.38);
        const ctaH = Math.round(ctaFs * 2.6);
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },
            { type: 'rect', name: 'left_accent', x: 0, y: 0, w: 4, h: H, r: ar, g: ag, b: ab, a: 0.6 },
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.1), w: W - 2 * pad, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600', color_hex: g.colors.accent, text_align: 'right', letter_spacing: 3 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.22), w: W - 2 * pad, h: headFs * 2.5, content: c.headline, font_size: headFs, font_weight: '800', color_hex: g.colors.foreground, text_align: 'right', letter_spacing: -0.5, line_height: 1.1 },
            { type: 'text', name: 'subheadline', x: Math.round(W * 0.3), y: Math.round(H * 0.55), w: W - Math.round(W * 0.3) - pad, h: subFs * 2.5, content: c.subheadline, font_size: subFs, font_weight: '400', color_hex: g.colors.secondary, text_align: 'right', line_height: 1.4 },
            { type: 'rounded_rect', name: 'cta_button', x: W - pad - ctaW, y: Math.round(H * 0.78), w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius },
            { type: 'text', name: 'cta_label', x: W - pad - ctaW, y: Math.round(H * 0.78) + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ═══ LAYOUT 8: Minimal Clean ═══
export const minimalClean: DesignTemplate = {
    id: 'minimal-clean', name: 'Minimal Clean',
    description: 'Maximum whitespace, restrained typography — Apple-style premium',
    aspectRatios: ['landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.12);
        const headFs = Math.max(14, Math.min(adaptiveFont(32, W, H, 1), Math.round(Math.min(W, H) * 0.06)));
        const subFs = Math.max(9, Math.round(headFs * 0.42));
        const tagFs = Math.max(7, Math.round(headFs * 0.28));
        const ctaFs = Math.max(9, Math.round(headFs * 0.3));
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.15), w: W - 2 * pad, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '500', color_hex: g.colors.tertiary, text_align: 'center', letter_spacing: 5 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.35), w: W - 2 * pad, h: headFs * 2, content: c.headline, font_size: headFs, font_weight: '300', color_hex: g.colors.foreground, text_align: 'center', letter_spacing: 0.5, line_height: 1.3 },
            { type: 'text', name: 'subheadline', x: Math.round(W * 0.15), y: Math.round(H * 0.58), w: Math.round(W * 0.7), h: subFs * 2, content: c.subheadline, font_size: subFs, font_weight: '400', color_hex: g.colors.secondary, text_align: 'center', line_height: 1.5 },
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.78), w: W - 2 * pad, h: ctaFs + 4, content: c.cta + ' >', font_size: ctaFs, font_weight: '500', color_hex: g.colors.accent, text_align: 'center', letter_spacing: 1 },
            { type: 'rect', name: 'bottom_line', x: Math.round(W * 0.4), y: H - 1, w: Math.round(W * 0.2), h: 1, r: ar, g: ag, b: ab, a: 0.2 },
        ];
    },
};

// ═══ LAYOUT 9: Full Bleed Hero ═══
export const fullBleedHero: DesignTemplate = {
    id: 'full-bleed-hero', name: 'Full Bleed Hero',
    description: 'Hero background with text overlay — travel, lifestyle',
    aspectRatios: ['landscape', 'square', 'portrait', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.07);
        const headFs = Math.max(18, Math.min(adaptiveFont(44, W, H, 1), Math.round(Math.min(W, H) * 0.07)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const ctaFs = Math.max(10, Math.round(headFs * 0.3));
        const ctaW = Math.min(Math.round(W * 0.4), 180);
        const ctaH = Math.round(ctaFs * 2.6);
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.accent, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 160 },
            { type: 'rect', name: 'text_overlay', x: 0, y: Math.round(H * 0.5), w: W, h: Math.round(H * 0.5), gradient_start_hex: 'rgba(0,0,0,0)', gradient_end_hex: '#000000', gradient_angle: 180, r: 0, g: 0, b: 0, a: 0.6 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.55), w: W - 2 * pad, h: headFs * 2.5, content: c.headline, font_size: headFs, font_weight: '800', color_hex: '#ffffff', text_align: 'left', letter_spacing: -0.5, line_height: 1.05 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.76), w: Math.round(W * 0.7), h: subFs * 2, content: c.subheadline, font_size: subFs, font_weight: '400', color_hex: '#cccccc', text_align: 'left', line_height: 1.4 },
            { type: 'rounded_rect', name: 'cta_button', x: pad, y: Math.round(H * 0.88), w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: g.radius },
            { type: 'text', name: 'cta_label', x: pad, y: Math.round(H * 0.88) + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ═══ LAYOUT 10: Badge Focus ═══
export const badgeFocus: DesignTemplate = {
    id: 'badge-focus', name: 'Badge Focus',
    description: 'Central badge with circular accent — sales, promotional',
    aspectRatios: ['square', 'landscape', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.06);
        const headFs = Math.max(16, Math.min(adaptiveFont(36, W, H, 1), Math.round(Math.min(W, H) * 0.07)));
        const subFs = Math.max(10, Math.round(headFs * 0.4));
        const tagFs = Math.max(12, Math.round(headFs * 0.5));
        const ctaFs = Math.max(10, Math.round(headFs * 0.32));
        const ctaW = Math.min(Math.round(W * 0.4), 160);
        const ctaH = Math.round(ctaFs * 2.6);
        const badgeSize = Math.round(Math.min(W, H) * 0.35);
        const badgeX = Math.round((W - badgeSize) / 2);
        const badgeY = Math.round(H * 0.08);
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: g.colors.gradientAngle },
            { type: 'ellipse', name: 'badge_circle', x: badgeX, y: badgeY, w: badgeSize, h: badgeSize, r: ar, g: ag, b: ab, a: 0.12 },
            { type: 'ellipse', name: 'badge_inner', x: badgeX + Math.round(badgeSize * 0.08), y: badgeY + Math.round(badgeSize * 0.08), w: Math.round(badgeSize * 0.84), h: Math.round(badgeSize * 0.84), r: ar, g: ag, b: ab, a: 0.08 },
            { type: 'text', name: 'tag_text', x: pad, y: badgeY + Math.round(badgeSize * 0.3), w: W - 2 * pad, h: tagFs + 4, content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '800', color_hex: g.colors.accent, text_align: 'center', letter_spacing: 4 },
            { type: 'text', name: 'headline', x: pad, y: badgeY + badgeSize + Math.round(H * 0.04), w: W - 2 * pad, h: headFs * 2.2, content: c.headline, font_size: headFs, font_weight: '800', color_hex: g.colors.foreground, text_align: 'center', letter_spacing: -0.3, line_height: 1.1 },
            { type: 'text', name: 'subheadline', x: pad, y: badgeY + badgeSize + headFs * 2 + Math.round(H * 0.06), w: W - 2 * pad, h: subFs * 2, content: c.subheadline, font_size: subFs, font_weight: '400', color_hex: g.colors.secondary, text_align: 'center', line_height: 1.4 },
            { type: 'rounded_rect', name: 'cta_button', x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.82), w: ctaW, h: ctaH, r: ar, g: ag, b: ab, a: 1.0, radius: Math.round(ctaH / 2) },
            { type: 'text', name: 'cta_label', x: Math.round((W - ctaW) / 2), y: Math.round(H * 0.82) + Math.round((ctaH - ctaFs) / 2), w: ctaW, h: ctaFs + 4, content: c.cta.toUpperCase(), font_size: ctaFs, font_weight: '700', color_hex: g.colors.accentForeground, text_align: 'center', letter_spacing: 1.5 },
        ];
    },
};

// ═══ LAYOUT 11: Horizontal Strip ═══
export const horizontalStrip: DesignTemplate = {
    id: 'horizontal-strip', name: 'Horizontal Strip',
    description: 'Bold two-column layout with accent divider — modern, editorial',
    aspectRatios: ['wide', 'landscape', 'square', 'any'],
    build: (W, H, g, c) => {
        const [ar, ag, ab] = hex(g.colors.accent);
        const pad = Math.round(Math.min(W, H) * 0.08);
        const headFs = Math.max(16, Math.min(adaptiveFont(48, W, H, 1), Math.round(Math.min(W, H) * 0.12)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const tagFs = Math.max(8, Math.round(headFs * 0.28));
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 90 },
            { type: 'rect', name: 'accent_line', x: 0, y: 0, w: W, h: 4, r: ar, g: ag, b: ab, a: 0.8 },
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.12), w: W - 2 * pad, h: tagFs + 6, content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600', color_hex: g.colors.accent, text_align: 'left', letter_spacing: 3 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.25), w: W - 2 * pad, h: headFs * 2.5, content: c.headline, font_size: headFs, font_weight: '800', color_hex: g.colors.foreground, text_align: 'left', letter_spacing: -0.5, line_height: 1.1 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.58), w: Math.round(W * 0.7), h: subFs * 3, content: c.subheadline, font_size: subFs, font_weight: '400', color_hex: g.colors.secondary, text_align: 'left', line_height: 1.4 },
            { type: 'rect', name: 'divider', x: W - pad - 2, y: Math.round(H * 0.15), w: 2, h: Math.round(H * 0.7), r: ar, g: ag, b: ab, a: 0.15 },
        ];
    },
};

// ═══ LAYOUT 12: Tower ═══
export const tower: DesignTemplate = {
    id: 'tower', name: 'Tower',
    description: 'Vertical center-aligned stack with generous spacing — elegant, poster-like',
    aspectRatios: ['portrait', 'square', 'any'],
    build: (W, H, g, c) => {
        const pad = Math.round(Math.min(W, H) * 0.1);
        const [ar, ag, ab] = hex(g.colors.accent);
        const headFs = Math.max(16, Math.min(adaptiveFont(48, W, H, 1), Math.round(Math.min(W, H) * 0.12)));
        const subFs = Math.max(10, Math.round(headFs * 0.38));
        const tagFs = Math.max(8, Math.round(headFs * 0.28));
        return [
            { type: 'rect', name: 'background', x: 0, y: 0, w: W, h: H, gradient_start_hex: g.colors.gradientStart, gradient_end_hex: g.colors.gradientEnd, gradient_angle: 180 },
            { type: 'rect', name: 'accent_line', x: 0, y: 0, w: W, h: 4, r: ar, g: ag, b: ab, a: 1.0 },
            { type: 'text', name: 'tag_text', x: pad, y: Math.round(H * 0.15), w: W - 2 * pad, h: tagFs + 6, content: c.tag.toUpperCase(), font_size: tagFs, font_weight: '600', color_hex: g.colors.accent, text_align: 'center', letter_spacing: 3 },
            { type: 'text', name: 'headline', x: pad, y: Math.round(H * 0.28), w: W - 2 * pad, h: headFs * 2.5, content: c.headline, font_size: headFs, font_weight: '700', color_hex: g.colors.foreground, text_align: 'center', letter_spacing: -0.3, line_height: 1.1 },
            { type: 'text', name: 'subheadline', x: pad, y: Math.round(H * 0.58), w: W - 2 * pad, h: subFs * 3, content: c.subheadline, font_size: subFs, font_weight: '400', color_hex: g.colors.secondary, text_align: 'center', line_height: 1.5 },
            { type: 'ellipse', name: 'decorative_dot', x: Math.round((W - 40) / 2), y: Math.round(H * 0.82), w: 40, h: 40, r: ar, g: ag, b: ab, a: 0.1 },
        ];
    },
};
