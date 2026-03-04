// ─────────────────────────────────────────────────
// useAutoDesign — AI Auto-Design hook
// ─────────────────────────────────────────────────
// OpenPencil-inspired: user types a prompt → AI generates
// a full banner layout using render_banner tool.
//
// Flow:
//   1. Build a structured prompt with canvas dimensions + user intent
//   2. Call Claude API with render_banner as the primary tool
//   3. Execute the returned render_banner call on the canvas
//   4. Report creation result
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { classifyRatio } from '@/engine/smartSizing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

export interface AutoDesignState {
    isGenerating: boolean;
    progress: string;
    error: string | null;
    createdCount: number;
}

interface AutoDesignOptions {
    engine: Engine | null;
    canvasW: number;
    canvasH: number;
    apiKey: string;
}

// ── System Prompt ──────────────────────────────────

function buildSystemPrompt(canvasW: number, canvasH: number): string {
    const ratio = classifyRatio(canvasW, canvasH);
    const ratioHints: Record<string, string> = {
        'ultra-wide': 'Horizontal layout: logo LEFT, headline CENTER, CTA RIGHT. Single text line.',
        'wide': 'Two-column: image left, text+CTA right.',
        'landscape': 'Vertical stack: background, headline, subtext, CTA. Standard banner hierarchy.',
        'square': 'Compact square: background fills, logo top-left, headline center, CTA bottom-center.',
        'portrait': 'Tall vertical: logo top, hero image, headline, subtext, CTA bottom.',
        'ultra-tall': 'Skyscraper: logo top, image, headline, subtext, CTA bottom with padding.',
    };
    const layoutHint = ratioHints[ratio] ?? 'Balanced layout for this size.';

    return `You are an expert banner ad designer for a tool called ACE.
Your job: generate a complete, professional banner ad layout by calling render_banner.

Canvas: ${canvasW}×${canvasH}px (ratio: ${ratio})
Layout pattern: ${layoutHint}

RULES for render_banner:
- background rect should always be first, covering full canvas (x:0, y:0, w:${canvasW}, h:${canvasH})
- Use r/g/b floats (0.0–1.0) for shape colors
- Use color_hex (#rrggbb) for text colors
- Positions must be within canvas bounds (0 to ${canvasW}×${canvasH})
- Add at least: background, headline text, CTA button shape, CTA label text
- Optional: subtext, logo placeholder, decorative shapes
- Apply animation presets: use "fade" for headline, "slide-left" for CTA, "slide-up" for subtext
- Make it visually stunning: use bold colors, clear hierarchy, generous padding

Call render_banner with the complete layout. Return ONLY the tool call with no explanatory text.`;
}

// ── Claude API Call ────────────────────────────────

const RENDER_BANNER_SCHEMA = {
    name: 'render_banner',
    description: 'Create a full banner layout declaratively. Define all elements in one call.',
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
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number' },
                        radius: { type: 'number' },
                        content: { type: 'string' },
                        font_size: { type: 'number' }, font_weight: { type: 'string' },
                        color_hex: { type: 'string' }, text_align: { type: 'string' },
                        animation: { type: 'string' }, anim_delay: { type: 'number' }, anim_duration: { type: 'number' },
                    },
                },
            },
        },
    },
};

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';

interface RenderBannerParams {
    elements: Record<string, unknown>[];
}

async function callAutoDesignApi(
    prompt: string,
    canvasW: number,
    canvasH: number,
    apiKey: string,
    signal: AbortSignal,
): Promise<RenderBannerParams | null> {
    const systemPrompt = buildSystemPrompt(canvasW, canvasH);

    const body = {
        model: DEFAULT_CLAUDE_MODEL,

        max_tokens: 2048,
        system: systemPrompt,
        tools: [RENDER_BANNER_SCHEMA],
        tool_choice: { type: 'any' },
        messages: [{ role: 'user', content: prompt }],
    };

    const data = await callAnthropicApi(apiKey, body, signal) as {
        content: Array<{ type: string; name?: string; input?: unknown }>;
        stop_reason: string;
    };

    const toolUse = data.content.find(c => c.type === 'tool_use' && c.name === 'render_banner');
    if (!toolUse?.input) return null;

    return toolUse.input as RenderBannerParams;
}


// ── Hook ──────────────────────────────────────────

export function useAutoDesign(options: AutoDesignOptions) {
    const { engine, canvasW, canvasH, apiKey } = options;

    const [state, setState] = useState<AutoDesignState>({
        isGenerating: false,
        progress: '',
        error: null,
        createdCount: 0,
    });

    const abortRef = useRef<AbortController | null>(null);

    const generate = useCallback(async (prompt: string) => {
        if (!engine || !apiKey?.trim()) {
            setState(s => ({ ...s, error: !apiKey ? 'Set Anthropic API key first' : 'Canvas not ready' }));
            return;
        }

        if (!prompt.trim()) {
            setState(s => ({ ...s, error: 'Enter a description of what to create' }));
            return;
        }

        // Cancel any previous request
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setState({ isGenerating: true, progress: 'Thinking...', error: null, createdCount: 0 });

        try {
            // Step 1: Call Claude to generate layout
            setState(s => ({ ...s, progress: 'Generating banner layout...' }));
            const params = await callAutoDesignApi(prompt, canvasW, canvasH, apiKey, abortRef.current.signal);

            if (!params) {
                throw new Error('AI did not return a banner layout. Please try again.');
            }

            // Step 2: Clear canvas
            setState(s => ({ ...s, progress: 'Clearing canvas...' }));
            try { engine.clear_scene?.(); } catch { /* some engines may not have this */ }

            // Step 3: Execute render_banner
            setState(s => ({ ...s, progress: `Rendering ${params.elements.length} elements...` }));

            let createdCount = 0;
            for (const el of params.elements) {
                const type = (el.type as string) ?? 'rect';
                try {
                    if (type === 'text') {
                        const colorHex = (el.color_hex as string) ?? '#ffffff';
                        const match = colorHex.replace('#', '').match(/.{2}/g);
                        const [rr, gg, bb] = match
                            ? [parseInt(match[0]!, 16) / 255, parseInt(match[1]!, 16) / 255, parseInt(match[2]!, 16) / 255]
                            : [1, 1, 1];
                        engine.add_text(
                            (el.x as number) ?? 0,
                            (el.y as number) ?? 0,
                            (el.content as string) ?? '',
                            (el.font_size as number) ?? 18,
                            'Inter, system-ui, sans-serif',
                            (el.font_weight as string) ?? '400',
                            rr, gg, bb, 1.0,
                            (el.w as number) ?? 200,
                            (el.text_align as string) ?? 'left',
                        );
                        createdCount++;
                    } else if (type === 'rect') {
                        engine.add_rect(
                            (el.x as number) ?? 0, (el.y as number) ?? 0,
                            (el.w as number) ?? 100, (el.h as number) ?? 100,
                            (el.r as number) ?? 0.5, (el.g as number) ?? 0.5, (el.b as number) ?? 0.5,
                            (el.a as number) ?? 1.0,
                        );
                        createdCount++;
                    } else if (type === 'rounded_rect') {
                        engine.add_rounded_rect(
                            (el.x as number) ?? 0, (el.y as number) ?? 0,
                            (el.w as number) ?? 100, (el.h as number) ?? 100,
                            (el.r as number) ?? 0.5, (el.g as number) ?? 0.5, (el.b as number) ?? 0.5,
                            (el.a as number) ?? 1.0,
                            (el.radius as number) ?? 8,
                        );
                        createdCount++;
                    } else if (type === 'ellipse') {
                        const w = (el.w as number) ?? 100;
                        const h = (el.h as number) ?? 100;
                        engine.add_ellipse(
                            ((el.x as number) ?? 0) + w / 2, ((el.y as number) ?? 0) + h / 2,
                            w / 2, h / 2,
                            (el.r as number) ?? 0.5, (el.g as number) ?? 0.5, (el.b as number) ?? 0.5,
                            (el.a as number) ?? 1.0,
                        );
                        createdCount++;
                    }
                } catch {
                    // Skip failed elements, continue with others
                }
            }

            setState({
                isGenerating: false,
                progress: '',
                error: null,
                createdCount,
            });

        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                setState(s => ({ ...s, isGenerating: false, progress: '', error: null }));
                return;
            }
            setState(s => ({
                ...s,
                isGenerating: false,
                progress: '',
                error: err instanceof Error ? err.message : 'Auto-Design failed. Please retry.',
            }));
        }
    }, [engine, canvasW, canvasH, apiKey]);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setState(s => ({ ...s, isGenerating: false, progress: '', error: null }));
    }, []);

    return { state, generate, cancel };
}
