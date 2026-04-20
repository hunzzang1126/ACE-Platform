import { isAiAvailable } from '@/config/apiKeys';
import { callOpenRouterApi } from '@/services/openRouterClient';

/** Language metadata for translation quality */
const LANGUAGE_META: Record<string, { english: string; native: string; adStyle: string }> = {
    ko: { english: 'Korean', native: '한국어', adStyle: '짧고 강렬한 광고 문구. 존댓말 사용. 브랜드 톤 유지.' },
    ja: { english: 'Japanese', native: '日本語', adStyle: '丁寧語を使用。短くインパクトのある広告コピー。' },
    'zh-cn': { english: 'Chinese (Simplified)', native: '中文', adStyle: '简洁有力的广告文案。保持品牌调性。' },
    fr: { english: 'French', native: 'Français', adStyle: 'Copywriting publicitaire percutant. Ton professionnel.' },
    es: { english: 'Spanish', native: 'Español', adStyle: 'Copy publicitario impactante. Tono profesional y directo.' },
    de: { english: 'German', native: 'Deutsch', adStyle: 'Prägnanter Werbetext. Professioneller, direkter Ton.' },
    pt: { english: 'Portuguese', native: 'Português', adStyle: 'Copy publicitário impactante. Tom profissional.' },
    it: { english: 'Italian', native: 'Italiano', adStyle: 'Copy pubblicitario d\'impatto. Tono professionale.' },
};

function getLangMeta(code: string) {
    return LANGUAGE_META[code] ?? { english: code, native: code, adStyle: 'Professional advertising copy.' };
}

export interface TranslationInput {
    elements: { name: string; content: string }[];
    targetLang: string;
    sourceLang: string;
}

export interface TranslationResult {
    success: boolean;
    translations: Record<string, string>;
    error?: string;
}

/**
 * Translate ad copy using a dedicated, focused API call.
 * ★ Routes through the unified proxy — API key never touches the client in production.
 */
export async function translateAdCopy(input: TranslationInput): Promise<TranslationResult> {
    if (!isAiAvailable()) return { success: false, translations: {}, error: 'AI not available' };

    const targetMeta = getLangMeta(input.targetLang);
    const sourceMeta = getLangMeta(input.sourceLang);

    // Build element list for translation
    const elementList = input.elements
        .map(el => `"${el.name}": "${el.content}"`)
        .join('\n');

    const prompt = `You are a senior advertising copywriter specializing in ${targetMeta.english} marketing.

TASK: Translate these ad elements from ${sourceMeta.english} to ${targetMeta.english}.

SOURCE ELEMENTS:
${elementList}

RULES:
1. This is ADVERTISING COPY — not literal translation. Adapt for the target market.
2. Keep the same emotional impact and call-to-action urgency.
3. Match the original text LENGTH as closely as possible (important for design layout).
4. Use natural ${targetMeta.english} advertising language: ${targetMeta.adStyle}
5. Headlines should be punchy and memorable.
6. CTAs (Call-to-Action) should use strong action verbs native to the target language.
7. Never transliterate brand names or product names — keep them in their original form.
8. "Apple" the fruit = translate to local word. "Apple" the brand = keep as "Apple".

RESPOND WITH ONLY a valid JSON object mapping element names to translated text.
Example: {"Headline": "translated headline", "Subline": "translated subline"}
No markdown, no explanation, no code blocks. ONLY the JSON object.`;

    try {
        // ★ Use callOpenRouterApi — routes through Edge Function proxy in production
        const data = await callOpenRouterApi({
            model: 'anthropic/claude-sonnet-4',
            max_tokens: 1024,
            temperature: 0.3, // Low temp for consistent, high-quality translations
            messages: [{ role: 'user', content: prompt }],
        }) as { content?: Array<{ type: string; text?: string }> };

        const content = data.content?.find(c => c.type === 'text')?.text ?? '';

        // Parse JSON from response (strip any markdown fences if present)
        const cleaned = content.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const translations = JSON.parse(cleaned) as Record<string, string>;

        return { success: true, translations };
    } catch (err) {
        return { success: false, translations: {}, error: `Translation failed: ${err}` };
    }
}
