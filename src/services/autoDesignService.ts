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
    gradient_start_hex?: string; // e.g. "#0a1628"
    gradient_end_hex?: string;   // e.g. "#1a2e4a"
    gradient_angle?: number;     // degrees: 0=top→bottom, 90=left→right, 135=diagonal
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
                        letter_spacing: { type: 'number', description: 'Letter spacing in px. -0.5 for headlines (tight), 0 for body, 1–4 for labels.' },
                        line_height: { type: 'number', description: 'Line height multiplier. 1.0–1.2 for headlines, 1.4–1.6 for body text.' },
                        gradient_start_hex: { type: 'string', description: 'Start color of linear gradient (hex). Use for background instead of r/g/b.' },
                        gradient_end_hex: { type: 'string', description: 'End color of linear gradient (hex). Pair with gradient_start_hex.' },
                        gradient_angle: { type: 'number', description: 'Gradient angle in degrees. 0=top→bottom, 90=left→right, 135=diagonal.' },
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
                        letter_spacing: { type: 'number', description: 'Letter spacing in px. -0.5 for headlines (tight), 0 for body, 1–4 for labels.' },
                        line_height: { type: 'number', description: 'Line height multiplier. 1.0–1.2 for headlines, 1.4–1.6 for body text.' },
                    },
                },
            },
        },
    },
};

// ── System Prompts ────────────────────────────────────────

// ── Personality Detection ─────────────────────────────────
type DesignPersonality = 'financial' | 'sports' | 'health' | 'tech' | 'retail' | 'lifestyle';

function detectPersonality(prompt: string): DesignPersonality {
    const p = prompt.toLowerCase();
    if (/finance|bank|invest|insurance|legal|law|wealth|asset|fund|mortgage/.test(p)) return 'financial';
    if (/shoe|sport|run|gym|athletic|nike|adidas|fitness|workout|energy/.test(p)) return 'sports';
    if (/health|medical|doctor|wellness|clinic|care|pharma|hospital/.test(p)) return 'health';
    if (/tech|saas|app|software|cloud|ai|startup|digital|devops|api/.test(p)) return 'tech';
    if (/sale|shop|off|discount|buy|deal|promo|retail|fashion|store/.test(p)) return 'retail';
    return 'lifestyle';
}

const PERSONALITY_RULES: Record<DesignPersonality, string> = {
    financial: `
PERSONALITY: FINANCIAL / PROFESSIONAL
  - Background: dark navy (#0a1628), deep charcoal (#1a1a2e), or midnight blue — NEVER bright/saturated
  - Accent: gold (#c9a84c), muted gold (#b8943f), or steel blue (#4a7fa5)
  - Typography: clean geometric sans, normal-regular weight hierarchy, generous letter-spacing (1-2px on labels)
  - Layout: balanced symmetry, generous padding, MINIMAL clutter — max 4 elements per zone
  - Tone: STATIC, authoritative, trustworthy — NO dynamic shapes, NO playful elements`,
    sports: `
PERSONALITY: SPORTS / DYNAMIC
  - Background: deep black (#0a0a0a) or dark charcoal with bold accent
  - Accent: electric orange (#ff4500), bright red (#e60023), or neon yellow (#ffd700)
  - Typography: HEAVY weight (800-900), TIGHT letter-spacing (-1 to -2px for headline), condensed feel
  - Headline: ALL CAPS, maximum impact, font_size should be LARGE (canvas_h × 0.14-0.16)
  - Layout: asymmetric energy — text aligned left or right, CTA on opposite side
  - Tone: DYNAMIC, high-energy, bold contrasts`,
    health: `
PERSONALITY: HEALTH / WELLNESS
  - Background: clean white (#ffffff), soft mint (#f0f9f0), or light blue (#e8f4fd)
  - Accent: fresh green (#2ecc71) or calm teal (#17a589)
  - Typography: light-regular weight, open tracking (+0.5 to +1px), airy spacing
  - Layout: centered, breathing room between elements, not cramped
  - Tone: CALM, trustworthy, clean — NO hard shadows, NO sharp contrasts`,
    tech: `
PERSONALITY: TECH / SAAS
  - Background: dark (#0d1117) or very dark blue (#0a0e1a)
  - Accent: electric blue (#007aff), cyan (#00d4ff), or purple (#6c5ce7)
  - Typography: geometric mono-influenced sans, medium weight, normal tracking
  - CTA button: bright accent on dark — high contrast, crisp corners or small radius
  - Layout: grid-aligned, tight, precise
  - Tone: MODERN, precise, data-forward`,
    retail: `
PERSONALITY: RETAIL / PROMOTIONAL
  - Background: SATURATED primary or bold contrast (bright red, electric blue, etc.)
  - Accent: bright complementary — yellow on red, white on navy
  - Typography: BOLD, condensed or heavy weight, LARGE discount numbers
  - Sale numbers / percentages: make them ENORMOUS (font_size = canvas_h × 0.20-0.25)
  - Layout: DENSE, urgency-driven — CTA prominent and large
  - Tone: URGENT, high-energy, promotional`,
    lifestyle: `
PERSONALITY: LIFESTYLE / BRAND
  - Background: warm neutrals, soft gradients, elegant darks
  - Accent: warm tones (#e8b86d, #c4956a) or vibrant brand color
  - Typography: elegant weight progression, balanced spacing
  - Layout: centered or split, visually balanced
  - Tone: ASPIRATIONAL, premium, stylish`,
};

function buildFromScratchPrompt(canvasW: number, canvasH: number, userPrompt: string): string {
    const ratio = classifyRatio(canvasW, canvasH);
    const zones = LAYOUT_ZONES[ratio];
    const personality = detectPersonality(userPrompt);
    const personalityRule = PERSONALITY_RULES[personality];

    // Multi-Master: classify which layout group this canvas belongs to
    const masterGroup = classifyMasterGroup(canvasW, canvasH);
    const groupDescriptions = getMasterGroupDescriptions();
    const masterGroupDesc = groupDescriptions[masterGroup];

    // Compute exact pixel positions for each element from zone percentages
    const bgX = 0, bgY = 0, bgW = canvasW, bgH = canvasH;
    const hlX = Math.round(zones.headline.x * canvasW);
    const hlY = Math.round(zones.headline.y * canvasH);
    const hlW = Math.round(zones.headline.w * canvasW);
    const subY = Math.round(hlY + canvasH * 0.14); // subheadline always 14% below headline start
    const ctaX = Math.round(zones.cta.x * canvasW);
    const ctaY = Math.round(zones.cta.y * canvasH);
    const ctaW = Math.round(zones.cta.w * canvasW);
    const ctaH = Math.round(zones.cta.h * canvasH);
    const ctaLabelY = ctaY + Math.round(ctaH * 0.22);

    // Font sizes scaled to canvas — strict hierarchy
    const hlFont = Math.max(18, Math.round(canvasH * 0.12));
    const subFont = Math.round(hlFont * 0.58);   // 58% of headline
    const bodyFont = Math.round(hlFont * 0.44);  // 44% of headline
    const ctaFont = Math.round(hlFont * 0.55);   // 55% of headline

    // Layout descriptions per ratio
    const descriptions: Record<string, string> = {
        'ultra-wide': 'Horizontal strip: text LEFT HALF, CTA button RIGHT EDGE.',
        'wide': 'Two-section: headline LEFT/CENTER, CTA RIGHT side.',
        'landscape': 'Standard banner: headline top-center, CTA button bottom-center.',
        'square': 'Social post: everything CENTER-ALIGNED horizontally.',
        'portrait': 'Vertical: headline UPPER MIDDLE, subheadline below, CTA near BOTTOM.',
        'ultra-tall': 'Skyscraper: stacked top-to-bottom, all center-aligned.',
    };
    const desc = descriptions[ratio] ?? 'Balanced layout.';

    return `You are a senior banner ad designer producing ${canvasW}×${canvasH}px ads.
Layout format: ${ratio}. ${desc}
${personalityRule}

${masterGroupDesc}

═══════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE THESE:
═══════════════════════════════════════════

1. NO TEXT OVERLAP (most critical rule):
   - Each text element's bounding box must NOT intersect with any other text element
   - Minimum VERTICAL GAP between any two text layers: max(12, font_size × 0.3) px
   - If placing subheadline would overlap headline: move subheadline DOWN until gap is clear
   - NEVER place two text elements at the same Y coordinate

2. VISUAL HIERARCHY (never use same size for two levels):
   - Headline: font_size=${hlFont}px, font_weight="800" or "900", letter_spacing=-0.5
   - Subheadline: font_size=${subFont}px, font_weight="400"–"500", letter_spacing=0
   - Body copy (if any): font_size=${bodyFont}px, font_weight="400"
   - CTA label: font_size=${ctaFont}px, font_weight="700", text_align="center", ALL CAPS

3. GRADIENT BACKGROUND (preferred over flat color):
   - Use gradient_start_hex + gradient_end_hex for the background
   - Choose two colors 20-40 lightness units apart — NOT identical, NOT clashing
   - gradient_angle: 135 for diagonal, 180 for top→bottom, 90 for left→right

4. ELEMENT LIMITS — generate EXACTLY 5 elements in this order:
   [0] background (rect with gradient or solid)
   [1] headline (text)
   [2] subheadline (text) — MUST be positioned below headline with gap
   [3] cta_button (rounded_rect)
   [4] cta_label (text centered on cta_button)

═══════════════════════════════════════════
REQUIRED POSITIONS (calculated for ${canvasW}×${canvasH}):
═══════════════════════════════════════════

[0] background
    type="rect", x=${bgX}, y=${bgY}, w=${bgW}, h=${bgH}
    name="background"
    → Choose brand-appropriate colors based on personality above

[1] headline
    type="text", x=${hlX}, y=${hlY}, w=${hlW}
    name="headline", font_size=${hlFont}, font_weight="800"
    → Write the MAIN message from the prompt (impactful, short)

[2] subheadline  
    type="text", x=${hlX}, y=${subY}, w=${hlW}
    name="subheadline", font_size=${subFont}, font_weight="400"
    ⚠ VERIFY: y=${subY} must be at least ${Math.round(hlFont * 1.3 + 12)}px below headline y=${hlY}. If not, adjust DOWN.

[3] cta_button
    type="rounded_rect", x=${ctaX}, y=${ctaY}, w=${ctaW}, h=${ctaH}, radius=8
    name="cta_button"
    → High contrast to background — this is the action element

[4] cta_label
    type="text", x=${ctaX}, y=${ctaLabelY}, w=${ctaW}
    name="cta_label", font_size=${ctaFont}, font_weight="700", text_align="center"
    → SHORT action phrase: "SHOP NOW", "GET STARTED", "LEARN MORE" etc.

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
