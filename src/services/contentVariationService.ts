// ─────────────────────────────────────────────────
// contentVariationService — A/B Copy Variations
// ─────────────────────────────────────────────────
// Generates 3 copy variations in a single API call.
// Wraps callTemplateContent for fallback compatibility.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';

export interface ContentVariation {
    id: string;
    headline: string;
    subheadline: string;
    cta: string;
    tag: string;
    style: 'professional' | 'creative' | 'urgent';
}

/**
 * Generate 3 content variations in a single API call.
 * Returns variations array sorted: professional → creative → urgent.
 */
export async function generateContentVariations(
    prompt: string,
    canvasW: number,
    canvasH: number,
    templateName: string,
    signal: AbortSignal,
    language: string = 'English',
): Promise<ContentVariation[]> {

    const variationPrompt = `You are a senior advertising copywriter. Generate exactly 3 variations of ad copy for this request.

CANVAS: ${canvasW}×${canvasH}px | TEMPLATE: ${templateName} | LANGUAGE: ${language}

USER REQUEST: ${prompt}

Generate 3 DIFFERENT copy variations with these styles:
1. "professional" — Corporate, trustworthy, clean
2. "creative" — Bold, unexpected, memorable  
3. "urgent" — Action-driven, time-sensitive, compelling

RULES:
- Headlines: max 6 words in English, 8 characters in CJK
- Subheadlines: max 12 words, add context/benefit
- CTA: max 3 words, strong action verb
- Tag: max 3 words (optional badge text like "NEW", "50% OFF")
- Each variation must feel genuinely different, not just rewording
- Write in ${language}

Return ONLY valid JSON array:
[
  {"style":"professional","headline":"...","subheadline":"...","cta":"...","tag":"..."},
  {"style":"creative","headline":"...","subheadline":"...","cta":"...","tag":"..."},
  {"style":"urgent","headline":"...","subheadline":"...","cta":"...","tag":"..."}
]

No markdown, no explanation, ONLY the JSON array.`;

    try {
        const body = {
            model: DEFAULT_CLAUDE_MODEL,
            max_tokens: 512,
            temperature: 0.8, // Higher temp for diverse variations
            system: 'You are a professional copywriter. Return ONLY valid JSON arrays.',
            messages: [{ role: 'user' as const, content: variationPrompt }],
        };

        const data = await callAnthropicApi(body, signal) as {
            content: Array<{ type: string; text?: string }>;
        };

        const textBlock = data.content.find(c => c.type === 'text');
        if (!textBlock?.text) throw new Error('No variations generated');

        let raw = textBlock.text.trim();
        if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

        const parsed = JSON.parse(raw) as Array<Omit<ContentVariation, 'id'>>;
        if (!Array.isArray(parsed) || parsed.length < 2) throw new Error('Invalid variations format');

        // Add IDs and ensure exactly 3 variations
        return parsed.slice(0, 3).map((v, i) => ({
            id: `var-${i}`,
            headline: v.headline || 'Get Started',
            subheadline: v.subheadline || '',
            cta: v.cta || 'Learn More',
            tag: v.tag || '',
            style: v.style || (['professional', 'creative', 'urgent'] as const)[i],
        }));
    } catch (err) {
        console.warn('[ContentVariations] Failed, returning empty:', err);
        return [];
    }
}
