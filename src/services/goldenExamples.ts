// ─────────────────────────────────────────────────
// goldenExamples.ts — Hand-crafted Design References
// ─────────────────────────────────────────────────
// These show the AI EXACTLY what excellent design output looks
// like using our primitives. Each example is pixel-perfect and
// demonstrates proper layered composition, depth, and polish.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';

export interface GoldenExample {
    id: string;
    description: string;
    canvasW: number;
    canvasH: number;
    styleGuide: string;
    elements: RenderElement[];
}

// ── Premium Dark (300×250) — Finance/Luxury ──────

const premiumDark300x250: GoldenExample = {
    id: 'premium-dark-300x250',
    description: 'Luxury investment banner with layered depth, gold accent, and refined typography',
    canvasW: 300,
    canvasH: 250,
    styleGuide: 'midnight-premium',
    elements: [
        // LAYER 1: STRUCTURE
        {
            type: 'rect', name: 'background',
            x: 0, y: 0, w: 300, h: 250,
            gradient_start_hex: '#0a1628', gradient_end_hex: '#142240', gradient_angle: 135,
        },
        {
            type: 'rect', name: 'accent_zone',
            x: 0, y: 0, w: 300, h: 85,
            r: 0.05, g: 0.08, b: 0.16, a: 0.6,
        },
        {
            type: 'rect', name: 'accent_line',
            x: 24, y: 84, w: 40, h: 2,
            r: 0.79, g: 0.66, b: 0.30, a: 1.0,
        },
        // LAYER 2: CONTENT
        {
            type: 'text', name: 'tag_text',
            x: 24, y: 22, w: 120, h: 16,
            content: 'PREMIUM WEALTH', font_size: 10, font_weight: '600',
            color_hex: '#c9a84c', text_align: 'left', letter_spacing: 3,
        },
        {
            type: 'text', name: 'headline',
            x: 24, y: 96, w: 252, h: 60,
            content: 'Grow Your\nWealth', font_size: 36, font_weight: '800',
            color_hex: '#f0f2f5', text_align: 'left', letter_spacing: -0.5, line_height: 1.05,
        },
        {
            type: 'text', name: 'subheadline',
            x: 24, y: 162, w: 220, h: 24,
            content: 'Expert portfolio management\nfor high-net-worth individuals', font_size: 12, font_weight: '400',
            color_hex: '#8090a8', text_align: 'left', line_height: 1.5,
        },
        // LAYER 3: ACTION
        {
            type: 'rounded_rect', name: 'cta_button',
            x: 24, y: 202, w: 120, h: 34,
            r: 0.79, g: 0.66, b: 0.30, a: 1.0, radius: 4,
        },
        {
            type: 'text', name: 'cta_label',
            x: 24, y: 211, w: 120, h: 16,
            content: 'START INVESTING', font_size: 11, font_weight: '700',
            color_hex: '#0a1628', text_align: 'center', letter_spacing: 1.5,
        },
        // LAYER 4: POLISH
        {
            type: 'ellipse', name: 'decorative_shape',
            x: 260, y: 210, w: 60, h: 60,
            r: 0.79, g: 0.66, b: 0.30, a: 0.06,
        },
        {
            type: 'rect', name: 'bottom_border',
            x: 0, y: 246, w: 300, h: 4,
            r: 0.79, g: 0.66, b: 0.30, a: 0.3,
        },
    ],
};

// ── Bold Impact (300×250) — Sports/Promo ─────────

const boldImpact300x250: GoldenExample = {
    id: 'bold-impact-300x250',
    description: 'High-energy sports banner with dramatic contrast and bold typography',
    canvasW: 300,
    canvasH: 250,
    styleGuide: 'bold-impact',
    elements: [
        // LAYER 1: STRUCTURE
        {
            type: 'rect', name: 'background',
            x: 0, y: 0, w: 300, h: 250,
            gradient_start_hex: '#0a0a0a', gradient_end_hex: '#1a0a00', gradient_angle: 135,
        },
        {
            type: 'rect', name: 'accent_zone',
            x: 0, y: 0, w: 8, h: 250,
            r: 1.0, g: 0.27, b: 0.0, a: 1.0,
        },
        {
            type: 'rect', name: 'accent_glow',
            x: 0, y: 0, w: 60, h: 250,
            r: 1.0, g: 0.27, b: 0.0, a: 0.05,
        },
        // LAYER 2: CONTENT
        {
            type: 'text', name: 'headline',
            x: 28, y: 40, w: 260, h: 80,
            content: 'GAME\nDAY', font_size: 54, font_weight: '900',
            color_hex: '#ffffff', text_align: 'left', letter_spacing: -2, line_height: 0.95,
        },
        {
            type: 'text', name: 'subheadline',
            x: 28, y: 136, w: 200, h: 18,
            content: 'Every match. Every moment. Live.', font_size: 13, font_weight: '400',
            color_hex: '#999999', text_align: 'left', line_height: 1.3,
        },
        // LAYER 3: ACTION
        {
            type: 'rounded_rect', name: 'cta_button',
            x: 28, y: 190, w: 140, h: 40,
            r: 1.0, g: 0.27, b: 0.0, a: 1.0, radius: 4,
        },
        {
            type: 'text', name: 'cta_label',
            x: 28, y: 201, w: 140, h: 18,
            content: 'WATCH NOW', font_size: 14, font_weight: '800',
            color_hex: '#ffffff', text_align: 'center', letter_spacing: 2,
        },
        // LAYER 4: POLISH
        {
            type: 'rect', name: 'divider',
            x: 28, y: 165, w: 30, h: 2,
            r: 1.0, g: 0.27, b: 0.0, a: 0.6,
        },
        {
            type: 'text', name: 'tag_text',
            x: 200, y: 200, w: 80, h: 16,
            content: 'LIVE', font_size: 24, font_weight: '900',
            color_hex: '#1a0a00', text_align: 'right', letter_spacing: 4,
        },
    ],
};

// ── Electric Dark (728×90) — Tech Leaderboard ────

const electricDark728x90: GoldenExample = {
    id: 'electric-dark-728x90',
    description: 'Tech SaaS leaderboard with clean horizontal flow and cyan accent',
    canvasW: 728,
    canvasH: 90,
    styleGuide: 'electric-dark',
    elements: [
        // LAYER 1: STRUCTURE
        {
            type: 'rect', name: 'background',
            x: 0, y: 0, w: 728, h: 90,
            gradient_start_hex: '#000000', gradient_end_hex: '#0a0e1a', gradient_angle: 90,
        },
        {
            type: 'rect', name: 'accent_line',
            x: 0, y: 0, w: 728, h: 2,
            r: 0.0, g: 0.83, b: 1.0, a: 0.8,
        },
        // LAYER 2: CONTENT
        {
            type: 'text', name: 'headline',
            x: 24, y: 22, w: 300, h: 28,
            content: 'Ship faster with AI.', font_size: 24, font_weight: '800',
            color_hex: '#ffffff', text_align: 'left', letter_spacing: -0.5,
        },
        {
            type: 'text', name: 'subheadline',
            x: 24, y: 54, w: 300, h: 16,
            content: 'Automate your deployment pipeline in minutes', font_size: 13, font_weight: '400',
            color_hex: '#6e6e6e', text_align: 'left',
        },
        // LAYER 3: ACTION
        {
            type: 'rounded_rect', name: 'cta_button',
            x: 580, y: 25, w: 130, h: 40,
            r: 0.0, g: 0.83, b: 1.0, a: 1.0, radius: 0,
        },
        {
            type: 'text', name: 'cta_label',
            x: 580, y: 35, w: 130, h: 16,
            content: 'GET STARTED', font_size: 12, font_weight: '700',
            color_hex: '#000000', text_align: 'center', letter_spacing: 1.5,
        },
        // LAYER 4: POLISH
        {
            type: 'ellipse', name: 'decorative_dot',
            x: 520, y: 37, w: 8, h: 8,
            r: 0.0, g: 0.83, b: 1.0, a: 0.15,
        },
        {
            type: 'rect', name: 'subtle_divider',
            x: 540, y: 20, w: 1, h: 50,
            r: 0.2, g: 0.2, b: 0.2, a: 1.0,
        },
    ],
};

// ── Warm Neutral (1080×1080) — Square Social ─────

const warmNeutral1080x1080: GoldenExample = {
    id: 'warm-neutral-1080x1080',
    description: 'Lifestyle brand social post with warm tones and elegant composition',
    canvasW: 1080,
    canvasH: 1080,
    styleGuide: 'warm-neutral',
    elements: [
        // LAYER 1: STRUCTURE
        {
            type: 'rect', name: 'background',
            x: 0, y: 0, w: 1080, h: 1080,
            gradient_start_hex: '#faf8f5', gradient_end_hex: '#f0ece5', gradient_angle: 180,
        },
        {
            type: 'rect', name: 'accent_zone',
            x: 0, y: 0, w: 1080, h: 420,
            r: 0.83, g: 0.40, b: 0.29, a: 0.06,
        },
        // LAYER 2: CONTENT
        {
            type: 'text', name: 'tag_text',
            x: 80, y: 80, w: 200, h: 20,
            content: 'NEW COLLECTION', font_size: 14, font_weight: '600',
            color_hex: '#d4654a', text_align: 'left', letter_spacing: 4,
        },
        {
            type: 'rect', name: 'tag_underline',
            x: 80, y: 108, w: 32, h: 2,
            r: 0.83, g: 0.40, b: 0.29, a: 0.5,
        },
        {
            type: 'text', name: 'headline',
            x: 80, y: 180, w: 920, h: 240,
            content: 'Live\nBeautifully', font_size: 120, font_weight: '700',
            color_hex: '#1a1714', text_align: 'left', letter_spacing: -2, line_height: 1.0,
        },
        {
            type: 'text', name: 'subheadline',
            x: 80, y: 440, w: 600, h: 50,
            content: 'Handcrafted home essentials that bring warmth\nand character to every room', font_size: 22, font_weight: '400',
            color_hex: '#8a837a', text_align: 'left', line_height: 1.5,
        },
        // LAYER 3: ACTION
        {
            type: 'rounded_rect', name: 'cta_button',
            x: 80, y: 560, w: 220, h: 56,
            r: 0.83, g: 0.40, b: 0.29, a: 1.0, radius: 10,
        },
        {
            type: 'text', name: 'cta_label',
            x: 80, y: 575, w: 220, h: 22,
            content: 'EXPLORE NOW', font_size: 15, font_weight: '600',
            color_hex: '#ffffff', text_align: 'center', letter_spacing: 2,
        },
        // LAYER 4: POLISH
        {
            type: 'ellipse', name: 'decorative_circle',
            x: 800, y: 700, w: 300, h: 300,
            r: 0.83, g: 0.40, b: 0.29, a: 0.04,
        },
        {
            type: 'rect', name: 'bottom_accent',
            x: 0, y: 1072, w: 1080, h: 8,
            r: 0.83, g: 0.40, b: 0.29, a: 0.15,
        },
    ],
};

// ── Clean Clinical (160×600) — Skyscraper ────────

const cleanClinical160x600: GoldenExample = {
    id: 'clean-clinical-160x600',
    description: 'Healthcare skyscraper with trust-building teal accent and clean layout',
    canvasW: 160,
    canvasH: 600,
    styleGuide: 'clean-clinical',
    elements: [
        // LAYER 1: STRUCTURE
        {
            type: 'rect', name: 'background',
            x: 0, y: 0, w: 160, h: 600,
            gradient_start_hex: '#f4f6f8', gradient_end_hex: '#e8f4f0', gradient_angle: 180,
        },
        {
            type: 'rect', name: 'accent_zone',
            x: 0, y: 0, w: 160, h: 4,
            r: 0.09, g: 0.65, b: 0.54, a: 1.0,
        },
        // LAYER 2: CONTENT
        {
            type: 'text', name: 'tag_text',
            x: 16, y: 30, w: 128, h: 14,
            content: 'TRUSTED CARE', font_size: 10, font_weight: '600',
            color_hex: '#17a589', text_align: 'left', letter_spacing: 2,
        },
        {
            type: 'rect', name: 'accent_line',
            x: 16, y: 52, w: 24, h: 2,
            r: 0.09, g: 0.65, b: 0.54, a: 0.5,
        },
        {
            type: 'text', name: 'headline',
            x: 16, y: 72, w: 128, h: 100,
            content: 'Your Health,\nOur\nPriority', font_size: 28, font_weight: '700',
            color_hex: '#1c2331', text_align: 'left', letter_spacing: -0.3, line_height: 1.1,
        },
        {
            type: 'text', name: 'subheadline',
            x: 16, y: 200, w: 128, h: 80,
            content: 'Board-certified physicians providing personalized care plans', font_size: 13, font_weight: '400',
            color_hex: '#718096', text_align: 'left', line_height: 1.5,
        },
        // LAYER 3: ACTION
        {
            type: 'rounded_rect', name: 'cta_button',
            x: 16, y: 510, w: 128, h: 40,
            r: 0.09, g: 0.65, b: 0.54, a: 1.0, radius: 8,
        },
        {
            type: 'text', name: 'cta_label',
            x: 16, y: 521, w: 128, h: 16,
            content: 'BOOK VISIT', font_size: 12, font_weight: '600',
            color_hex: '#ffffff', text_align: 'center', letter_spacing: 1.5,
        },
        // LAYER 4: POLISH
        {
            type: 'ellipse', name: 'decorative_dot',
            x: 120, y: 320, w: 40, h: 40,
            r: 0.09, g: 0.65, b: 0.54, a: 0.05,
        },
    ],
};

// ── Export All ────────────────────────────────────

export const GOLDEN_EXAMPLES: GoldenExample[] = [
    premiumDark300x250,
    boldImpact300x250,
    electricDark728x90,
    warmNeutral1080x1080,
    cleanClinical160x600,
];

/**
 * Build a few-shot prompt section from golden examples.
 * Shows the AI what GREAT design JSON looks like with our primitives.
 * Picks the 2 most relevant examples based on style guide + aspect ratio.
 */
export function buildGoldenExamplePrompt(
    styleGuideId: string,
    canvasW: number,
    canvasH: number,
): string {
    const ratio = canvasW / canvasH;

    // Score each example by relevance
    const scored = GOLDEN_EXAMPLES.map(ex => {
        let score = 0;
        // Same style guide = strongest match
        if (ex.styleGuide === styleGuideId) score += 10;
        // Similar aspect ratio
        const exRatio = ex.canvasW / ex.canvasH;
        const ratioDiff = Math.abs(ratio - exRatio);
        if (ratioDiff < 0.2) score += 5;
        else if (ratioDiff < 0.5) score += 3;
        else if (ratioDiff < 1.0) score += 1;
        return { ex, score };
    });

    // Pick top 2
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 2);

    if (top.length === 0) return '';

    let prompt = `\n═══════════════════════════════════════════════════
GOLDEN EXAMPLES — This is what EXCELLENT output looks like:
═══════════════════════════════════════════════════\n\n`;

    for (const { ex } of top) {
        prompt += `EXAMPLE: "${ex.description}" (${ex.canvasW}x${ex.canvasH}, ${ex.styleGuide})\n`;
        prompt += '```json\n';
        prompt += JSON.stringify(ex.elements.map(el => {
            // Slim down to essential fields only
            const slim: Record<string, unknown> = { type: el.type, name: el.name, x: el.x, y: el.y, w: el.w, h: el.h };
            if (el.gradient_start_hex) { slim.gradient_start_hex = el.gradient_start_hex; slim.gradient_end_hex = el.gradient_end_hex; slim.gradient_angle = el.gradient_angle; }
            if (el.r !== undefined && !el.gradient_start_hex) { slim.r = el.r; slim.g = el.g; slim.b = el.b; slim.a = el.a; }
            if (el.radius) slim.radius = el.radius;
            if (el.content) slim.content = el.content;
            if (el.font_size) slim.font_size = el.font_size;
            if (el.font_weight) slim.font_weight = el.font_weight;
            if (el.color_hex) slim.color_hex = el.color_hex;
            if (el.text_align) slim.text_align = el.text_align;
            if (el.letter_spacing) slim.letter_spacing = el.letter_spacing;
            if (el.line_height) slim.line_height = el.line_height;
            return slim;
        }), null, 1);
        prompt += '\n```\n\n';
    }

    prompt += `Study these examples. Notice:
- Background uses gradient, not flat color
- accent_zone creates DEPTH (low opacity overlay on part of canvas)
- accent_line is a thin 2-4px bar in the accent color near the headline
- tag_text uses ALL CAPS with wide letter_spacing (2-4px)
- Headline uses tight letter_spacing (-0.5 to -2px) and tight line_height (0.95-1.1)
- Subheadline uses the secondary color, not foreground
- CTA button text is vertically centered (button.y + button_padding = label.y)
- Decorative shapes use very low opacity (0.04-0.15)
- Elements are LEFT-ALIGNED for horizontal formats, CENTER for square/portrait
- Total: 8-12 elements per design, NOT more\n`;

    return prompt;
}
