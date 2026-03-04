// ─────────────────────────────────────────────────
// visionService.ts — Claude Vision API Bridge
// ─────────────────────────────────────────────────
// Sends a canvas screenshot (base64 PNG) to Claude Vision
// and gets back a structured layout quality report.
//
// Used by useSmartSizingVision hook after smart sizing
// to validate the result "like a human designer would."
// ─────────────────────────────────────────────────

export interface VisionIssue {
    element: string;
    problem:
    | 'text_overflow'
    | 'too_small'
    | 'overlap'
    | 'misaligned'
    | 'off_center'
    | 'low_contrast'
    | 'cta_not_prominent'
    | 'poor_hierarchy';
    severity: 'error' | 'warning';
    detail?: string;
}

export interface VisionPatch {
    /** Element name as it appears in the canvas */
    elementName: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    fontSize?: number;
}

export interface VisionResult {
    /** 0–100 overall design quality score */
    score: number;
    issues: VisionIssue[];
    patches: VisionPatch[];
    /** Raw AI explanation (for debugging / display) */
    reasoning: string;
}

// ── Prompt ─────────────────────────────────────────

function buildPrompt(
    canvasW: number,
    canvasH: number,
    category: string,
    elements: Array<{ name: string; role?: string; type: string }>,
): string {
    const elementList = elements
        .map((e) => `  - "${e.name}" (type: ${e.type}, role: ${e.role ?? 'unknown'})`)
        .join('\n');

    return `You are a professional banner ad designer reviewing a resized layout.

Canvas: ${canvasW}×${canvasH}px (category: ${category})
Elements present:
${elementList}

Analyze this banner image for visual quality. Return ONLY valid JSON with this exact structure:
{
  "score": <integer 0-100>,
  "issues": [
    {
      "element": "<element name from the list above>",
      "problem": "<text_overflow|too_small|overlap|misaligned|off_center|low_contrast|cta_not_prominent|poor_hierarchy>",
      "severity": "<error|warning>",
      "detail": "<brief explanation>"
    }
  ],
  "patches": [
    {
      "elementName": "<element name>",
      "x": <number or omit>,
      "y": <number or omit>,
      "w": <number or omit>,
      "h": <number or omit>,
      "fontSize": <number or omit>
    }
  ],
  "reasoning": "<1-2 sentence summary>"
}

Focus on:
1. Readability — can all text be read at this size?
2. Visual hierarchy — headline > subtext > CTA order clear?
3. CTA prominence — is the call-to-action button visible and accessible?
4. Whitespace balance — no crowding or excessive gaps?
5. Canvas utilization — elements not clipped or invisible?

Return ONLY the JSON object. No markdown, no explanation outside JSON.`;
}

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';

const CLAUDE_MODEL = DEFAULT_CLAUDE_MODEL;


/**
 * Call Claude Vision to evaluate a banner screenshot.
 *
 * @param base64Png - Base64-encoded PNG (from Fabric canvas.toDataURL())
 * @param canvasW - Canvas width in pixels
 * @param canvasH - Canvas height in pixels
 * @param category - Aspect ratio category (e.g. 'ultra-wide', 'portrait')
 * @param elements - List of elements on canvas with name/role/type
 * @param apiKey - Anthropic API key
 */
export async function callVisionCheck(
    base64Png: string,
    canvasW: number,
    canvasH: number,
    category: string,
    elements: Array<{ name: string; role?: string; type: string }>,
    apiKey: string,
): Promise<VisionResult> {
    // Strip data URL prefix if present
    const pureBase64 = base64Png.startsWith('data:')
        ? base64Png.split(',')[1] ?? base64Png
        : base64Png;

    const prompt = buildPrompt(canvasW, canvasH, category, elements);

    const body = {
        model: CLAUDE_MODEL,
        max_tokens: 1024,
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
                        text: prompt,
                    },
                ],
            },
        ],
    };

    const data = await callAnthropicApi(apiKey, body) as {
        content: Array<{ type: string; text?: string }>;
    };

    const rawText = data.content.find((c) => c.type === 'text')?.text ?? '';

    // Parse JSON — Claude sometimes wraps in ```json blocks
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error(`Vision API returned non-JSON response: ${rawText.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]) as VisionResult;
    return parsed;
}

