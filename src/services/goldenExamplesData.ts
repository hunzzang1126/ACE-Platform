// ─────────────────────────────────────────────────
// goldenExamplesData — Hand-crafted reference designs (pure data)
// ─────────────────────────────────────────────────

import type { GoldenExample } from './goldenExamples';

export const premiumDark300x250: GoldenExample = {
    id: 'premium-dark-300x250', description: 'Luxury investment banner with layered depth, gold accent, and refined typography',
    canvasW: 300, canvasH: 250, styleGuide: 'midnight-premium',
    elements: [
        { type: 'rect', name: 'background', x: 0, y: 0, w: 300, h: 250, gradient_start_hex: '#0a1628', gradient_end_hex: '#142240', gradient_angle: 135 },
        { type: 'rect', name: 'accent_zone', x: 0, y: 0, w: 300, h: 85, r: 0.05, g: 0.08, b: 0.16, a: 0.6 },
        { type: 'rect', name: 'accent_line', x: 24, y: 84, w: 40, h: 2, r: 0.79, g: 0.66, b: 0.30, a: 1.0 },
        { type: 'text', name: 'tag_text', x: 24, y: 22, w: 120, h: 16, content: 'PREMIUM WEALTH', font_size: 10, font_weight: '600', color_hex: '#c9a84c', text_align: 'left', letter_spacing: 3 },
        { type: 'text', name: 'headline', x: 24, y: 96, w: 252, h: 60, content: 'Grow Your\nWealth', font_size: 36, font_weight: '800', color_hex: '#f0f2f5', text_align: 'left', letter_spacing: -0.5, line_height: 1.05 },
        { type: 'text', name: 'subheadline', x: 24, y: 162, w: 220, h: 24, content: 'Expert portfolio management\nfor high-net-worth individuals', font_size: 12, font_weight: '400', color_hex: '#8090a8', text_align: 'left', line_height: 1.5 },
        { type: 'rounded_rect', name: 'cta_button', x: 24, y: 202, w: 120, h: 34, r: 0.79, g: 0.66, b: 0.30, a: 1.0, radius: 4 },
        { type: 'text', name: 'cta_label', x: 24, y: 211, w: 120, h: 16, content: 'START INVESTING', font_size: 11, font_weight: '700', color_hex: '#0a1628', text_align: 'center', letter_spacing: 1.5 },
        { type: 'ellipse', name: 'decorative_shape', x: 260, y: 210, w: 60, h: 60, r: 0.79, g: 0.66, b: 0.30, a: 0.06 },
        { type: 'rect', name: 'bottom_border', x: 0, y: 246, w: 300, h: 4, r: 0.79, g: 0.66, b: 0.30, a: 0.3 },
    ],
};

export const boldImpact300x250: GoldenExample = {
    id: 'bold-impact-300x250', description: 'High-energy sports banner with dramatic contrast and bold typography',
    canvasW: 300, canvasH: 250, styleGuide: 'bold-impact',
    elements: [
        { type: 'rect', name: 'background', x: 0, y: 0, w: 300, h: 250, gradient_start_hex: '#0a0a0a', gradient_end_hex: '#1a0a00', gradient_angle: 135 },
        { type: 'rect', name: 'accent_zone', x: 0, y: 0, w: 8, h: 250, r: 1.0, g: 0.27, b: 0.0, a: 1.0 },
        { type: 'rect', name: 'accent_glow', x: 0, y: 0, w: 60, h: 250, r: 1.0, g: 0.27, b: 0.0, a: 0.05 },
        { type: 'text', name: 'headline', x: 28, y: 40, w: 260, h: 80, content: 'GAME\nDAY', font_size: 54, font_weight: '900', color_hex: '#ffffff', text_align: 'left', letter_spacing: -2, line_height: 0.95 },
        { type: 'text', name: 'subheadline', x: 28, y: 136, w: 200, h: 18, content: 'Every match. Every moment. Live.', font_size: 13, font_weight: '400', color_hex: '#999999', text_align: 'left', line_height: 1.3 },
        { type: 'rounded_rect', name: 'cta_button', x: 28, y: 190, w: 140, h: 40, r: 1.0, g: 0.27, b: 0.0, a: 1.0, radius: 4 },
        { type: 'text', name: 'cta_label', x: 28, y: 201, w: 140, h: 18, content: 'WATCH NOW', font_size: 14, font_weight: '800', color_hex: '#ffffff', text_align: 'center', letter_spacing: 2 },
        { type: 'rect', name: 'divider', x: 28, y: 165, w: 30, h: 2, r: 1.0, g: 0.27, b: 0.0, a: 0.6 },
        { type: 'text', name: 'tag_text', x: 200, y: 200, w: 80, h: 16, content: 'LIVE', font_size: 24, font_weight: '900', color_hex: '#1a0a00', text_align: 'right', letter_spacing: 4 },
    ],
};

export const electricDark728x90: GoldenExample = {
    id: 'electric-dark-728x90', description: 'Tech SaaS leaderboard with clean horizontal flow and cyan accent',
    canvasW: 728, canvasH: 90, styleGuide: 'electric-dark',
    elements: [
        { type: 'rect', name: 'background', x: 0, y: 0, w: 728, h: 90, gradient_start_hex: '#000000', gradient_end_hex: '#0a0e1a', gradient_angle: 90 },
        { type: 'rect', name: 'accent_line', x: 0, y: 0, w: 728, h: 2, r: 0.0, g: 0.83, b: 1.0, a: 0.8 },
        { type: 'text', name: 'headline', x: 24, y: 22, w: 300, h: 28, content: 'Ship faster with AI.', font_size: 24, font_weight: '800', color_hex: '#ffffff', text_align: 'left', letter_spacing: -0.5 },
        { type: 'text', name: 'subheadline', x: 24, y: 54, w: 300, h: 16, content: 'Automate your deployment pipeline in minutes', font_size: 13, font_weight: '400', color_hex: '#6e6e6e', text_align: 'left' },
        { type: 'rounded_rect', name: 'cta_button', x: 580, y: 25, w: 130, h: 40, r: 0.0, g: 0.83, b: 1.0, a: 1.0, radius: 0 },
        { type: 'text', name: 'cta_label', x: 580, y: 35, w: 130, h: 16, content: 'GET STARTED', font_size: 12, font_weight: '700', color_hex: '#000000', text_align: 'center', letter_spacing: 1.5 },
        { type: 'ellipse', name: 'decorative_dot', x: 520, y: 37, w: 8, h: 8, r: 0.0, g: 0.83, b: 1.0, a: 0.15 },
        { type: 'rect', name: 'subtle_divider', x: 540, y: 20, w: 1, h: 50, r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
    ],
};

export const warmNeutral1080x1080: GoldenExample = {
    id: 'warm-neutral-1080x1080', description: 'Lifestyle brand social post with warm tones and elegant composition',
    canvasW: 1080, canvasH: 1080, styleGuide: 'warm-neutral',
    elements: [
        { type: 'rect', name: 'background', x: 0, y: 0, w: 1080, h: 1080, gradient_start_hex: '#faf8f5', gradient_end_hex: '#f0ece5', gradient_angle: 180 },
        { type: 'rect', name: 'accent_zone', x: 0, y: 0, w: 1080, h: 420, r: 0.83, g: 0.40, b: 0.29, a: 0.06 },
        { type: 'text', name: 'tag_text', x: 80, y: 80, w: 200, h: 20, content: 'NEW COLLECTION', font_size: 14, font_weight: '600', color_hex: '#d4654a', text_align: 'left', letter_spacing: 4 },
        { type: 'rect', name: 'tag_underline', x: 80, y: 108, w: 32, h: 2, r: 0.83, g: 0.40, b: 0.29, a: 0.5 },
        { type: 'text', name: 'headline', x: 80, y: 180, w: 920, h: 240, content: 'Live\nBeautifully', font_size: 120, font_weight: '700', color_hex: '#1a1714', text_align: 'left', letter_spacing: -2, line_height: 1.0 },
        { type: 'text', name: 'subheadline', x: 80, y: 440, w: 600, h: 50, content: 'Handcrafted home essentials that bring warmth\nand character to every room', font_size: 22, font_weight: '400', color_hex: '#8a837a', text_align: 'left', line_height: 1.5 },
        { type: 'rounded_rect', name: 'cta_button', x: 80, y: 560, w: 220, h: 56, r: 0.83, g: 0.40, b: 0.29, a: 1.0, radius: 10 },
        { type: 'text', name: 'cta_label', x: 80, y: 575, w: 220, h: 22, content: 'EXPLORE NOW', font_size: 15, font_weight: '600', color_hex: '#ffffff', text_align: 'center', letter_spacing: 2 },
        { type: 'ellipse', name: 'decorative_circle', x: 800, y: 700, w: 300, h: 300, r: 0.83, g: 0.40, b: 0.29, a: 0.04 },
        { type: 'rect', name: 'bottom_accent', x: 0, y: 1072, w: 1080, h: 8, r: 0.83, g: 0.40, b: 0.29, a: 0.15 },
    ],
};

export const cleanClinical160x600: GoldenExample = {
    id: 'clean-clinical-160x600', description: 'Healthcare skyscraper with trust-building teal accent and clean layout',
    canvasW: 160, canvasH: 600, styleGuide: 'clean-clinical',
    elements: [
        { type: 'rect', name: 'background', x: 0, y: 0, w: 160, h: 600, gradient_start_hex: '#f4f6f8', gradient_end_hex: '#e8f4f0', gradient_angle: 180 },
        { type: 'rect', name: 'accent_zone', x: 0, y: 0, w: 160, h: 4, r: 0.09, g: 0.65, b: 0.54, a: 1.0 },
        { type: 'text', name: 'tag_text', x: 16, y: 30, w: 128, h: 14, content: 'TRUSTED CARE', font_size: 10, font_weight: '600', color_hex: '#17a589', text_align: 'left', letter_spacing: 2 },
        { type: 'rect', name: 'accent_line', x: 16, y: 52, w: 24, h: 2, r: 0.09, g: 0.65, b: 0.54, a: 0.5 },
        { type: 'text', name: 'headline', x: 16, y: 72, w: 128, h: 100, content: 'Your Health,\nOur\nPriority', font_size: 28, font_weight: '700', color_hex: '#1c2331', text_align: 'left', letter_spacing: -0.3, line_height: 1.1 },
        { type: 'text', name: 'subheadline', x: 16, y: 200, w: 128, h: 80, content: 'Board-certified physicians providing personalized care plans', font_size: 13, font_weight: '400', color_hex: '#718096', text_align: 'left', line_height: 1.5 },
        { type: 'rounded_rect', name: 'cta_button', x: 16, y: 510, w: 128, h: 40, r: 0.09, g: 0.65, b: 0.54, a: 1.0, radius: 8 },
        { type: 'text', name: 'cta_label', x: 16, y: 521, w: 128, h: 16, content: 'BOOK VISIT', font_size: 12, font_weight: '600', color_hex: '#ffffff', text_align: 'center', letter_spacing: 1.5 },
        { type: 'ellipse', name: 'decorative_dot', x: 120, y: 320, w: 40, h: 40, r: 0.09, g: 0.65, b: 0.54, a: 0.05 },
    ],
};
