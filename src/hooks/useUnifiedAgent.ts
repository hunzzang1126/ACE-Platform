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

// ── Types ────────────────────────────────────────

export type AgentIntent = 'generate' | 'scan' | 'modify' | 'check' | 'general';

export interface ProgressCard {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    detail?: string;
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
    cards: ProgressCard[];
    error: string;
    liveCursor: LiveCursor;
}

const INITIAL_STATE: UnifiedAgentState = {
    phase: 'idle',
    intent: null,
    cards: [],
    error: '',
    liveCursor: { active: false, x: 0, y: 0 },
};

// ── Intent Detection ─────────────────────────────

const GENERATE_PATTERNS = [
    /\b(create|generate|make|design|build|new)\b.*\b(banner|ad|creative|layout|poster|social|post|page|landing)\b/i,
    /\b(from scratch|start fresh|new design|blank canvas)\b/i,
    /\b(summer|winter|sale|promo|launch|event|campaign)\b.*\b(banner|ad|creative|design)\b/i,
    /^(create|generate|make|design|build)\s/i,
];

const SCAN_PATTERNS = [
    /\b(scan|analyze|reverse.?engineer|extract|recreate|replicate)\b.*\b(design|screenshot|image|layout)\b/i,
    /\b(drop|upload|import)\b.*\b(screenshot|design|image)\b/i,
    /\b(convert|turn)\b.*\b(into|to)\b.*\b(editable|layers)\b/i,
];

const MODIFY_PATTERNS = [
    /\b(change|modify|update|edit|adjust|tweak|fix|make it|move|resize|recolor)\b/i,
    /\b(bolder|bigger|smaller|darker|lighter|brighter|wider|taller|shorter)\b/i,
    /\b(more|less)\s+(contrast|space|padding|gap|margin)\b/i,
];

const CHECK_PATTERNS = [
    /\b(check|verify|review|inspect|audit|qa|quality)\b/i,
    /\b(smart\s*check|vision\s*check)\b/i,
];

export function detectIntent(message: string): AgentIntent {
    const clean = message.trim();
    if (SCAN_PATTERNS.some(p => p.test(clean))) return 'scan';
    if (GENERATE_PATTERNS.some(p => p.test(clean))) return 'generate';
    if (CHECK_PATTERNS.some(p => p.test(clean))) return 'check';
    if (MODIFY_PATTERNS.some(p => p.test(clean))) return 'modify';
    return 'general';
}

// ── Hook ─────────────────────────────────────────

interface UseUnifiedAgentOptions {
    navigate: NavigateFunction;
    selectedRole: AceModelRole;
}

export function useUnifiedAgent({ navigate, selectedRole }: UseUnifiedAgentOptions) {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [state, setState] = useState<UnifiedAgentState>(INITIAL_STATE);
    const [input, setInput] = useState('');

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

    // ── Progress card helpers ────────────────────
    const addCard = useCallback((id: string, label: string, status: ProgressCard['status'] = 'running') => {
        setState(prev => ({
            ...prev,
            cards: [...prev.cards.filter(c => c.id !== id), { id, label, status }],
        }));
    }, []);

    const updateCard = useCallback((id: string, status: ProgressCard['status'], detail?: string) => {
        setState(prev => ({
            ...prev,
            cards: prev.cards.map(c => c.id === id ? { ...c, status, detail } : c),
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
    const getConfig = useCallback((): AiConfig => {
        const saved = localStorage.getItem('ace-ai-config');
        if (saved) {
            try { return JSON.parse(saved) as AiConfig; } catch { /* */ }
        }
        const model = getModelForRole(selectedRole);
        return { endpoint: 'https://openrouter.ai/api', model: model.id, maxToolRounds: 30 };
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

        // ── Phase 2: Style guide + Template selection ──
        const { selectStyleGuide } = await import('@/services/designStyleGuides');
        const guide = selectStyleGuide(prompt);
        const { selectTemplate } = await import('@/services/designTemplates');
        const template = selectTemplate(canvasW, canvasH);

        // Show variables like Pencil's set_variables step
        const colorSummary = [
            `Background: ${guide.colors.gradientStart} → ${guide.colors.gradientEnd}`,
            `Accent: ${guide.colors.accent}`,
            `Text: ${guide.colors.foreground}`,
        ].join('\n');
        narrate(
            `Style guide: "${guide.name}"\n${colorSummary}\n` +
            `Font: ${guide.typography.primaryFont} / ${guide.typography.secondaryFont}\n` +
            (template ? `Template: "${template.name}" (${canvasW}x${canvasH})` : `No template match — using freestyle generation`)
        );

        addCard('template', template ? `Template: ${template.name}` : 'Freestyle generation', 'done');
        await new Promise(r => setTimeout(r, 600)); // Pacing: let user read style guide info

        const abort = new AbortController();
        const { runVisionLoop } = await import('@/services/autoDesignLoop');

        let allElements: import('@/services/autoDesignService').RenderElement[] = [];

        if (template) {
            // ── Template-based path (PRIMARY) ──

            // Phase 3: AI generates ONLY content text
            addCard('content', 'Generating creative copy with AI', 'running');
            narrate(`Generating creative copy for "${prompt.slice(0, 60)}"...`);

            const { callTemplateContent } = await import('@/services/autoDesignService');
            const content = await callTemplateContent(prompt, canvasW, canvasH, template.name, abort.signal);
            updateCard('content', 'done', `Copy generated`);

            narrate(
                `Content ready:\n` +
                `  Headline: "${content.headline}"\n` +
                `  Subheadline: "${content.subheadline}"\n` +
                `  CTA: "${content.cta}"\n` +
                `  Tag: "${content.tag}"`
            );

            // Phase 4: Template fills positions
            addCard('build', 'Building layout from template', 'running');
            narrate(`Building layout from "${template.name}" template with ${guide.name} style...`);
            allElements = template.build(canvasW, canvasH, guide, content);
            updateCard('build', 'done', `${allElements.length} elements composed`);
            await new Promise(r => setTimeout(r, 400)); // Pacing

        } else {
            // ── Freestyle path (FALLBACK for unusual sizes) ──
            addCard('design', 'Generating layered composition', 'running');
            narrate(`Using freestyle AI generation for ${canvasW}x${canvasH}...`);

            const { callFromScratch } = await import('@/services/autoDesignService');
            const { buildFewShotExamples, useDesignMemoryStore } = await import('@/stores/designMemoryStore');
            const topExamples = useDesignMemoryStore.getState().getTopExamples(3);
            const fewShotStr = buildFewShotExamples(topExamples);

            const result = await callFromScratch(prompt, canvasW, canvasH, abort.signal, fewShotStr);
            allElements = result.elements;
            updateCard('design', 'done', `${allElements.length} elements planned`);
            await new Promise(r => setTimeout(r, 400)); // Pacing
        }

        // ── Phase 5: Multi-pass render with live narration ──
        // Group elements by layer
        const structureNames = new Set(['background', 'accent_zone', 'accent_glow', 'accent_line', 'accent_divider', 'tag_underline', 'tag_line']);
        const contentNames = new Set(['headline', 'subheadline', 'body_text', 'tag_text']);
        const actionNames = new Set(['cta_button', 'cta_label']);

        const layers: { name: string; elements: import('@/services/autoDesignService').RenderElement[] }[] = [
            { name: 'Structure', elements: allElements.filter(el => structureNames.has(el.name ?? '')) },
            { name: 'Content', elements: allElements.filter(el => contentNames.has(el.name ?? '')) },
            { name: 'Action', elements: allElements.filter(el => actionNames.has(el.name ?? '')) },
            { name: 'Polish', elements: allElements.filter(el => !structureNames.has(el.name ?? '') && !contentNames.has(el.name ?? '') && !actionNames.has(el.name ?? '')) },
        ];

        narrate(
            `Composition ready. Rendering ${allElements.length} elements in 4 layers:\n` +
            layers.map((l, i) => `  Layer ${i + 1} — ${l.name}: ${l.elements.length} elements`).join('\n')
        );
        await new Promise(r => setTimeout(r, 500)); // Pacing: let user read layer breakdown

        addCard('render', 'Placing elements on canvas', 'running');
        // Clear scene and gradient cache
        const { clearGradientCache, cacheGradientData } = await import('@/engine/elementConverters');
        clearGradientCache();
        try { engine.clear_scene?.(); } catch { /* ok */ }

        let rendered = 0;
        for (const layer of layers) {
            if (layer.elements.length === 0) continue;
            updateCard('render', 'running', `Placing ${layer.name.toLowerCase()} layer (${layer.elements.length})...`);
            await new Promise(r => setTimeout(r, 400)); // Pacing: pause between layers

            for (const el of layer.elements) {
                moveCursor(el.x ?? 0, el.y ?? 0, el.name);
                await new Promise(r => setTimeout(r, 100));

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
                        // Cache gradient data so save/restore preserves it
                        cacheGradientData(el.name ?? '', el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
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

                    rendered++;
                } catch (err) {
                    console.warn('[UnifiedAgent] Failed to render:', el.name, err);
                }
            }
        }
        hideCursor();
        updateCard('render', 'done', `${rendered} elements placed`);

        // Build summary of placed elements — like Pencil's operation results
        const placedSummary = allElements.slice(0, 8).map(el => {
            if (el.type === 'text') return `  "${el.name}" — text "${(el.content ?? '').slice(0, 30)}" ${el.font_size}px at (${el.x}, ${el.y})`;
            if (el.gradient_start_hex) return `  "${el.name}" — gradient ${el.gradient_start_hex} → ${el.gradient_end_hex} ${el.w}x${el.h}`;
            return `  "${el.name}" — ${el.type} at (${el.x}, ${el.y}) ${el.w}x${el.h}`;
        }).join('\n');
        const moreCount = Math.max(0, allElements.length - 8);
        narrate(`${rendered} elements placed:\n${placedSummary}${moreCount > 0 ? `\n  + ${moreCount} more` : ''}`);

        // ── Phase 6: Vision QA ──
        narrate(`Running vision quality check on ${canvasW}x${canvasH} canvas...`);
        addCard('vision', 'Vision quality review', 'running');
        try {
            const loopResult = await runVisionLoop(engine, canvasW, canvasH, abort.signal, (msg) => {
                updateCard('vision', 'running', msg);
            });
            updateCard('vision', 'done', `Score: ${loopResult.finalScore}/100`);
            narrate(
                `Vision review complete — score ${loopResult.finalScore}/100.\n` +
                `Style: ${guide.name}\n` +
                `Template: ${template?.name ?? 'freestyle'}\n` +
                `Elements: ${rendered}\n` +
                `Canvas: ${canvasW}x${canvasH}px`
            );
        } catch {
            updateCard('vision', 'done', 'Vision check skipped');
            narrate(`Design placed with ${rendered} elements using ${guide.name}.\nCanvas: ${canvasW}x${canvasH}px`);
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
            },
            onStepComplete: (idx: number, result) => {
                updateCard(`step-${idx}`, result.success ? 'done' : 'error', result.success ? 'Done' : 'Failed');
            },
            onReflection: () => updateCard('reflection', 'done'),
            onToken: () => { /* streamed text handled by reply */ },
            onComplete: () => {},
            onError: (err: string) => { hadError = err; },
        }, dashboardOverride);

        hideCursor();

        const reply = serviceRef.current.getLastReply();
        if (hadError) throw new Error(hadError);
        return reply || 'Request completed.';
    }, [navigate, addCard, updateCard, moveCursor, hideCursor]);

    // ── Main Send ────────────────────────────────
    const send = useCallback(async (text?: string, imageData?: string) => {
        const msg = text ?? input.trim();
        if (!msg && !imageData) return;

        setInput('');
        const userMsg: AgentMessage = { role: 'user', content: msg || 'Scan this design', timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        // Detect intent
        const intent: AgentIntent = imageData ? 'scan' : detectIntent(msg);
        setState({ ...INITIAL_STATE, phase: 'thinking', intent, cards: [] });

        try {
            let reply = '';

            if (intent === 'scan' && imageData) {
                reply = await runScanFlow(imageData);
            } else if (intent === 'generate') {
                reply = await runGenerateFlow(msg);
            } else {
                // general / modify / check — route through AI chat
                const config = getConfig();
                reply = await runChatFlow(msg, config);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
            setState(prev => ({ ...prev, phase: 'done' }));
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setMessages(prev => [...prev, { role: 'assistant', content: `[Error] ${errMsg}`, timestamp: Date.now() }]);
            setState(prev => ({ ...prev, phase: 'error', error: errMsg }));
        }
    }, [input, getConfig, runGenerateFlow, runScanFlow, runChatFlow]);

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
