// ─────────────────────────────────────────────────
// visionLegacy — Legacy callVisionCheck() compat
// ─────────────────────────────────────────────────
// @deprecated: Use analyzeDesign() for new code.
// Preserved for backward compatibility with autoDesignLoop.

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';

export interface LegacyVisionIssue {
    element: string;
    problem: 'text_overflow' | 'too_small' | 'overlap' | 'misaligned' | 'off_center' | 'low_contrast' | 'cta_not_prominent' | 'poor_hierarchy';
    severity: 'error' | 'warning';
    detail?: string;
}

export interface LegacyVisionPatch {
    elementName: string;
    x?: number; y?: number; w?: number; h?: number;
    fontSize?: number;
}

export interface VisionResult {
    score: number;
    issues: LegacyVisionIssue[];
    patches: LegacyVisionPatch[];
    reasoning: string;
}

/**
 * @deprecated Use analyzeDesign() for new code.
 */
export async function callVisionCheck(
    base64Png: string,
    canvasW: number,
    canvasH: number,
    category: string,
    elements: Array<{ name: string; role?: string; type: string }>,
): Promise<VisionResult> {
    const pureBase64 = base64Png.startsWith('data:') ? base64Png.split(',')[1] ?? base64Png : base64Png;
    const elementList = elements.map((e) => `  - "${e.name}" (type: ${e.type}, role: ${e.role ?? 'unknown'})`).join('\n');

    const prompt = `You are a professional banner ad designer reviewing a resized layout.

Canvas: ${canvasW}x${canvasH}px (category: ${category})
Elements present:
${elementList}

Analyze this banner image for visual quality. Return ONLY valid JSON:
{
  "score": <0-100>,
  "issues": [{ "element": "<name>", "problem": "<text_overflow|too_small|overlap|misaligned|off_center|low_contrast|cta_not_prominent|poor_hierarchy>", "severity": "<error|warning>", "detail": "<brief>" }],
  "patches": [{ "elementName": "<name>", "x": <num>, "y": <num>, "w": <num>, "h": <num>, "fontSize": <num> }],
  "reasoning": "<1-2 sentence summary>"
}

Check: readability, hierarchy, CTA prominence, whitespace, clipping.
Return ONLY JSON.`;

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pureBase64 } },
            { type: 'text', text: prompt },
        ] }],
    };

    const data = await callAnthropicApi(body) as { content: Array<{ type: string; text?: string }> };
    const rawText = data.content.find(c => c.type === 'text')?.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Vision API returned non-JSON: ${rawText.slice(0, 200)}`);
    return JSON.parse(jsonMatch[0]) as VisionResult;
}
