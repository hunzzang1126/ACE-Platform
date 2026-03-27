// ─────────────────────────────────────────────────
// autoDesignService — Auto-Design AI API calls
// ─────────────────────────────────────────────────
// Types + Tool Schemas → autoDesignTypes.ts
// Prompt Builders → autoDesignPrompts.ts
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import type { CanvasElementInfo, RenderElement, RearrangePatch, FromScratchResult, AssetContextResult } from './autoDesignTypes';
import { RENDER_BANNER_TOOL, REARRANGE_BANNER_TOOL } from './autoDesignTypes';
import { buildFromScratchPrompt, buildAssetContextPrompt } from './autoDesignPrompts';
import type { GeneratedContent } from '@/services/designTemplates';
import { buildContentPrompt } from '@/services/designTemplates';

// Re-export for backward compat
export * from './autoDesignTypes';

// ── API Calls ──

export async function callFromScratch(
    prompt: string, canvasW: number, canvasH: number,
    signal: AbortSignal, fewShotExamples: string = '',
): Promise<FromScratchResult> {
    const systemPrompt = buildFromScratchPrompt(canvasW, canvasH, prompt);
    const fullSystem = fewShotExamples ? `${fewShotExamples}\n${systemPrompt}` : systemPrompt;

    const body = {
        model: DEFAULT_CLAUDE_MODEL, max_tokens: 2048, system: fullSystem,
        tools: [RENDER_BANNER_TOOL], tool_choice: { type: 'tool', name: 'render_banner' },
        messages: [{ role: 'user', content: prompt }],
    };

    const data = await callAnthropicApi(body, signal) as { content: Array<{ type: string; name?: string; input?: unknown }> };
    const toolUse = data.content.find(c => c.type === 'tool_use' && c.name === 'render_banner');
    if (!toolUse?.input) throw new Error('AI did not return a banner layout. Please try again.');
    return { mode: 'from_scratch', elements: (toolUse.input as { elements?: RenderElement[] }).elements ?? [] };
}

export async function callAssetContext(
    prompt: string, screenshot: string, elements: CanvasElementInfo[],
    canvasW: number, canvasH: number, signal: AbortSignal, hasImages = false,
): Promise<AssetContextResult> {
    const systemPrompt = buildAssetContextPrompt(canvasW, canvasH, elements, prompt, hasImages);
    const pureBase64 = screenshot.startsWith('data:') ? screenshot.split(',')[1] ?? screenshot : screenshot;

    const body = {
        model: DEFAULT_CLAUDE_MODEL, max_tokens: 2048, system: systemPrompt,
        tools: [REARRANGE_BANNER_TOOL], tool_choice: { type: 'tool', name: 'rearrange_banner' },
        messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pureBase64 } },
            { type: 'text', text: `Here is the current canvas. Please reorganize these ${elements.length} elements into a polished banner: "${prompt}"` },
        ] }],
    };

    const data = await callAnthropicApi(body, signal) as { content: Array<{ type: string; name?: string; input?: unknown }> };
    const toolUse = data.content.find(c => c.type === 'tool_use' && c.name === 'rearrange_banner');
    if (!toolUse?.input) throw new Error('AI did not return layout patches. Please try again.');
    const input = toolUse.input as { patches?: RearrangePatch[]; additions?: RenderElement[] };
    return { mode: 'asset_context', patches: input.patches ?? [], additions: input.additions ?? [] };
}

// ── Template-Based Content Generation ──

function extractUserText(prompt: string): Partial<GeneratedContent> {
    const result: Partial<GeneratedContent> = {};
    const fieldMap: [RegExp, keyof GeneratedContent][] = [
        [/headline[은는=:\s]+["']([^"']+)["']/i, 'headline'],
        [/headline[은는=:\s]+([^,.\n]+)/i, 'headline'],
        [/해드라인[은는=:\s]+["']([^"']+)["']/i, 'headline'],
        [/해드라인[은는=:\s]+([^,.\n]+)/i, 'headline'],
        [/헤드라인[은는=:\s]+["']([^"']+)["']/i, 'headline'],
        [/헤드라인[은는=:\s]+([^,.\n]+)/i, 'headline'],
        [/subheadline[은는=:\s]+["']([^"']+)["']/i, 'subheadline'],
        [/subheadline[은는=:\s]+([^,.\n]+)/i, 'subheadline'],
        [/cta[은는=:\s]+["']([^"']+)["']/i, 'cta'],
        [/cta[은는=:\s]+([^,.\n]+)/i, 'cta'],
        [/tag[은는=:\s]+["']([^"']+)["']/i, 'tag'],
    ];
    for (const [regex, field] of fieldMap) {
        if (result[field]) continue;
        const m = prompt.match(regex);
        if (m?.[1]) result[field] = m[1].trim();
    }
    const qm = prompt.match(/["']([^"']+)["']\s*(?:라는|이라는)?\s*(?:해드라인|헤드라인|headline)/i);
    if (qm?.[1] && !result.headline) result.headline = qm[1].trim();
    return result;
}

function sanitizeContent(c: GeneratedContent): GeneratedContent {
    const JUNK = /^(inter|roboto|arial|helvetica|text|subtext|subheadline|headline|cta|button|click here|lorem|font|label|tag)$/i;
    const FONT_NAMES = /^(inter|roboto|montserrat|poppins|arial|helvetica|georgia|verdana|garamond|lato|opensans|raleway|playfair|outfit|nunito)$/i;
    const toTitleCase = (s: string) => s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

    let headline = c.headline?.trim() || 'Get Started Today';
    if (JUNK.test(headline)) headline = 'Get Started Today';
    if (headline === headline.toLowerCase() && headline.length > 0) headline = toTitleCase(headline);

    let cta = c.cta?.trim() || 'Shop Now';
    if (FONT_NAMES.test(cta) || JUNK.test(cta)) cta = 'Shop Now';
    if (cta === cta.toLowerCase() && cta.length > 0) cta = toTitleCase(cta);

    let subheadline = c.subheadline?.trim() || '';
    if (JUNK.test(subheadline)) subheadline = '';
    let tag = c.tag?.trim() || '';
    if (JUNK.test(tag)) tag = '';

    return { headline, subheadline, cta, tag };
}

export async function callTemplateContent(
    userPrompt: string, canvasW: number, canvasH: number,
    templateName: string, signal: AbortSignal, language: string = 'English',
): Promise<GeneratedContent> {
    const userProvided = extractUserText(userPrompt);
    const hasUserText = Object.keys(userProvided).length > 0;

    if (userProvided.headline && userProvided.cta) {
        return sanitizeContent({ headline: userProvided.headline, subheadline: userProvided.subheadline || '', cta: userProvided.cta, tag: userProvided.tag || '' });
    }

    let contentPrompt = buildContentPrompt(userPrompt, canvasW, canvasH, templateName, language);
    if (hasUserText) {
        const hints: string[] = [];
        if (userProvided.headline) hints.push(`The user EXPLICITLY wants this headline: "${userProvided.headline}". Use it EXACTLY as-is, do NOT change or rephrase it.`);
        if (userProvided.subheadline) hints.push(`The user EXPLICITLY wants this subheadline: "${userProvided.subheadline}". Use it EXACTLY.`);
        if (userProvided.cta) hints.push(`The user EXPLICITLY wants this CTA: "${userProvided.cta}". Use it EXACTLY.`);
        if (userProvided.tag) hints.push(`The user EXPLICITLY wants this tag: "${userProvided.tag}". Use it EXACTLY.`);
        contentPrompt += `\n\nCRITICAL OVERRIDE:\n${hints.join('\n')}`;
    }

    const body = {
        model: DEFAULT_CLAUDE_MODEL, max_tokens: 256, temperature: 0.7,
        system: 'You are a professional copywriter. Return ONLY valid JSON.',
        messages: [{ role: 'user' as const, content: contentPrompt }],
    };

    const data = await callAnthropicApi(body, signal) as { content: Array<{ type: string; text?: string }> };
    const textBlock = data.content.find(c => c.type === 'text');
    if (!textBlock?.text) throw new Error('No content generated.');

    let raw = textBlock.text.trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    try {
        const parsed = JSON.parse(raw) as GeneratedContent;
        return sanitizeContent({ headline: userProvided.headline || parsed.headline || 'Get Started Today', subheadline: userProvided.subheadline ?? parsed.subheadline ?? '', cta: userProvided.cta || parsed.cta || 'Shop Now', tag: userProvided.tag || parsed.tag || '' });
    } catch {
        return sanitizeContent({ headline: userProvided.headline || 'Get Started Today', subheadline: userProvided.subheadline || '', cta: userProvided.cta || 'Shop Now', tag: userProvided.tag || '' });
    }
}
