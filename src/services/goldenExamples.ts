// ─────────────────────────────────────────────────
// goldenExamples — Design reference prompt builder
// ─────────────────────────────────────────────────
// Example data → goldenExamplesData.ts
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';
import { premiumDark300x250, boldImpact300x250, electricDark728x90, warmNeutral1080x1080, cleanClinical160x600 } from './goldenExamplesData';

export interface GoldenExample {
    id: string; description: string; canvasW: number; canvasH: number;
    styleGuide: string; elements: RenderElement[];
}

export const GOLDEN_EXAMPLES: GoldenExample[] = [
    premiumDark300x250, boldImpact300x250, electricDark728x90,
    warmNeutral1080x1080, cleanClinical160x600,
];

/**
 * Build a few-shot prompt section from golden examples.
 * Picks the 2 most relevant examples based on style guide + aspect ratio.
 */
export function buildGoldenExamplePrompt(
    styleGuideId: string, canvasW: number, canvasH: number,
): string {
    const ratio = canvasW / canvasH;
    const scored = GOLDEN_EXAMPLES.map(ex => {
        let score = 0;
        if (ex.styleGuide === styleGuideId) score += 10;
        const ratioDiff = Math.abs(ratio - ex.canvasW / ex.canvasH);
        if (ratioDiff < 0.2) score += 5; else if (ratioDiff < 0.5) score += 3; else if (ratioDiff < 1.0) score += 1;
        return { ex, score };
    });
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
