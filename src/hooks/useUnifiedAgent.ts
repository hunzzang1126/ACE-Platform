// ─────────────────────────────────────────────────
// useUnifiedAgent — Brain of the Unified AI Agent
// ─────────────────────────────────────────────────
// Intent detection: classify user messages → route to correct pipeline
// Orchestrates: chat, auto-design, scan-design, modify, smart-check
// Provides live cursor coordinates for canvas animation effect
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { AiService, type AiConfig, type ToolExecutorOverride } from '@/ai/aiService';
import { DASHBOARD_TOOL_NAMES } from '@/ai/dashboardTools';
import { executeDashboardTool } from '@/ai/dashboardExecutor';
import { useDesignStore } from '@/stores/designStore';
import { getModelForRole, type AceModelRole } from '@/services/modelRouter';
import type { AgentMessage } from '@/ai/agentContext';
import type { NavigateFunction } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { buildContext, enrichMessageWithContext, buildContextSystemPrompt } from '@/ai/contextRouter';

// ── Types ────────────────────────────────────────

// AgentIntent type is defined below after intent detection section

// ProgressCard type kept for backward compat, data now lives inside AgentMessage.actionCard
export interface ProgressCard {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    detail?: string;
    reasoning?: string;
    expandedDetail?: string;
}

export interface LiveCursor {
    active: boolean;
    x: number;
    y: number;
    label?: string;
}

export interface UnifiedAgentState {
    phase: 'idle' | 'scanning' | 'thinking' | 'planning' | 'executing' | 'reflecting' | 'done' | 'error';
    intent: AgentIntent | null;
    error: string;
    liveCursor: LiveCursor;
}

const INITIAL_STATE: UnifiedAgentState = {
    phase: 'idle',
    intent: null,
    error: '',
    liveCursor: { active: false, x: 0, y: 0 },
};

// ── Intent Detection (LEGACY — scan-only) ────────
// All text input routes to the LLM agentic loop (Single Loop).
// Only image data triggers the scan flow.

export type AgentIntent = 'scan' | 'agent';

// ── Hook ─────────────────────────────────────────

interface UseUnifiedAgentOptions {
    navigate: NavigateFunction;
    selectedRole: AceModelRole;
}

export function useUnifiedAgent({ navigate, selectedRole }: UseUnifiedAgentOptions) {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [state, setState] = useState<UnifiedAgentState>(INITIAL_STATE);
    const [input, setInput] = useState('');
    const location = useLocation();

    const serviceRef = useRef<AiService | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineRef = useRef<any>(null);

    // ── Narration — Pencil-style live explanation ─
    // Pushes conversational messages that explain what the AI is about to do
    const narrate = useCallback((text: string) => {
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: text,
            timestamp: Date.now(),
        }]);
    }, []);

    // ── Progress card helpers — push into messages ─
    // Cards are now interleaved with narration as action messages
    const addCard = useCallback((id: string, label: string, status: ProgressCard['status'] = 'running', opts?: { reasoning?: string; expandedDetail?: string }) => {
        setMessages(prev => [...prev, {
            role: 'action' as const,
            content: label,
            timestamp: Date.now(),
            actionCard: { id, label, status, reasoning: opts?.reasoning, expandedDetail: opts?.expandedDetail },
        }]);
    }, []);

    const updateCard = useCallback((id: string, status: ProgressCard['status'], detail?: string, opts?: { reasoning?: string; expandedDetail?: string }) => {
        setMessages(prev => prev.map(m => {
            if (m.role === 'action' && m.actionCard?.id === id) {
                return {
                    ...m,
                    actionCard: {
                        ...m.actionCard,
                        status,
                        ...(detail != null ? { detail } : {}),
                        ...(opts?.reasoning != null ? { reasoning: opts.reasoning } : {}),
                        ...(opts?.expandedDetail != null ? { expandedDetail: opts.expandedDetail } : {}),
                    },
                };
            }
            return m;
        }));
    }, []);

    // ── Live cursor animation ────────────────────
    const moveCursor = useCallback((x: number, y: number, label?: string) => {
        setState(prev => ({
            ...prev,
            liveCursor: { active: true, x, y, label },
        }));
    }, []);

    const hideCursor = useCallback(() => {
        setState(prev => ({
            ...prev,
            liveCursor: { active: false, x: 0, y: 0 },
        }));
    }, []);

    // ── Engine bridge ────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setEngine = useCallback((e: any) => {
        engineRef.current = e?.current ?? e;
    }, []);

    // ── Config ───────────────────────────────────
    // ★ CRITICAL: UI-selected model ALWAYS takes priority.
    // localStorage is used only for endpoint/maxToolRounds, never for model override.
    const getConfig = useCallback((): AiConfig => {
        const model = getModelForRole(selectedRole);
        const base: AiConfig = { endpoint: 'https://openrouter.ai/api', model: model.id, maxToolRounds: 30 };

        // Merge non-model settings from localStorage (if any)
        const saved = localStorage.getItem('ace-ai-config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as Partial<AiConfig>;
                if (parsed.endpoint) base.endpoint = parsed.endpoint;
                if (parsed.maxToolRounds) base.maxToolRounds = parsed.maxToolRounds;
                // ★ NEVER use parsed.model — UI selection is the source of truth
            } catch { /* */ }
        }
        return base;
    }, [selectedRole]);

    // ── Generate Design (template-first pipeline) ──
    const runGenerateFlow = useCallback(async (prompt: string) => {
        const engine = engineRef.current?.current ?? engineRef.current;
        if (!engine) throw new Error('Canvas not connected.');

        // ── Phase 1: Canvas scan ──
        narrate(`Starting design generation. Reading current canvas state...`);
        addCard('context', 'Reading canvas context', 'running');
        let elementCount = 0;
        try {
            const raw = engine.get_all_nodes() as string;
            const nodes = JSON.parse(raw);
            elementCount = Array.isArray(nodes) ? nodes.length : 0;
        } catch { /* ok */ }
        updateCard('context', 'done', `${elementCount} elements found`);
        await new Promise(r => setTimeout(r, 400)); // Pacing

        // Get canvas dimensions
        let canvasW = 300, canvasH = 250;
        try {
            const dims = engine.get_canvas_size?.();
            if (dims) { canvasW = dims.width ?? 300; canvasH = dims.height ?? 250; }
        } catch { /* ok */ }

        // ── Phase 2: AI Copywriting (Content-First) ──
        // Content comes FIRST so structure can adapt to actual text length.
        narrate(`I'll generate the ad copy tailored for your prompt.`);
        addCard('content', 'Generating creative copy', 'running');
        await new Promise(r => setTimeout(r, 400));

        const abort = new AbortController();
        const { callTemplateContent } = await import('@/services/autoDesignService');
        const content = await callTemplateContent(prompt, canvasW, canvasH, 'AI Pipeline', abort.signal);

        const copyDetail = [
            `Headline: "${content.headline}" (${content.headline.length} chars)`,
            `Subheadline: "${content.subheadline}"`,
            `CTA: "${content.cta}"`,
            content.tag ? `Tag: "${content.tag}"` : '',
        ].filter(Boolean).join('\n');
        updateCard('content', 'done', 'Copy generated', { expandedDetail: copyDetail });
        narrate(`Copy ready: "${content.headline}"`);
        await new Promise(r => setTimeout(r, 400));

        // ── Phase 3: AI Structure Decision ──
        // AI sees the actual headline length → picks optimal font size and layout.
        narrate(`Choosing the best layout structure for this content...`);
        addCard('structure', 'Determining layout structure', 'running');

        const { generateLayoutSpec } = await import('@/services/aiStructureService');
        const spec = await generateLayoutSpec(prompt, content, canvasW, canvasH, abort.signal);

        const structDetail = [
            `Layout: ${spec.layoutType}`,
            `Alignment: ${spec.alignment}`,
            `Headline Font: ${spec.headlineFontSize}px`,
            `Accent: ${spec.accentStrategy}`,
            `Mood: ${spec.mood}`,
        ].join('\n');
        updateCard('structure', 'done', spec.layoutType, {
            reasoning: spec.reasoning,
            expandedDetail: structDetail,
        });
        await new Promise(r => setTimeout(r, 400));

        // ── Phase 4: AI Color Palette (Mood-Aware) ──
        // Colors are chosen LAST, informed by the structure's mood.
        narrate(`Selecting colors that match the "${spec.mood}" mood...`);
        addCard('palette', 'Determining color palette', 'running');

        const { generateColorPalette } = await import('@/services/designStyleGuides');
        const { palette: guide, reasoning: colorReasoning, needsBackgroundImage, backgroundImagePrompt } = await generateColorPalette(prompt, abort.signal);

        const styleDetail = [
            `Background: ${guide.colors.gradientStart} -> ${guide.colors.gradientEnd}`,
            `Accent: ${guide.colors.accent}`,
            `Text: ${guide.colors.foreground}`,
            `Font: ${guide.typography.primaryFont} / ${guide.typography.secondaryFont}`,
            needsBackgroundImage ? `Background Image: YES` : `Background Image: NO (gradient)`,
        ].join('\n');
        updateCard('palette', 'done', guide.name, { reasoning: colorReasoning, expandedDetail: styleDetail });
        narrate(colorReasoning || `Color palette: ${guide.name}`);
        await new Promise(r => setTimeout(r, 400));

        // ── Phase 4.5: Background Image Generation (if needed) ──
        let hasImageBackground = false;
        let bgImageUrl: string | null = null;
        if (needsBackgroundImage && backgroundImagePrompt) {
            narrate(`This design needs a background image. Generating...`);
            addCard('bg-image', 'Generating background image', 'running', {
                reasoning: backgroundImagePrompt,
            });

            try {
                const { generateBackgroundImage } = await import('@/services/imageGenClient');
                const bgResult = await generateBackgroundImage(
                    backgroundImagePrompt,
                    canvasW,
                    canvasH,
                    [guide.colors.accent, guide.colors.background, guide.colors.gradientEnd],
                    abort.signal,
                );

                if (bgResult.success && bgResult.imageUrl) {
                    bgImageUrl = bgResult.imageUrl;
                    hasImageBackground = true;
                    updateCard('bg-image', 'done', bgResult.isFallback ? 'Gradient fallback' : 'Image generated', {
                        expandedDetail: bgResult.isFallback
                            ? 'API not available — using gradient fallback.'
                            : `Generated ${canvasW}x${canvasH} background via ${bgResult.model}`,
                    });
                } else {
                    updateCard('bg-image', 'error', bgResult.message || 'Generation failed');
                }
            } catch (err) {
                console.warn('[UnifiedAgent] Background image generation failed:', err);
                updateCard('bg-image', 'error', 'Generation failed — using gradient');
            }
            await new Promise(r => setTimeout(r, 300));
        }

        // ── Phase 5: Combine + Validate ──
        narrate(`Building the layout: ${spec.layoutType} with ${spec.alignment} alignment...`);
        addCard('build', 'Combining layout', 'running');

        const { buildLayoutFromSpec } = await import('@/services/aiLayoutEngine');
        const { validateLayout } = await import('@/engine/layoutValidator');

        let allElements = buildLayoutFromSpec(spec, content, guide, canvasW, canvasH);

        // ★ When NanoBanana image background is active, remove the gradient rect
        // background — the ai_background image replaces it entirely.
        // This prevents the gradient rect from sitting on top of the image and
        // causing z-order conflicts on save/reload.
        if (hasImageBackground && bgImageUrl) {
            allElements = allElements.filter(el => el.name !== 'background');
        }

        // ★ CONTRAST GUARD: When background image is present, inject a cinematic
        // two-layer dark overlay to guarantee text readability. Covers full canvas
        // with lighter top (15% opacity) and darker bottom (60% opacity).
        if (hasImageBackground) {
            const bgIndex = allElements.findIndex(el => el.name === 'background');
            const insertAt = bgIndex + 1;

            // Layer 1: light veil over top half — keeps image visible
            const overlayTop: import('@/services/autoDesignService').RenderElement = {
                type: 'rect',
                name: 'contrast_overlay',
                x: 0, y: 0,
                w: canvasW,
                h: Math.round(canvasH * 0.5),
                r: 0, g: 0, b: 0, a: 0.15,
            };
            // Layer 2: darker veil over bottom half — text readability zone
            const overlayBottom: import('@/services/autoDesignService').RenderElement = {
                type: 'rect',
                name: 'contrast_overlay_bottom',
                x: 0, y: Math.round(canvasH * 0.5),
                w: canvasW,
                h: canvasH - Math.round(canvasH * 0.5),
                r: 0, g: 0, b: 0, a: 0.60,
            };
            allElements.splice(insertAt, 0, overlayTop, overlayBottom);
            narrate(`Added contrast overlay for text readability on image background.`);
        }

        // Math-based validation: fix overlaps, clipping, hierarchy
        const validation = validateLayout(allElements, canvasW, canvasH);
        allElements = validation.elements;

        const elementBreakdown = allElements.map(el => {
            const type = el.gradient_start_hex ? 'gradient' : el.type ?? 'rect';
            const pos = `(${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)})`;
            const size = `${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`;
            const extra = el.content ? ` "${el.content.slice(0, 30)}"` : el.gradient_start_hex ? ` ${el.gradient_start_hex} -> ${el.gradient_end_hex}` : '';
            return `"${el.name}" — ${type} at ${pos} ${size}${extra}`;
        }).join('\n');

        const validationNote = validation.isClean
            ? 'Layout validated — no issues'
            : `Layout validated — ${validation.fixes.length} auto-fix(es)`;
        updateCard('build', 'done', `${allElements.length} elements · ${validationNote}`, {
            expandedDetail: elementBreakdown + (validation.fixes.length > 0 ? '\n\nFixes:\n' + validation.fixes.join('\n') : ''),
        });
        await new Promise(r => setTimeout(r, 400));

        // ── Phase 5: Multi-pass render with live narration ──
        // Group elements by layer
        const structureNames = new Set(['background', 'contrast_overlay', 'contrast_overlay_bottom', 'text_overlay', 'accent_zone', 'accent_glow', 'accent_line', 'accent_diagonal', 'accent_divider', 'tag_underline', 'tag_line']);
        const contentNames = new Set(['headline', 'subheadline', 'body_text', 'tag_text']);
        const actionNames = new Set(['cta_button', 'cta_label']);

        const layers: { name: string; elements: import('@/services/autoDesignService').RenderElement[] }[] = [
            { name: 'Structure', elements: allElements.filter(el => structureNames.has(el.name ?? '')) },
            { name: 'Content', elements: allElements.filter(el => contentNames.has(el.name ?? '')) },
            { name: 'Action', elements: allElements.filter(el => actionNames.has(el.name ?? '')) },
            { name: 'Polish', elements: allElements.filter(el => !structureNames.has(el.name ?? '') && !contentNames.has(el.name ?? '') && !actionNames.has(el.name ?? '')) },
        ];

        narrate(`Now I'll render each element onto the canvas.`);
        await new Promise(r => setTimeout(r, 500));

        // Clear scene and gradient cache
        const { clearGradientCache, cacheGradientData } = await import('@/engine/elementConverters');
        clearGradientCache();
        try { engine.clear_scene?.(); } catch { /* ok */ }

        // ★ REGRESSION GUARD: Place background image AFTER clear_scene.
        // Previously placed in Phase 2.5 but clear_scene destroyed it.
        if (hasImageBackground && bgImageUrl) {
            try {
                await engine.add_image(0, 0, bgImageUrl, canvasW, canvasH, 'ai_background');
                narrate(`Background image placed on canvas.`);
            } catch (err) {
                console.warn('[UnifiedAgent] Failed to place background image after clear:', err);
            }
        }

        let rendered = 0;
        for (const layer of layers) {
            if (layer.elements.length === 0) continue;
            await new Promise(r => setTimeout(r, 300)); // Pacing: pause between layers

            for (const el of layer.elements) {
                // Add per-element action card
                const elCardId = `design-${rendered}`;
                const elType = el.gradient_start_hex ? 'gradient' : el.type ?? 'rect';
                const elLabel = `Design: ${el.name || elType}`;
                addCard(elCardId, elLabel, 'running');

                moveCursor(el.x ?? 0, el.y ?? 0, el.name);
                await new Promise(r => setTimeout(r, 150));

                try {
                    let nodeId: number | null = null;
                    if (el.type === 'text') {
                        const hexToRgb = (hx: string): [number, number, number] => {
                            const c = hx.replace('#', '');
                            return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255];
                        };
                        const [tr, tg, tb] = el.color_hex ? hexToRgb(el.color_hex) : [1, 1, 1];
                        nodeId = engine.add_text(el.x ?? 0, el.y ?? 0, el.content || 'Text', el.font_size ?? 18, 'Inter, system-ui, sans-serif', el.font_weight ?? '700', tr, tg, tb, 1.0, (el.w && el.w > 0) ? el.w : canvasW * 0.85, el.text_align ?? 'center', el.name, el.line_height, el.letter_spacing) as number | null;
                    } else if (el.gradient_start_hex && el.gradient_end_hex) {
                        nodeId = engine.add_gradient_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 100, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135, el.radius ?? 0, el.name) as number | null;
                        // Cache gradient data by name AND node ID for save/restore
                        cacheGradientData(el.name ?? '', el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
                        if (nodeId != null) {
                            cacheGradientData(`engine-${nodeId}`, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
                        }
                    } else if (el.type === 'rounded_rect') {
                        const sr = el.r ?? 0.5, sg = el.g ?? 0.5, sb = el.b ?? 0.5;
                        nodeId = engine.add_rounded_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, sr, sg, sb, el.a ?? 1, el.radius ?? 8, el.name) as number | null;
                    } else if (el.type === 'ellipse') {
                        const sr = el.r ?? 0.5, sg = el.g ?? 0.5, sb = el.b ?? 0.5;
                        nodeId = engine.add_ellipse?.((el.x ?? 0) + (el.w ?? 50) / 2, (el.y ?? 0) + (el.h ?? 50) / 2, (el.w ?? 50) / 2, (el.h ?? 50) / 2, sr, sg, sb, el.a ?? 1) as number | null;
                    } else {
                        const sr = el.r ?? 0.5, sg = el.g ?? 0.5, sb = el.b ?? 0.5;
                        nodeId = engine.add_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, sr, sg, sb, el.a ?? 1, el.name) as number | null;
                    }

                    // Apply shadow if specified
                    if (nodeId != null && el.shadow_blur && el.shadow_blur > 0) {
                        try {
                            engine.set_shadow?.(nodeId, el.shadow_offset_x ?? 2, el.shadow_offset_y ?? 4, el.shadow_blur, 0, 0, 0, el.shadow_opacity ?? 0.25);
                        } catch { /* shadow not critical */ }
                    }

                    // Build detail for the action card
                    const detail = el.type === 'text'
                        ? `"${(el.content ?? '').slice(0, 25)}" ${el.font_size}px at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)})`
                        : el.gradient_start_hex
                            ? `${el.gradient_start_hex} -> ${el.gradient_end_hex} ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`
                            : `${elType} at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)}) ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`;
                    updateCard(elCardId, 'done', detail);
                    rendered++;
                } catch (err) {
                    console.warn('[UnifiedAgent] Failed to render:', el.name, err);
                    updateCard(elCardId, 'error', `Failed: ${el.name}`);
                }
            }
        }
        hideCursor();

        // ── Phase 7: Vision QA (Auto-Fix, Score Hidden) ──
        narrate(`Reviewing and optimizing design quality...`);
        addCard('vision', 'Optimizing layout', 'running');
        try {
            const { runVisionLoop } = await import('@/services/autoDesignLoop');
            const loopResult = await runVisionLoop(engine, canvasW, canvasH, abort.signal, (msg: string) => {
                // ★ Hide raw scores from user — show friendly progress messages
                if (msg.includes('Score') && !msg.includes('Approved')) {
                    updateCard('vision', 'running', 'Optimizing layout...');
                } else {
                    updateCard('vision', 'running', msg);
                }
            });

            const fixNote = loopResult.fixesApplied > 0 ? ` · ${loopResult.fixesApplied} adjustment(s)` : '';

            // ★ Only show score when approved. Otherwise show generic success.
            if (loopResult.finalScore >= 80) {
                updateCard('vision', 'done', `Layout optimized${fixNote} — Quality approved`);
            } else {
                // Don't show the score — just say it was adjusted
                updateCard('vision', 'done', `Layout adjusted${fixNote}`);
            }

            narrate(
                `Design quality review complete.${fixNote}\n` +
                `Style: ${guide.name}\n` +
                `Layout: ${spec.layoutType} (${spec.alignment})\n` +
                `Elements: ${rendered}\n` +
                `Canvas: ${canvasW}x${canvasH}px`
            );
        } catch {
            updateCard('vision', 'done', 'Vision check skipped');
            narrate(`Design placed with ${rendered} elements using ${guide.name}.\nCanvas: ${canvasW}x${canvasH}px`);
        }

        // ── Phase 8: Smart Sizing (Auto-propagate to all variants) ──
        const designState = useDesignStore.getState();
        const cs = designState.creativeSet;
        const otherVariants = cs?.variants?.filter(v => v.id !== cs.masterVariantId) ?? [];

        if (otherVariants.length > 0) {
            narrate(`Scaling design to ${otherVariants.length} variant(s)...`);
            addCard('sizing', `Scaling to ${otherVariants.length} variant(s)`, 'running');

            const { scaleRenderElements, renderElementsToDesignElements } = await import('@/engine/renderElementScaler');

            const sizeResults: string[] = [];
            for (const variant of otherVariants) {
                const targetW = variant.preset.width;
                const targetH = variant.preset.height;

                // Scale master elements → target size
                let scaledElements = scaleRenderElements(allElements, canvasW, canvasH, targetW, targetH);

                // Validate each variant independently
                const variantValidation = validateLayout(scaledElements, targetW, targetH);
                scaledElements = variantValidation.elements;

                const fixes = variantValidation.isClean ? '' : ` (${variantValidation.fixes.length} fix)`;
                sizeResults.push(`${targetW}x${targetH}: ${scaledElements.length} elements${fixes}`);

                // ★ FIX: Actually store scaled elements to designStore
                // Previously this was only a comment — elements were computed but never stored.
                const variantDesignElements = renderElementsToDesignElements(scaledElements, targetW, targetH);
                designState.replaceVariantElements(variant.id, variantDesignElements);
            }

            updateCard('sizing', 'done', `${otherVariants.length} variant(s) scaled`, {
                expandedDetail: sizeResults.join('\n'),
            });
            narrate(`All ${otherVariants.length} variant(s) scaled and validated.`);
        }

        return `Design generated with ${rendered} elements.`;
    }, [addCard, updateCard, moveCursor, hideCursor, narrate]);

    // ── Scan Design (via screenshotScanService) ──
    const runScanFlow = useCallback(async (imageData: string) => {
        const engine = engineRef.current?.current ?? engineRef.current;
        if (!engine) throw new Error('Canvas not connected.');

        let canvasW = 300, canvasH = 250;
        try {
            const dims = engine.get_canvas_size?.();
            if (dims) { canvasW = dims.width ?? 300; canvasH = dims.height ?? 250; }
        } catch { /* ok */ }

        narrate('I see your screenshot. Let me analyze it with Vision AI and extract the design layers.');
        addCard('scan', 'Analyzing screenshot with Vision AI', 'running');
        const { scanDesignScreenshot } = await import('@/services/screenshotScanService');
        const abort = new AbortController();
        const result = await scanDesignScreenshot(imageData, canvasW, canvasH, abort.signal);
        updateCard('scan', 'done', `Found ${result.elements.length} elements`);
        narrate(`Found ${result.elements.length} elements in the design. Now rendering them as editable layers on your canvas.`);

        addCard('render', 'Rendering layers on canvas', 'running');
        try { engine.clear_scene?.(); } catch { /* ok */ }

        let rendered = 0;
        for (const el of result.elements) {
            moveCursor(el.x ?? 0, el.y ?? 0, el.name);
            await new Promise(r => setTimeout(r, 120));

            try {
                if (el.is_complex_bg) {
                    const r = el.r ?? 0.08, g = el.g ?? 0.08, b = el.b ?? 0.1;
                    engine.add_rect(el.x ?? 0, el.y ?? 0, el.w ?? canvasW, el.h ?? canvasH, r, g, b, 1, `${el.name ?? 'background'} (replace with image)`);
                } else if (el.gradient_start_hex && el.gradient_end_hex) {
                    engine.add_gradient_rect(el.x, el.y, el.w, el.h, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135, el.radius ?? 0, el.name);
                } else if (el.type === 'text') {
                    const hexToRgb = (hex: string): [number, number, number] => {
                        const c = hex.replace('#', '');
                        return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255];
                    };
                    const [tr, tg, tb] = el.color_hex ? hexToRgb(el.color_hex) : [1, 1, 1];
                    engine.add_text(el.x ?? 0, el.y ?? 0, el.content ?? 'Text', el.font_size ?? 18, (el as any).font_family ?? 'Inter', el.font_weight ?? '400', tr, tg, tb, 1.0, el.w ?? canvasW * 0.8, el.text_align ?? 'center', el.name, el.line_height, el.letter_spacing);
                } else if (el.type === 'rounded_rect') {
                    engine.add_rounded_rect(el.x, el.y, el.w, el.h, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, 1, el.radius ?? 8, el.name);
                } else {
                    engine.add_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, 1, el.name);
                }
                rendered++;
            } catch { /* skip failed element */ }
        }
        hideCursor();
        updateCard('render', 'done', `${rendered} layers created`);
        narrate(`Done — ${rendered} layers extracted and placed on canvas. Each layer is fully editable. You can select, move, resize, or restyle any element.`);

        return `Scanned design: ${rendered} layers extracted and placed on canvas.`;
    }, [addCard, updateCard, moveCursor, hideCursor, narrate]);

    // ── Chat (regular AI agent) ──────────────────
    const runChatFlow = useCallback(async (msg: string, config: AiConfig) => {
        if (!serviceRef.current) {
            serviceRef.current = new AiService([]);
        }
        serviceRef.current.updateConfig(config);

        const dashboardOverride: ToolExecutorOverride = (toolName, params) => {
            // ★ Intercept generate_full_design → run structured layout pipeline
            if (toolName === 'generate_full_design') {
                const prompt = (params.prompt as string) ?? '';
                // Run the full structured pipeline asynchronously
                // Return a promise-like result that the chat loop can handle
                return {
                    success: true,
                    message: `[GENERATE_FULL_DESIGN] Launching structured design pipeline for: "${prompt.slice(0, 80)}"`,
                    data: { __meta_tool: 'generate_full_design', prompt },
                };
            }
            if (DASHBOARD_TOOL_NAMES.has(toolName)) {
                const result = executeDashboardTool(toolName, params, navigate);
                return { success: result.success, message: result.message, data: result.data };
            }
            return null;
        };

        const engine = engineRef.current?.current ?? engineRef.current;

        // Inject design context
        const designState = useDesignStore.getState();
        serviceRef.current.setDesignContext(
            designState.creativeSet ?? null,
            designState.creativeSet?.masterVariantId,
        );

        narrate('Let me look at the current canvas and work on your request.');
        addCard('thinking', 'Processing request', 'running');

        let hadError = '';
        let pendingDesignPrompt: string | null = null;

        await serviceRef.current.chat(msg, engine, {
            onCanvasScan: () => updateCard('thinking', 'running', 'Scanning canvas'),
            onThinking: (t: string) => updateCard('thinking', 'running', t || 'Thinking...'),
            onPlan: (steps: string[]) => {
                updateCard('thinking', 'done');
                steps.forEach((s, i) => addCard(`step-${i}`, s, 'pending'));
            },
            onStepStart: (idx: number, name: string) => {
                updateCard(`step-${idx}`, 'running');
                // Animate cursor for canvas operations
                if (['add_rect', 'add_text', 'add_ellipse', 'move_node'].includes(name)) {
                    moveCursor(Math.random() * 200 + 50, Math.random() * 200 + 50, name);
                }
                // Capture generate_full_design prompt for post-chat execution
                if (name === 'generate_full_design') {
                    // The prompt is already captured via the override
                }
            },
            onStepComplete: (idx: number, result) => {
                updateCard(`step-${idx}`, result.success ? 'done' : 'error', result.success ? 'Done' : 'Failed');
                // Check if this was a generate_full_design invocation
                if (result.data && typeof result.data === 'object' && (result.data as Record<string, unknown>).__meta_tool === 'generate_full_design') {
                    pendingDesignPrompt = (result.data as Record<string, unknown>).prompt as string;
                }
            },
            onReflection: () => updateCard('reflection', 'done'),
            onToken: () => { /* streamed text handled by reply */ },
            onComplete: () => {},
            onError: (err: string) => { hadError = err; },
        }, dashboardOverride);

        hideCursor();

        // ★ If LLM chose generate_full_design, run the structured pipeline
        if (pendingDesignPrompt && !hadError) {
            const designResult = await runGenerateFlow(pendingDesignPrompt);
            return designResult || 'Design generated using structured layout pipeline.';
        }

        const reply = serviceRef.current.getLastReply();
        if (hadError) throw new Error(hadError);
        return reply || 'Request completed.';
    }, [navigate, addCard, updateCard, moveCursor, hideCursor]);

    // ── Main Send (Single Loop) ──────────────────
    const send = useCallback(async (text?: string, imageData?: string) => {
        const msg = text ?? input.trim();
        if (!msg && !imageData) return;

        setInput('');
        const userMsg: AgentMessage = { role: 'user', content: msg || 'Scan this design', timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        // SINGLE LOOP: Only image upload triggers scan.
        // ALL text input goes to LLM agentic loop — LLM decides tools.
        const intent: AgentIntent = imageData ? 'scan' : 'agent';
        setState({ ...INITIAL_STATE, phase: 'thinking', intent });

        try {
            let reply = '';

            if (intent === 'scan' && imageData) {
                reply = await runScanFlow(imageData);
            } else {
                // ── SINGLE LOOP: ALL text → LLM agentic loop ──
                // LLM decides: generate_full_design, generate_image,
                // add_text, set_color, or any other tool.
                const config = getConfig();

                // ── Phase 0: Context Router ──
                const currentPath = location.pathname;
                const ctx = buildContext(currentPath);

                // Enrich the message with structured context
                const enrichedMsg = enrichMessageWithContext(msg, ctx);

                // Set context-aware system prompt on the service
                const designState = useDesignStore.getState();
                if (serviceRef.current) {
                    // Context system prompt is available for future use:
                    // const _contextPrompt = buildContextSystemPrompt(ctx);
                    serviceRef.current.setDesignContext(
                        designState.creativeSet ?? null,
                        designState.creativeSet?.masterVariantId,
                    );
                    console.log(`[ContextRouter] Page: ${ctx.pageLabel}, Pipeline: ${ctx.useDesignPipeline ? 'design' : 'direct'}, Tools: ${ctx.relevantToolHint.slice(0, 60)}...`);
                }

                reply = await runChatFlow(enrichedMsg, config);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
            setState(prev => ({ ...prev, phase: 'done' }));
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setMessages(prev => [...prev, { role: 'assistant', content: `[Error] ${errMsg}`, timestamp: Date.now() }]);
            setState(prev => ({ ...prev, phase: 'error', error: errMsg }));
        }
    }, [input, location.pathname, getConfig, runGenerateFlow, runScanFlow, runChatFlow]);

    const clearChat = useCallback(() => {
        setMessages([]);
        setState(INITIAL_STATE);
    }, []);

    return {
        messages,
        state,
        input,
        setInput,
        send,
        setEngine,
        clearChat,
        engineRef,
    };
}
