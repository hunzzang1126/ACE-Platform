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
import { classifyRatio } from '@/engine/smartSizing';

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
    const layoutGuides: Record<string, string> = {
        'ultra-wide': 'Horizontal: logo LEFT, headline CENTER, CTA RIGHT.',
        'wide': 'Two-column: image left, text+CTA right.',
        'landscape': 'Stack: bg fills canvas, headline top-center, CTA bottom-center.',
        'square': 'Compact: bg fills, logo top-left, headline center, CTA bottom-center.',
        'portrait': 'Vertical: logo top, hero area, headline, CTA bottom with 20px padding.',
        'ultra-tall': 'Skyscraper: logo top, image, headline, CTA bottom.',
    };
    const guide = layoutGuides[ratio] ?? 'Balanced layout.';

    return `You are an expert banner ad designer creating a ${canvasW}×${canvasH}px banner.
Layout guide for this ratio (${ratio}): ${guide}

RULES — must follow exactly:
1. Background rect: x=0, y=0, w=${canvasW}, h=${canvasH} — always first
2. Keep ALL elements within canvas bounds (0 to ${canvasW} wide, 0 to ${canvasH} tall)
3. Minimum 16px padding from canvas edges for text
4. NO elements overlapping each other (check y positions!)
5. Maximum 5 elements total (quality over quantity)
6. Text colors: use color_hex (#rrggbb). Shape colors: use r/g/b floats (0.0–1.0)
7. CTA button: use rounded_rect type with radius 8–12
8. Font sizes: headline 24–48px, subtext 14–20px, CTA label 14–18px font_weight "700"
9. Give every element a descriptive name: "background", "headline", "cta_button", "cta_label"

Return ONLY the render_banner tool call. No text outside the tool call.`;
}

function buildAssetContextPrompt(
    canvasW: number,
    canvasH: number,
    elements: CanvasElementInfo[],
    userPrompt: string,
): string {
    const elementList = elements
        .map(e => `  - "${e.name}" (${e.type}, pos: ${e.x},${e.y}, size: ${e.w}×${e.h})`)
        .join('\n');

    return `You are an expert banner ad designer. The user has placed ${elements.length} elements on a ${canvasW}×${canvasH}px canvas.

Existing elements:
${elementList}

User's style directive: "${userPrompt}"

Your job: reorganize these elements into a polished, professional banner ad layout.

RULES:
1. Use rearrange_banner to move/resize/recolor existing elements
2. Add NEW text or shape elements via "additions" if needed (headline, CTA button, labels)
3. Keep ALL elements within canvas: x 0–${canvasW}, y 0–${canvasH}
4. No overlapping — check positions carefully
5. Images/videos: reposition and size them as hero areas (never overlap text)
6. Add at minimum: a headline text and a CTA button if not already present
7. Background: if no background exists, add one in additions (rect full-canvas)
8. Give new elements descriptive names

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
