// ─────────────────────────────────────────────────────────
// screenshotScanService.ts — Vision-to-Design
// ─────────────────────────────────────────────────────────
// Takes a design screenshot → Claude Vision API analyzes it
// → Returns a JSON layout of editable ACE elements
// ─────────────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import type { RenderElement } from '@/services/autoDesignService';

// ── Font style classification → closest ACE font mapping ──
const FONT_STYLE_MAP: Record<string, string> = {
    // Display/Impact → bold headline fonts
    display: 'Anton',
    impact: 'Anton',
    condensed: 'Oswald',
    // Sans-serif
    sans: 'Plus Jakarta Sans',
    'sans-serif': 'Plus Jakarta Sans',
    geometric: 'Jost',
    // Serif
    serif: 'Playfair Display',
    // Mono
    mono: 'JetBrains Mono',
    monospace: 'JetBrains Mono',
    // Fallback
    default: 'Inter',
};

export function matchFont(detectedStyle: string): string {
    const s = (detectedStyle || '').toLowerCase();
    for (const [key, font] of Object.entries(FONT_STYLE_MAP)) {
        if (s.includes(key)) return font;
    }
    return FONT_STYLE_MAP['default']!;
}

// ── Scan result types ──────────────────────────────
export interface ScannedElement extends RenderElement {
    role: 'background' | 'headline' | 'subheadline' | 'body' | 'cta_button' | 'cta_label' | 'image' | 'shape' | 'other';
    font_style?: string; // 'sans', 'serif', 'display', 'mono'
    is_complex_bg?: boolean; // true if background needs AI image generation
}

export interface ScanResult {
    elements: ScannedElement[];
    canvasW: number;
    canvasH: number;
    hasComplexBackground: boolean;
    backgroundHint?: string; // description for image gen prompt
}

// ── Vision Scan System Prompt ──────────────────────
const SCAN_SYSTEM_PROMPT = `You are a precision design reverse-engineer. 
Your job: analyze a banner/ad screenshot and extract ALL visual elements as structured JSON.

For each element you identify, return:
- type: "rect" | "rounded_rect" | "text" | "image_placeholder"
- role: "background" | "headline" | "subheadline" | "body" | "cta_button" | "cta_label" | "shape" | "other"
- name: descriptive name matching the role
- x, y: top-left position IN PIXELS (relative to full image dimensions)
- w, h: width and height IN PIXELS
- For shapes: r, g, b as floats 0.0-1.0 for fill color. If gradient: gradient_start_hex, gradient_end_hex, gradient_angle
- For text: content (exact text), color_hex (#rrggbb), font_size (px), font_weight ("400"/"700"/"800"/"900"), text_align, font_style ("sans"/"serif"/"display"/"mono")
- radius: corner radius for rounded shapes (0 if sharp)
- z_index: visual stacking order (0=bottom, higher=front)
- is_complex_bg: true ONLY for complex photo/texture backgrounds that cannot be reproduced with solid/gradient

CRITICAL RULES:
1. Measure coordinates PRECISELY from image top-left (0,0)
2. Cover EVERY visible element — do not skip any
3. For background: if it's a solid color → use r/g/b. If gradient → gradient_start_hex + gradient_end_hex + gradient_angle. If photo/texture → is_complex_bg:true + description in name
4. Return elements sorted by z_index (background first, topmost last)
5. font_size must be in real pixels matching the screenshot scale`;

const SCAN_TOOL = {
    name: 'scan_design',
    description: 'Return all visual elements found in the design screenshot',
    input_schema: {
        type: 'object',
        required: ['elements', 'image_width', 'image_height'],
        properties: {
            image_width: { type: 'number', description: 'Full width of the screenshot in pixels' },
            image_height: { type: 'number', description: 'Full height of the screenshot in pixels' },
            background_description: { type: 'string', description: 'Brief description of background style (solid/gradient/photo/texture)' },
            elements: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['rect', 'rounded_rect', 'text', 'image_placeholder'] },
                        role: { type: 'string', enum: ['background', 'headline', 'subheadline', 'body', 'cta_button', 'cta_label', 'shape', 'other'] },
                        name: { type: 'string' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' },
                        gradient_start_hex: { type: 'string' },
                        gradient_end_hex: { type: 'string' },
                        gradient_angle: { type: 'number' },
                        color_hex: { type: 'string' },
                        content: { type: 'string' },
                        font_size: { type: 'number' },
                        font_weight: { type: 'string' },
                        font_style: { type: 'string' },
                        text_align: { type: 'string' },
                        radius: { type: 'number' },
                        z_index: { type: 'number' },
                        is_complex_bg: { type: 'boolean' },
                    },
                },
            },
        },
    },
};

// ── Main Scan Function ─────────────────────────────
export async function scanDesignScreenshot(
    imageBase64: string, // data:image/...;base64,... OR raw base64
    targetW: number,     // actual canvas width to scale to
    targetH: number,     // actual canvas height to scale to
    signal: AbortSignal,
): Promise<ScanResult> {
    // Strip data URL prefix if present
    const [header, pure] = imageBase64.includes(',')
        ? imageBase64.split(',') as [string, string]
        : ['data:image/png;base64', imageBase64];

    const mediaType = header.includes('jpeg') || header.includes('jpg')
        ? 'image/jpeg'
        : 'image/png';

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 4096,
        system: SCAN_SYSTEM_PROMPT,
        tools: [SCAN_TOOL],
        tool_choice: { type: 'tool', name: 'scan_design' },
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: mediaType, data: pure },
                    },
                    {
                        type: 'text',
                        text: `Analyze this design screenshot. Extract ALL elements with PRECISE pixel measurements. Target canvas size is ${targetW}×${targetH}px.`,
                    },
                ],
            },
        ],
    };

    const data = await callAnthropicApi(body, signal) as {
        content: Array<{ type: string; name?: string; input?: unknown }>;
    };

    const toolUse = data.content.find(c => c.type === 'tool_use' && c.name === 'scan_design');
    if (!toolUse?.input) throw new Error('Vision scan failed — no elements detected.');

    const input = toolUse.input as {
        elements: ScannedElement[];
        image_width: number;
        image_height: number;
        background_description?: string;
    };

    const srcW = input.image_width || targetW;
    const srcH = input.image_height || targetH;
    const scaleX = targetW / srcW;
    const scaleY = targetH / srcH;

    // Scale all coordinates to target canvas size
    const scaled: ScannedElement[] = input.elements.map(el => ({
        ...el,
        x: Math.round((el.x ?? 0) * scaleX),
        y: Math.round((el.y ?? 0) * scaleY),
        w: Math.round((el.w ?? 100) * scaleX),
        h: Math.round((el.h ?? 50) * scaleY),
        font_size: el.font_size ? Math.round(el.font_size * scaleY) : undefined,
        // Map detected font_style → closest available font family
        font_family: el.font_style ? matchFont(el.font_style) : 'Inter',
    }));

    const hasComplexBg = scaled.some(el => el.is_complex_bg);

    return {
        elements: scaled,
        canvasW: targetW,
        canvasH: targetH,
        hasComplexBackground: hasComplexBg,
        backgroundHint: input.background_description,
    };
}
