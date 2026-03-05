// ─────────────────────────────────────────────────
// autoDesignService.ts — Auto-Design AI API calls
// ─────────────────────────────────────────────────
// Two design modes:
//
//  Mode A — From Scratch:
//    Empty canvas + text prompt → render_banner tool
//    → creates full layout from nothing
//
//  Mode B — Asset-Context (OpenPencil-style):
//    Canvas has 2-3 elements already (logo, image, text)
//    → AI reads screenshot + element list
//    → rearrange_banner tool repositions/resizes/recolors them
//
// Both modes feed into the Vision Feedback Loop
// (autoDesignLoop.ts) after initial placement.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import { classifyRatio, LAYOUT_ZONES } from '@/engine/smartSizing';

// ── Shared Types ────────────────────────────────────

export interface RenderElement {
    type: 'rect' | 'rounded_rect' | 'ellipse' | 'text';
    x: number;
    y: number;
    w: number;
    h: number;
    // Shape colors (0.0–1.0)
    r?: number;
    g?: number;
    b?: number;
    a?: number;
    radius?: number;
    // Text
    content?: string;
    font_size?: number;
    font_weight?: string;
    color_hex?: string;
    text_align?: string;
    // Naming
    name?: string;
}

export interface RearrangePatch {
    /** Must exactly match an existing layer __aceName */
    elementName: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    fontSize?: number;
    fill?: string;  // hex #rrggbb
}

export interface FromScratchResult {
    mode: 'from_scratch';
    elements: RenderElement[];
}

export interface AssetContextResult {
    mode: 'asset_context';
    patches: RearrangePatch[];
    /** New text/shape elements to ADD (supplement existing assets) */
    additions?: RenderElement[];
}

export type AutoDesignResult = FromScratchResult | AssetContextResult;

// ── Canvas element context (passed from hook) ─────────────

export interface CanvasElementInfo {
    id: number;
    name: string;
    type: string;  // 'text' | 'rect' | 'image' | 'video'
    x: number;
    y: number;
    w: number;
    h: number;
}

// ── Tool Schemas ──────────────────────────────────────────

const RENDER_BANNER_TOOL = {
    name: 'render_banner',
    description: 'Create a full banner ad layout from scratch. Define all visual elements.',
    input_schema: {
        type: 'object',
        required: ['elements'],
        properties: {
            elements: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['rect', 'rounded_rect', 'ellipse', 'text'] },
                        name: { type: 'string' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        r: { type: 'number' }, g: { type: 'number' },
                        b: { type: 'number' }, a: { type: 'number' },
                        radius: { type: 'number' },
                        content: { type: 'string' },
                        font_size: { type: 'number' },
                        font_weight: { type: 'string' },
                        color_hex: { type: 'string' },
                        text_align: { type: 'string' },
                    },
                },
            },
        },
    },
};

const REARRANGE_BANNER_TOOL = {
    name: 'rearrange_banner',
    description: [
        'Reorganize existing banner elements into a polished, professional layout.',
        'You can move, resize, recolor existing elements.',
        'You can also ADD new text/shape elements to fill gaps.',
        'Do NOT reference elements that do not exist in the provided list.',
    ].join(' '),
    input_schema: {
        type: 'object',
        required: ['patches'],
        properties: {
            patches: {
                type: 'array',
                description: 'Changes to existing elements.',
                items: {
                    type: 'object',
                    required: ['elementName'],
                    properties: {
                        elementName: { type: 'string', description: 'Exact layer name from the list.' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        fontSize: { type: 'number' },
                        fill: { type: 'string', description: 'Hex color e.g. #ff6600' },
                    },
                },
            },
            additions: {
                type: 'array',
                description: 'New elements to add (text labels, CTA buttons, decorative shapes).',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['rect', 'rounded_rect', 'text'] },
                        name: { type: 'string' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        r: { type: 'number' }, g: { type: 'number' },
                        b: { type: 'number' }, a: { type: 'number' },
                        radius: { type: 'number' },
                        content: { type: 'string' },
                        font_size: { type: 'number' },
                        font_weight: { type: 'string' },
                        color_hex: { type: 'string' },
                        text_align: { type: 'string' },
                    },
                },
            },
        },
    },
};

// ── System Prompts ────────────────────────────────────────

function buildFromScratchPrompt(canvasW: number, canvasH: number): string {
    const ratio = classifyRatio(canvasW, canvasH);
    const zones = LAYOUT_ZONES[ratio];

    // Compute exact pixel positions for each element from zone percentages
    const bgX = 0, bgY = 0, bgW = canvasW, bgH = canvasH;
    const hlX = Math.round(zones.headline.x * canvasW);
    const hlY = Math.round(zones.headline.y * canvasH);
    const hlW = Math.round(zones.headline.w * canvasW);
    const ctaX = Math.round(zones.cta.x * canvasW);
    const ctaY = Math.round(zones.cta.y * canvasH);
    const ctaW = Math.round(zones.cta.w * canvasW);
    const ctaH = Math.round(zones.cta.h * canvasH);

    // Font sizes scaled to canvas
    const hlFontMin = Math.max(14, Math.round(canvasH * 0.08));
    const hlFontMax = Math.max(18, Math.round(canvasH * 0.15));
    const ctaFont = Math.max(12, Math.round(canvasH * 0.06));

    // Layout descriptions per ratio
    const descriptions: Record<string, string> = {
        'ultra-wide': 'Horizontal: logo LEFT, headline CENTER, CTA RIGHT. Leaderboard ad.',
        'wide': 'Two-section: headline LEFT/CENTER, CTA RIGHT. Wide banner.',
        'landscape': 'Standard banner: headline top-center, CTA bottom-center.',
        'square': 'Social post (1:1): everything CENTER-ALIGNED horizontally.',
        'portrait': 'Vertical social (4:5, 9:16): logo TOP, headline MIDDLE, CTA near BOTTOM. Center-aligned.',
        'ultra-tall': 'Skyscraper: logo TOP, headline MIDDLE, CTA BOTTOM. Vertical center-aligned.',
    };
    const desc = descriptions[ratio] ?? 'Balanced layout.';

    return `You are a professional banner ad designer. Create a ${canvasW}x${canvasH}px banner.
Category: ${ratio}. ${desc}

YOU MUST place elements at EXACTLY these positions (calculated for this ratio):

[0] background — rect
    x=${bgX}, y=${bgY}, w=${bgW}, h=${bgH}
    name: "background"

[1] headline — text
    x=${hlX}, y=${hlY}, w=${hlW}
    name: "headline"

[2] cta_button — rounded_rect
    x=${ctaX}, y=${ctaY}, w=${ctaW}, h=${ctaH}, radius=10
    name: "cta_button"

[3] cta_label — text (centered on cta_button)
    x=${ctaX}, y=${ctaY + Math.round(ctaH * 0.2)}, w=${ctaW}
    name: "cta_label"

STRICT RULES:
1. Return EXACTLY 4 elements in this order
2. Use the exact x/y/w values above — do NOT change them
3. Shapes: use r/g/b floats (0.0-1.0). Text: use color_hex ("#ffffff")
4. Background and CTA button must have DIFFERENT, contrasting colors
5. headline font_size: ${hlFontMin}-${hlFontMax}px, font_weight "800", text_align "center"
6. cta_label font_size: ${ctaFont}px, font_weight "700", text_align "center"
7. Use the exact element names: "background", "headline", "cta_button", "cta_label"

Return ONLY the render_banner tool call. No text outside.`;
}


function buildAssetContextPrompt(
    canvasW: number,
    canvasH: number,
    elements: CanvasElementInfo[],
    userPrompt: string,
): string {
    const elementList = elements
        .map(e => `  - "${e.name}" (${e.type}, at ${e.x},${e.y}, size ${e.w}x${e.h})`)
        .join('\n');
    const tooMany = elements.length >= 4;

    return `You are a professional banner ad designer. Reorganize a ${canvasW}x${canvasH}px banner.

EXISTING elements on canvas:
${elementList}

User directive: "${userPrompt}"

CRITICAL RULES:
1. Use rearrange_banner "patches" to REPOSITION/RESIZE/RECOLOR existing elements.
2. ${tooMany
            ? `DO NOT add any new elements via "additions" — canvas already has ${elements.length} elements. Just reorganize what's there.`
            : 'You may add 1-2 new text elements max via "additions" (headline or CTA label only — no new shapes).'
        }
3. NO OVERLAP: Check all positions carefully. Stack elements vertically with ≥12px gap.
4. BOUNDS: All elements must stay within canvas: x 0–${canvasW}, y 0–${canvasH}.
5. Patches must reference EXACT element names from the list above.
6. Images/videos: keep them as backgrounds (x=0,y=0) or hero areas — never overlap text.

Return ONLY the rearrange_banner tool call.`;
}

// ── API Calls ─────────────────────────────────────────────

export async function callFromScratch(
    prompt: string,
    canvasW: number,
    canvasH: number,
    apiKey: string,
    signal: AbortSignal,
): Promise<FromScratchResult> {
    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 2048,
        system: buildFromScratchPrompt(canvasW, canvasH),
        tools: [RENDER_BANNER_TOOL],
        tool_choice: { type: 'tool', name: 'render_banner' },
        messages: [{ role: 'user', content: prompt }],
    };

    const data = await callAnthropicApi(apiKey, body, signal) as {
        content: Array<{ type: string; name?: string; input?: unknown }>;
    };

    const toolUse = data.content.find(c => c.type === 'tool_use' && c.name === 'render_banner');
    if (!toolUse?.input) throw new Error('AI did not return a banner layout. Please try again.');

    const input = toolUse.input as { elements?: RenderElement[] };
    return { mode: 'from_scratch', elements: input.elements ?? [] };
}

export async function callAssetContext(
    prompt: string,
    screenshot: string,
    elements: CanvasElementInfo[],
    canvasW: number,
    canvasH: number,
    apiKey: string,
    signal: AbortSignal,
): Promise<AssetContextResult> {
    const systemPrompt = buildAssetContextPrompt(canvasW, canvasH, elements, prompt);

    // Strip data URL prefix
    const pureBase64 = screenshot.startsWith('data:')
        ? screenshot.split(',')[1] ?? screenshot
        : screenshot;

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        tools: [REARRANGE_BANNER_TOOL],
        tool_choice: { type: 'tool', name: 'rearrange_banner' },
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/png',
                            data: pureBase64,
                        },
                    },
                    {
                        type: 'text',
                        text: `Here is the current canvas. Please reorganize these ${elements.length} elements into a polished banner: "${prompt}"`,
                    },
                ],
            },
        ],
    };

    const data = await callAnthropicApi(apiKey, body, signal) as {
        content: Array<{ type: string; name?: string; input?: unknown }>;
    };

    const toolUse = data.content.find(c => c.type === 'tool_use' && c.name === 'rearrange_banner');
    if (!toolUse?.input) throw new Error('AI did not return layout patches. Please try again.');

    const input = toolUse.input as { patches?: RearrangePatch[]; additions?: RenderElement[] };
    return {
        mode: 'asset_context',
        patches: input.patches ?? [],
        additions: input.additions ?? [],
    };
}
