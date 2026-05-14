// ─────────────────────────────────────────────────
// autoDesignService — Auto-Design AI API calls
// ─────────────────────────────────────────────────
// Types + Tool Schemas → autoDesignTypes.ts
// Prompt Builders → autoDesignPrompts.ts
// ★ v744: callTemplateContent, extractUserText, sanitizeContent REMOVED.
// Content generation now uses designBrief.ts → generateDesignBrief().
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import type { CanvasElementInfo, RenderElement, RearrangePatch, FromScratchResult, AssetContextResult } from './autoDesignTypes';
import { RENDER_BANNER_TOOL, REARRANGE_BANNER_TOOL } from './autoDesignTypes';
import { buildFromScratchPrompt, buildAssetContextPrompt } from './autoDesignPrompts';

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
