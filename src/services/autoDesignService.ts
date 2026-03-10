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
import { classifyRatio, LAYOUT_ZONES, classifyMasterGroup, getMasterGroupDescriptions } from '@/engine/smartSizing';
import { selectStyleGuide, buildStylePromptForAI } from '@/services/designStyleGuides';

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
    // Gradient (for rect/rounded_rect background)
    gradient_start_hex?: string;
    gradient_end_hex?: string;
    gradient_angle?: number;
    // Text
    content?: string;
    font_size?: number;
    font_weight?: string;
    color_hex?: string;
    text_align?: string;
    letter_spacing?: number;
    line_height?: number;
    // Naming
    name?: string;
}

export interface RearrangePatch {
    elementName: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    fontSize?: number;
    fill?: string;
}

export interface FromScratchResult {
    mode: 'from_scratch';
    elements: RenderElement[];
}

export interface AssetContextResult {
    mode: 'asset_context';
    patches: RearrangePatch[];
    additions?: RenderElement[];
}

export type AutoDesignResult = FromScratchResult | AssetContextResult;

export interface CanvasElementInfo {
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

// ── Tool Schemas ──────────────────────────────────────────

const RENDER_BANNER_TOOL = {
    name: 'render_banner',
    description: 'Create a professional creative layout with layered composition. Generate 8-15 elements across structure, content, action, and polish layers.',
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
                        name: { type: 'string', description: 'Descriptive name: background, accent_bar, headline, subheadline, cta_button, cta_label, divider, tag_badge, brand_mark, etc.' },
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
                        letter_spacing: { type: 'number', description: 'px. Tight for headlines (-0.5 to -1.5), wide for labels (+1 to +3).' },
                        line_height: { type: 'number', description: 'Multiplier. 1.0–1.15 headlines, 1.3–1.6 body.' },
                        gradient_start_hex: { type: 'string' },
                        gradient_end_hex: { type: 'string' },
                        gradient_angle: { type: 'number' },
                    },
                },
            },
        },
    },
};

const REARRANGE_BANNER_TOOL = {
    name: 'rearrange_banner',
    description: 'Reorganize existing elements into a polished layout. Move, resize, recolor existing elements and add new ones.',
    input_schema: {
        type: 'object',
        required: ['patches'],
        properties: {
            patches: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['elementName'],
                    properties: {
                        elementName: { type: 'string' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        fontSize: { type: 'number' },
                        fill: { type: 'string' },
                    },
                },
            },
            additions: {
                type: 'array',
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
                        letter_spacing: { type: 'number' },
                        line_height: { type: 'number' },
                    },
                },
            },
        },
    },
};

// ── From-Scratch Prompt — Hierarchical Composition ────────

function buildFromScratchPrompt(canvasW: number, canvasH: number, userPrompt: string): string {
    const ratio = classifyRatio(canvasW, canvasH);
    const zones = LAYOUT_ZONES[ratio];
    const masterGroup = classifyMasterGroup(canvasW, canvasH);
    const groupDescriptions = getMasterGroupDescriptions();
    const masterGroupDesc = groupDescriptions[masterGroup];

    // Style guide auto-selection
    const guide = selectStyleGuide(userPrompt);
    const stylePrompt = buildStylePromptForAI(guide, canvasW, canvasH);

    // Layout descriptions per ratio
    const layoutHints: Record<string, string> = {
        'ultra-wide': 'Horizontal strip. Content flows LEFT to RIGHT. Text left 55%, CTA right edge. Single headline line.',
        'wide': 'Wide landscape. Two zones: content left/center, CTA right. Keep text compact.',
        'landscape': 'Standard rectangle. Headline upper-center, supporting text mid, CTA bottom-center.',
        'square': 'Social format. CENTER everything. Bold headline dominates. CTA bottom third.',
        'portrait': 'Vertical flow. TOP-DOWN reading: headline upper, supporting mid, CTA bottom quarter.',
        'ultra-tall': 'Skyscraper. Strict vertical stack. All center-aligned. Generous spacing between zones.',
    };

    // Zone positions as percentages for AI guidance (not rigid pixels)
    const safe = guide.spacing.safe;
    const contentStart = { x: Math.round(zones.headline.x * canvasW), y: Math.round(zones.headline.y * canvasH) };
    const contentW = Math.round(zones.headline.w * canvasW);
    const ctaZone = {
        x: Math.round(zones.cta.x * canvasW),
        y: Math.round(zones.cta.y * canvasH),
        w: Math.round(zones.cta.w * canvasW),
        h: Math.round(zones.cta.h * canvasH),
    };

    // Font sizes from style guide
    const minDim = Math.min(canvasW, canvasH);
    const fonts = {
        hero: Math.max(18, Math.round(minDim * guide.typography.scale.hero)),
        headline: Math.max(16, Math.round(minDim * guide.typography.scale.headline)),
        title: Math.max(14, Math.round(minDim * guide.typography.scale.title)),
        body: Math.max(11, Math.round(minDim * guide.typography.scale.body)),
        caption: Math.max(9, Math.round(minDim * guide.typography.scale.caption)),
    };

    return `You are a world-class creative director at a premium design agency.
You produce ${canvasW}x${canvasH}px creatives that rival Apple, Airbnb, and Nike quality.

Canvas: ${canvasW}x${canvasH}px (${ratio} format)
${layoutHints[ratio] ?? 'Balanced layout.'}
${masterGroupDesc}

${stylePrompt}

═══════════════════════════════════════════════════
DESIGN PRINCIPLES (Pencil-grade quality)
═══════════════════════════════════════════════════

DOMINANT REGION RULE:
  One area of the design must visually dominate. The headline is your focal point.
  All other elements are subordinate. Avoid equal-weight layouts.

SPATIAL LOGIC:
  Use ONE dominant axis (horizontal for wide, vertical for tall).
  Prefer two structural zones before three. Let whitespace create separation.
  Structure over ornament — every element must serve a purpose.

VISUAL HIERARCHY:
  Size + weight + color establish importance: Headline > Subheadline > Body > CTA label.
  Never use the same font size for two different hierarchy levels.

CONSTRAINT OVER DECORATION:
  If an element does not support understanding, decision-making, or action, remove it.
  But DO add elements that create depth and visual richness (accent bars, subtle shapes).

═══════════════════════════════════════════════════
LAYERED COMPOSITION — Generate 8-15 elements in this order:
═══════════════════════════════════════════════════

LAYER 1: STRUCTURE (2-3 elements)
  [background]  Full canvas rect with gradient. Use style guide gradient colors.
                x=0, y=0, w=${canvasW}, h=${canvasH}, name="background"
  [accent_zone] A secondary rect creating depth. Examples:
                - Darker/lighter rectangle covering 30-50% of canvas
                - Subtle gradient overlay on one side
                - Semi-transparent panel behind text area (a=0.3-0.5)
                name="accent_zone"

LAYER 2: CONTENT (3-4 elements)
  [headline]    The dominant text. MUST be the largest, boldest element.
                Font: ${fonts.hero}px, weight="${guide.typography.weights.bold}", "${guide.typography.primaryFont}"
                Color: ${guide.colors.foreground}
                Position: around x=${contentStart.x}, y=${contentStart.y}, w=${contentW}
                Letter spacing: ${guide.typography.letterSpacing.tight}px
                name="headline"
  [subheadline] Supporting text BELOW headline with clear gap (min ${Math.round(fonts.hero * 0.4)}px).
                Font: ${fonts.body}px, weight="${guide.typography.weights.normal}", "${guide.typography.secondaryFont}"
                Color: ${guide.colors.secondary}
                name="subheadline"
  [body_text]   Optional extra detail (1 short line). Only if canvas has room.
                Font: ${fonts.caption}px, color: ${guide.colors.tertiary}
                name="body_text" (skip if canvas < 200px in any dimension)

LAYER 3: ACTION (2-3 elements)
  [cta_button]  Rounded rect button. MUST contrast strongly with background.
                Background: ${guide.colors.accent}, radius=${guide.radius}
                Position: around x=${ctaZone.x}, y=${ctaZone.y}, w=${ctaZone.w}, h=${ctaZone.h}
                name="cta_button"
  [cta_label]   Text centered on cta_button. ALL CAPS.
                Font: ${fonts.title}px, weight="${guide.typography.weights.semibold}"
                Color: ${guide.colors.accentForeground}
                Vertically centered inside button
                name="cta_label"

LAYER 4: POLISH (2-4 elements — these create "premium" feel)
  [accent_line] Thin accent bar (2-4px height or width) in accent color.
                Place near headline or between content zones as a visual separator.
                name="accent_line"
  [tag_badge]   Small label like "NEW", "LIMITED", "2024" — uppercase, tiny font.
                Rect with text overlay. Font: ${fonts.caption}px, weight="700"
                Background: ${guide.colors.accent}, text: ${guide.colors.accentForeground}
                Position: above headline or top corner.
                name="tag_badge", tag text name="tag_text"
  [decorative]  ONE subtle geometric shape: small circle, thin line, or corner accent.
                Low opacity (a=0.05-0.15). Creates depth without clutter.
                name="decorative_shape" (skip if canvas is very small)

═══════════════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE:
═══════════════════════════════════════════════════

1. NO TEXT OVERLAP — Every text bounding box must have min ${Math.max(8, Math.round(fonts.body * 0.5))}px gap from all other text
2. ALL elements within canvas bounds: x >= 0, y >= 0, x+w <= ${canvasW}, y+h <= ${canvasH}
3. Minimum ${safe}px from canvas edges for all text elements
4. CTA text MUST be centered on CTA button (same x, same w, y vertically centered)
5. Use ONLY colors from the style guide palette above — do NOT invent colors
6. Element names must be unique and descriptive
7. Elements ordered by z-index: background first, decorative last

User prompt: "${userPrompt}"
Write SHORT, impactful ad copy. No lorem ipsum. Real creative content.

Return ONLY the render_banner tool call. No explanation.`;
}


function buildAssetContextPrompt(
    canvasW: number,
    canvasH: number,
    elements: CanvasElementInfo[],
    userPrompt: string,
    hasImages = false,
): string {
    const elementList = elements
        .map(e => `  - "${e.name}" (${e.type}, at ${e.x},${e.y}, size ${e.w}x${e.h})`)
        .join('\n');

    const ratio = classifyRatio(canvasW, canvasH);
    const zones = LAYOUT_ZONES[ratio];

    // Compute layout zones for this canvas
    const hlX = Math.round(zones.headline.x * canvasW);
    const hlY = Math.round(zones.headline.y * canvasH);
    const hlW = Math.round(zones.headline.w * canvasW);
    const ctaX = Math.round(zones.cta.x * canvasW);
    const ctaY = Math.round(zones.cta.y * canvasH);
    const ctaW = Math.round(zones.cta.w * canvasW);
    const ctaH = Math.round(zones.cta.h * canvasH);
    const pad = Math.max(10, Math.round(Math.min(canvasW, canvasH) * 0.05));
    const hlFontSize = Math.max(18, Math.round(canvasH * 0.1));
    const subFontSize = Math.max(12, Math.round(canvasH * 0.055));
    const ctaFontSize = Math.max(12, Math.round(canvasH * 0.06));

    // Image placement: right side for landscape, center for portrait/near-square
    const isLandscape = canvasW > canvasH * 1.2;
    let imgX: number, imgY: number, imgW: number, imgH: number;
    if (isLandscape) {
        // Right 45% of canvas
        imgW = Math.round(canvasW * 0.45);
        imgH = canvasH;
        imgX = canvasW - imgW;
        imgY = 0;
    } else {
        // Upper 50% of canvas
        imgW = canvasW;
        imgH = Math.round(canvasH * 0.5);
        imgX = 0;
        imgY = 0;
    }

    // Text zone: left side for landscape, bottom for portrait
    const textAreaY = isLandscape ? Math.round(canvasH * 0.15) : Math.round(canvasH * 0.52);
    const textAreaX = isLandscape ? pad : pad;
    const textAreaW = isLandscape ? Math.round(canvasW * 0.5) : canvasW - 2 * pad;
    const subY = textAreaY + hlFontSize + 12;
    const ctaFinalX = isLandscape ? textAreaX : ctaX;
    const ctaFinalY = isLandscape ? ctaY : Math.min(ctaY, canvasH - ctaH - pad);

    const imageNames = elements.filter(e => e.type === 'image').map(e => `"${e.name}"`).join(', ');
    const hasImagesOnCanvas = hasImages || elements.some(e => e.type === 'image');

    return `You are a world-class banner ad designer. Create a COMPLETE, polished ${canvasW}x${canvasH}px design.

EXISTING ELEMENTS (keep their names exact for patches):
${elementList}

User request: "${userPrompt}"

YOUR TASK: Transform this into a PROFESSIONAL banner by:

1. PATCHES (modify existing elements):
${hasImages ? `   - Move image(s) [${imageNames}] to hero position: x=${imgX}, y=${imgY}, w=${imgW}, h=${imgH}` : ''}
   - Reposition any text/shapes as needed

2. ADDITIONS (you MUST add these — no exceptions):
   a) BACKGROUND: full-canvas rect (x=0, y=0, w=${canvasW}, h=${canvasH}) with a strong brand color
      → name: "background", place this FIRST (lowest zIndex)
${hasImagesOnCanvas ? `   b) OVERLAY: semi-transparent dark rect over image area for text contrast
      → x=${isLandscape ? 0 : 0}, y=${isLandscape ? 0 : Math.round(canvasH * 0.48)}, w=${isLandscape ? Math.round(canvasW * 0.55) : canvasW}, h=${isLandscape ? canvasH : Math.round(canvasH * 0.52)}
      → r=0, g=0, b=0, a=0.45, name: "overlay"` : ''}
   c) HEADLINE: bold text centered in text zone
      → x=${textAreaX}, y=${textAreaY}, w=${textAreaW}
      → font_size=${hlFontSize}, font_weight="800", text_align="${isLandscape ? 'left' : 'center'}"
      → color_hex="#FFFFFF", name: "headline"
   d) SUBHEADLINE: supporting text below headline
      → x=${textAreaX}, y=${subY}, w=${textAreaW}
      → font_size=${subFontSize}, font_weight="500", text_align="${isLandscape ? 'left' : 'center'}"
      → color_hex="#E0E0E0", name: "subheadline"
   e) CTA BUTTON: rounded rect button
      → x=${ctaFinalX}, y=${ctaFinalY}, w=${ctaW}, h=${ctaH}, radius=8
      → bright contrasting accent color (NOT same as background), name: "cta_button"
   f) CTA LABEL: text centered on CTA button
      → x=${ctaFinalX}, y=${ctaFinalY + Math.round((ctaH - ctaFontSize) / 2)}, w=${ctaW}
      → font_size=${ctaFontSize}, font_weight="700", text_align="center"
      → color_hex="#FFFFFF", name: "cta_label"

STRICT RULES:
- Generate REAL ad copy based on the image context and user prompt (no lorem ipsum)
- Background and CTA must have STRONGLY CONTRASTING colors (e.g. dark navy bg + orange CTA)
- ALL elements must be within canvas bounds: x: 0–${canvasW}, y: 0–${canvasH}
- Minimum ${pad}px padding from canvas edges for text
- Additions array order matters — background must be FIRST, then overlay, then text on top
- The image element zIndex is already managed — do not try to reorder it via patches

Return ONLY the rearrange_banner tool call.`;
}

// ── API Calls ─────────────────────────────────────────────

export async function callFromScratch(
    prompt: string,
    canvasW: number,
    canvasH: number,
    signal: AbortSignal,
    fewShotExamples: string = '',
): Promise<FromScratchResult> {
    const systemPrompt = buildFromScratchPrompt(canvasW, canvasH, prompt);
    const fullSystem = fewShotExamples
        ? `${fewShotExamples}\n${systemPrompt}`
        : systemPrompt;

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 2048,
        system: fullSystem,
        tools: [RENDER_BANNER_TOOL],
        tool_choice: { type: 'tool', name: 'render_banner' },
        messages: [{ role: 'user', content: prompt }],
    };

    const data = await callAnthropicApi(body, signal) as {
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
    signal: AbortSignal,
    hasImages = false,
): Promise<AssetContextResult> {
    const systemPrompt = buildAssetContextPrompt(canvasW, canvasH, elements, prompt, hasImages);

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

    const data = await callAnthropicApi(body, signal) as {
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
