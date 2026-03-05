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
        'ultra-wide': 'Horizontal flow: headline LEFT, CTA RIGHT.',
        'wide': 'Background + headline top + CTA bottom-right.',
        'landscape': 'Background + headline center-top + CTA center-bottom.',
        'square': 'Background + headline center + CTA near bottom.',
        'portrait': 'Background + headline upper-third + CTA lower-third.',
        'ultra-tall': 'Background + headline top-third + CTA bottom-third.',
    };
    const guide = layoutGuides[ratio] ?? 'Background + headline + CTA.';
    const pad = 16;
    const ctaH = Math.round(canvasH * 0.12);
    const headlineY = Math.round(canvasH * 0.3);
    const ctaY = Math.round(canvasH * 0.72);

    return `You are a professional banner ad designer. Create a ${canvasW}x${canvasH}px banner.
Layout (${ratio}): ${guide}

YOU MUST FOLLOW THESE RULES — violations will cause visual bugs:

1. ELEMENT COUNT: Exactly 4 elements total:
   [0] background  — rect, x=0,y=0,w=${canvasW},h=${canvasH}
   [1] headline    — text, x=${pad},y=${headlineY},w=${canvasW - pad * 2}
   [2] cta_button  — rounded_rect, y≈${ctaY},h=${ctaH},radius=10
   [3] cta_label   — text inside/on cta_button

2. NO OVERLAP RULE: Each element must NOT overlap any other.
   - headline bottom edge = y + estimated_height
   - cta_button top edge must be > headline bottom + 12px gap
   - All elements: x ≥ ${pad}, right edge ≤ ${canvasW - pad}

3. BOUNDS: All elements must fit 100% inside canvas (0 to ${canvasW} wide, 0 to ${canvasH} tall)

4. COLORS:
   - Shapes: use r/g/b floats 0.0–1.0
   - Text: use color_hex only (e.g. "#ffffff")
   - Background and CTA button must have DIFFERENT colors
   - Text must have HIGH contrast against background

5. TYPOGRAPHY:
   - headline font_size: ${Math.round(canvasH * 0.14)}–${Math.round(canvasH * 0.18)}px, font_weight "800"
   - cta_label font_size: ${Math.round(canvasH * 0.07)}px, font_weight "700"
   - text_align: "center" for both

6. NAMES: Give exact names: "background", "headline", "cta_button", "cta_label"

Return ONLY the render_banner tool call with exactly 4 elements. No extra text.`;
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
