// ─────────────────────────────────────────────────
// useAutoDesign — Auto-Design 2.0 Hook
// ─────────────────────────────────────────────────
// Orchestrates two design modes + Vision Feedback Loop:
//
//  Mode A (From Scratch): canvas empty → render_banner
//  Mode B (Asset-Context): 2-3 existing elements → rearrange_banner
//
// Both modes then run the Vision Loop (max 3 passes)
// to correct overlap/readability/hierarchy issues.
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import {
    callFromScratch,
    callAssetContext,
    type CanvasElementInfo,
    type RenderElement,
    type RearrangePatch,
} from '@/services/autoDesignService';
import { runVisionLoop } from '@/services/autoDesignLoop';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

// ── Public Types ────────────────────────────────────

export interface AutoDesignState {
    isGenerating: boolean;
    phase: 'idle' | 'generating' | 'reviewing' | 'done' | 'error';
    progress: string;
    error: string | null;
    createdCount: number;
    finalScore: number;
}

export interface AutoDesignOptions {
    engine: Engine | null;
    canvasW: number;
    canvasH: number;
    apiKey: string;
}

// ── Helper: read existing canvas elements ──────────

function readCanvasElements(engine: Engine): CanvasElementInfo[] {
    try {
        const raw = engine.get_all_nodes() as string;
        const nodes = JSON.parse(raw) as Array<{
            id: number;
            name?: string;
            type?: string;
            x: number;
            y: number;
            width: number;
            height: number;
        }>;
        return nodes.map((n) => ({
            id: n.id,
            name: n.name ?? `Element #${n.id}`,
            type: n.type ?? 'rect',
            x: n.x ?? 0,
            y: n.y ?? 0,
            w: n.width ?? 100,
            h: n.height ?? 100,
        }));
    } catch {
        return [];
    }
}

// ── Helper: hex → rgb floats ───────────────────────

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
        return [
            parseInt(clean[0]! + clean[0]!, 16) / 255,
            parseInt(clean[1]! + clean[1]!, 16) / 255,
            parseInt(clean[2]! + clean[2]!, 16) / 255,
        ];
    }
    return [
        parseInt(clean.slice(0, 2), 16) / 255,
        parseInt(clean.slice(2, 4), 16) / 255,
        parseInt(clean.slice(4, 6), 16) / 255,
    ];
}

// ── Helper: render an element onto canvas ──────────

function renderElement(engine: Engine, el: RenderElement, canvasW: number, canvasH: number): boolean {
    const x = el.x ?? 0;
    const y = el.y ?? 0;
    const w = el.w ?? canvasW * 0.5;
    const h = el.h ?? canvasH * 0.1;
    const a = el.a ?? 1.0;
    const name = el.name;

    try {
        if (el.type === 'text') {
            const [tr, tg, tb] = el.color_hex
                ? hexToRgb(el.color_hex)
                : [typeof el.r === 'number' ? el.r : 1, typeof el.g === 'number' ? el.g : 1, typeof el.b === 'number' ? el.b : 1];
            engine.add_text(
                x, y,
                el.content || 'Text',
                el.font_size ?? 18,
                'Inter, system-ui, sans-serif',
                el.font_weight ?? '700',
                tr, tg, tb, 1.0,
                w > 0 ? w : canvasW * 0.85,
                el.text_align ?? 'center',
                name,
            );
            return true;
        }

        const sr = typeof el.r === 'number' ? el.r : (el.color_hex ? hexToRgb(el.color_hex)[0] : 0.5);
        const sg = typeof el.g === 'number' ? el.g : (el.color_hex ? hexToRgb(el.color_hex)[1] : 0.5);
        const sb = typeof el.b === 'number' ? el.b : (el.color_hex ? hexToRgb(el.color_hex)[2] : 0.5);

        if (el.type === 'rounded_rect') {
            engine.add_rounded_rect(x, y, w, h, sr, sg, sb, a, el.radius ?? 8, name);
        } else if (el.type === 'ellipse') {
            engine.add_ellipse(x + w / 2, y + h / 2, w / 2, h / 2, sr, sg, sb, a);
        } else {
            engine.add_rect(x, y, w, h, sr, sg, sb, a, name);
        }
        return true;
    } catch (err) {
        console.warn('[useAutoDesign] Failed to render element:', el.name, err);
        return false;
    }
}

// ── Helper: apply asset-context rearrange patches ─

function applyRearrangePatches(engine: Engine, patches: RearrangePatch[]): number {
    let applied = 0;
    for (const patch of patches) {
        const id = engine.find_by_name?.(patch.elementName) as number | null;
        if (id === null || id === undefined) {
            console.warn('[useAutoDesign] Patch target not found:', patch.elementName);
            continue;
        }
        if (patch.x !== undefined && patch.y !== undefined) {
            engine.set_position(id, patch.x, patch.y);
        }
        if (patch.w !== undefined && patch.h !== undefined) {
            engine.set_size(id, patch.w, patch.h);
        }
        if (patch.fontSize !== undefined) {
            engine.set_font_size?.(id, patch.fontSize);
        }
        if (patch.fill) {
            engine.set_fill_hex?.(id, patch.fill);
        }
        applied++;
    }
    return applied;
}

// ── Hook ────────────────────────────────────────────

export function useAutoDesign(options: AutoDesignOptions) {
    const { engine, canvasW, canvasH, apiKey } = options;

    const [state, setState] = useState<AutoDesignState>({
        isGenerating: false,
        phase: 'idle',
        progress: '',
        error: null,
        createdCount: 0,
        finalScore: 0,
    });

    const abortRef = useRef<AbortController | null>(null);

    const generate = useCallback(async (prompt: string) => {
        if (!engine) {
            setState(s => ({ ...s, error: 'Canvas not ready', phase: 'error' }));
            return;
        }
        if (!apiKey?.trim()) {
            setState(s => ({ ...s, error: 'Set Anthropic API key in AI Settings first', phase: 'error' }));
            return;
        }
        if (!prompt.trim()) {
            setState(s => ({ ...s, error: 'Enter a description of your banner', phase: 'error' }));
            return;
        }

        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

        setState({ isGenerating: true, phase: 'generating', progress: 'Thinking...', error: null, createdCount: 0, finalScore: 0 });

        try {
            // ── Detect Mode ──
            const existingElements = readCanvasElements(engine);
            const isAssetMode = existingElements.length >= 1;

            let createdCount = 0;

            if (isAssetMode) {
                // ── Mode B: Asset-Context ──────────────────────────
                setState(s => ({ ...s, progress: `Reading ${existingElements.length} element${existingElements.length > 1 ? 's' : ''} on canvas...` }));

                // Get screenshot of current state for context
                let screenshot = '';
                try { screenshot = engine.get_screenshot() as string; } catch { /* ok, vision will still work */ }

                setState(s => ({ ...s, progress: 'AI reorganizing layout...' }));
                const result = await callAssetContext(prompt, screenshot, existingElements, canvasW, canvasH, apiKey, signal);

                // Apply patches to existing elements
                const patched = applyRearrangePatches(engine, result.patches);

                // Add any new elements AI suggested
                for (const el of (result.additions ?? [])) {
                    if (renderElement(engine, el, canvasW, canvasH)) createdCount++;
                }

                console.log(`[useAutoDesign] Asset-context: patched=${patched}, added=${createdCount}`);
                createdCount = patched + createdCount;

            } else {
                // ── Mode A: From Scratch ───────────────────────────
                setState(s => ({ ...s, progress: 'Generating banner layout...' }));
                const result = await callFromScratch(prompt, canvasW, canvasH, apiKey, signal);

                // Clear canvas first
                try { engine.clear_scene?.(); } catch { /* ok */ }

                // Render all elements
                setState(s => ({ ...s, progress: `Rendering ${result.elements.length} elements...` }));
                for (const el of result.elements) {
                    if (renderElement(engine, el, canvasW, canvasH)) createdCount++;
                }

                // Auto-group CTA: cta_button + cta_label → 'CTA' group
                try {
                    const btnId = engine.find_by_name?.('cta_button');
                    const lblId = engine.find_by_name?.('cta_label');
                    if (btnId && lblId && btnId > 0 && lblId > 0) {
                        engine.group_elements([btnId, lblId], 'CTA');
                        console.log('[useAutoDesign] CTA auto-grouped');
                    }
                } catch { /* group is optional */ }

                console.log(`[useAutoDesign] From-scratch: rendered=${createdCount}`);
            }

            // ── Vision Feedback Loop ───────────────────────────
            setState(s => ({ ...s, phase: 'reviewing' }));

            const loopResult = await runVisionLoop(
                engine,
                canvasW,
                canvasH,
                apiKey,
                signal,
                (msg) => setState(s => ({ ...s, progress: msg })),
            );

            setState({
                isGenerating: false,
                phase: 'done',
                progress: '',
                error: null,
                createdCount,
                finalScore: loopResult.finalScore,
            });

        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                setState({ isGenerating: false, phase: 'idle', progress: '', error: null, createdCount: 0, finalScore: 0 });
                return;
            }
            setState(s => ({
                ...s,
                isGenerating: false,
                phase: 'error',
                progress: '',
                error: err instanceof Error ? err.message : 'Auto-Design failed. Please retry.',
            }));
        }
    }, [engine, canvasW, canvasH, apiKey]);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setState(s => ({ ...s, isGenerating: false, phase: 'idle', progress: '', error: null }));
    }, []);

    return { state, generate, cancel };
}
