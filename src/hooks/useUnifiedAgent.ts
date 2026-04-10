// ─────────────────────────────────────────────────
// useUnifiedAgent — Brain of the Unified AI Agent
// ─────────────────────────────────────────────────
// Intent detection: classify user messages → route to correct pipeline
// Orchestrates: chat, auto-design, scan-design, modify, smart-check
// Flow logic extracted: agentGenerateFlow.ts, agentFlowTypes.ts
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { AiService, type AiConfig, type ToolExecutorOverride } from '@/ai/aiService';
import { DASHBOARD_TOOL_NAMES } from '@/ai/dashboardTools';
import { executeDashboardTool } from '@/ai/dashboardExecutor';
import { useDesignStore } from '@/stores/designStore';
import { getModelForRole, type AceModelRole } from '@/services/modelRouter';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import type { AgentMessage } from '@/ai/agentContext';
import type { NavigateFunction } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { buildContext, enrichMessageWithContext } from '@/ai/contextRouter';
import { resilientImport } from '@/utils/resilientImport';
import { executeGenerateFlow } from './agentGenerateFlow';
import type { AgentFlowCallbacks, FlowEngine } from './agentFlowTypes';

// ── Types ────────────────────────────────────────

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

export type AgentIntent = 'scan' | 'agent';

interface UseUnifiedAgentOptions {
    navigate: NavigateFunction;
    selectedRole: AceModelRole;
}

export function useUnifiedAgent({ navigate, selectedRole }: UseUnifiedAgentOptions) {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [state, setState] = useState<UnifiedAgentState>(INITIAL_STATE);
    const [input, setInput] = useState('');
    const engineRef = useRef<any>(null);
    const serviceRef = useRef<AiService | null>(null);
    const location = useLocation();
    const { recordAIUsage, canUseAI } = usePlanLimits();

    // ── Narration & Card callbacks ──
    const narrate = useCallback((text: string) => {
        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'narration') return [...prev.slice(0, -1), { ...last, content: text, timestamp: Date.now() }];
            return [...prev, { role: 'narration' as AgentMessage['role'], content: text, timestamp: Date.now() }];
        });
    }, []);

    const addCard = useCallback((id: string, label: string, status: ProgressCard['status'] = 'running', opts?: { reasoning?: string; expandedDetail?: string }) => {
        const card: ProgressCard = { id, label, status, ...opts };
        setMessages(prev => [...prev, { role: 'action' as AgentMessage['role'], content: '', timestamp: Date.now(), actionCard: card }]);
    }, []);

    const updateCard = useCallback((id: string, status: ProgressCard['status'], detail?: string, opts?: { reasoning?: string; expandedDetail?: string }) => {
        setMessages(prev => prev.map(m => {
            if (m.actionCard?.id === id) {
                return { ...m, actionCard: { ...m.actionCard, status, ...(detail !== undefined ? { detail } : {}), ...(opts?.reasoning !== undefined ? { reasoning: opts.reasoning } : {}), ...(opts?.expandedDetail !== undefined ? { expandedDetail: opts.expandedDetail } : {}) } };
            }
            return m;
        }));
    }, []);

    const moveCursor = useCallback((x: number, y: number, label?: string) => {
        setState(prev => ({ ...prev, liveCursor: { active: true, x, y, label } }));
    }, []);

    const hideCursor = useCallback(() => {
        setState(prev => ({ ...prev, liveCursor: { active: false, x: 0, y: 0 } }));
    }, []);

    const setEngine = useCallback((e: any) => { engineRef.current = e?.current ?? e; }, []);

    const getConfig = useCallback((): AiConfig => {
        const model = getModelForRole(selectedRole);
        // ★ Max 3 rounds: analyze_scene → execute → done. Prevents runaway API costs.
        const base: AiConfig = { endpoint: 'https://openrouter.ai/api', model: model.id, maxToolRounds: 3 };
        // ★ maxToolRounds is NEVER loaded from localStorage — prevents stale high values.
        const saved = localStorage.getItem('ace-ai-config');
        if (saved) { try { const p = JSON.parse(saved) as Partial<AiConfig>; if (p.endpoint) base.endpoint = p.endpoint; } catch { /* */ } }
        return base;
    }, [selectedRole]);

    // ── Flow callbacks object (shared) ──
    const flowCallbacks: AgentFlowCallbacks = { narrate, addCard, updateCard, moveCursor, hideCursor };

    // ── Generate Design ──
    const runGenerateFlow = useCallback(async (prompt: string) => {
        const engine = engineRef.current?.current ?? engineRef.current;
        if (!engine) throw new Error('Canvas not connected.');
        return executeGenerateFlow(prompt, engine as FlowEngine, flowCallbacks);
    }, [flowCallbacks]);

    // ── Scan Design ──
    const runScanFlow = useCallback(async (imageData: string) => {
        const engine = engineRef.current?.current ?? engineRef.current;
        if (!engine) throw new Error('Canvas not connected.');

        let canvasW = 300, canvasH = 250;
        try { const dims = engine.get_canvas_size?.(); if (dims) { canvasW = dims.width ?? 300; canvasH = dims.height ?? 250; } } catch { /* ok */ }

        narrate('I see your screenshot. Let me analyze it with Vision AI and extract the design layers.');
        addCard('scan', 'Analyzing screenshot with Vision AI', 'running');
        const { scanDesignScreenshot } = await resilientImport(() => import('@/services/screenshotScanService'));
        const abort = new AbortController();
        const result = await scanDesignScreenshot(imageData, canvasW, canvasH, abort.signal);
        updateCard('scan', 'done', `Found ${result.elements.length} elements`);
        narrate(`Found ${result.elements.length} elements. Now rendering as editable layers.`);

        addCard('render', 'Rendering layers on canvas', 'running');
        try { engine.clear_scene?.(); } catch { /* ok */ }

        let rendered = 0;
        for (const el of result.elements) {
            moveCursor(el.x ?? 0, el.y ?? 0, el.name);
            await new Promise(r => setTimeout(r, 120));
            try {
                if (el.is_complex_bg) {
                    engine.add_rect(el.x ?? 0, el.y ?? 0, el.w ?? canvasW, el.h ?? canvasH, el.r ?? 0.08, el.g ?? 0.08, el.b ?? 0.1, 1, `${el.name ?? 'background'} (replace with image)`);
                } else if (el.gradient_start_hex && el.gradient_end_hex) {
                    engine.add_gradient_rect(el.x, el.y, el.w, el.h, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135, el.radius ?? 0, el.name);
                } else if (el.type === 'text') {
                    const hexToRgb = (hex: string): [number, number, number] => { const c = hex.replace('#', ''); return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255]; };
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
        narrate(`Done — ${rendered} layers extracted. Each is fully editable.`);
        return `Scanned design: ${rendered} layers extracted.`;
    }, [addCard, updateCard, moveCursor, hideCursor, narrate]);

    // ── Chat (regular AI agent) ──
    const runChatFlow = useCallback(async (msg: string, config: AiConfig) => {
        if (!serviceRef.current) serviceRef.current = new AiService([]);
        serviceRef.current.updateConfig(config);

        const dashboardOverride: ToolExecutorOverride = (toolName, params) => {
            if (toolName === 'generate_full_design') {
                return { success: true, message: `[GENERATE_FULL_DESIGN] Launching pipeline for: "${(params.prompt as string ?? '').slice(0, 80)}"`, data: { __meta_tool: 'generate_full_design', prompt: params.prompt ?? '' } };
            }
            if (DASHBOARD_TOOL_NAMES.has(toolName)) { const result = executeDashboardTool(toolName, params, navigate); return { success: result.success, message: result.message, data: result.data }; }
            return null;
        };

        const engine = engineRef.current?.current ?? engineRef.current;
        const designState = useDesignStore.getState();
        serviceRef.current.setDesignContext(designState.creativeSet ?? null, designState.creativeSet?.masterVariantId);

        narrate('Let me look at the current canvas and work on your request.');
        addCard('thinking', 'Processing request', 'running');

        let hadError = '';
        let pendingDesignPrompt: string | null = null;

        await serviceRef.current.chat(msg, engine, {
            onCanvasScan: () => updateCard('thinking', 'running', 'Scanning canvas'),
            onThinking: (t: string) => {
                if (t.length > 100) {
                    updateCard('thinking', 'done', 'Reasoning complete');
                    setMessages(prev => [...prev, { role: 'thinking' as AgentMessage['role'], content: t, timestamp: Date.now() }]);
                } else {
                    updateCard('thinking', 'running', t || 'Thinking...');
                }
            },
            onPlan: (steps: string[]) => { updateCard('thinking', 'done'); steps.forEach((s, i) => addCard(`step-${i}`, s, 'pending')); },
            onStepStart: (idx: number, name: string) => {
                updateCard(`step-${idx}`, 'running');
                if (['add_rect', 'add_text', 'add_ellipse', 'move_node'].includes(name)) moveCursor(Math.random() * 200 + 50, Math.random() * 200 + 50, name);
            },
            onStepComplete: (idx: number, result) => {
                updateCard(`step-${idx}`, result.success ? 'done' : 'error', result.success ? 'Done' : 'Failed');
                if (result.data && typeof result.data === 'object' && (result.data as Record<string, unknown>).__meta_tool === 'generate_full_design') {
                    pendingDesignPrompt = (result.data as Record<string, unknown>).prompt as string;
                }
            },
            onReflection: () => updateCard('reflection', 'done'),
            onToken: () => {},
            onComplete: () => {},
            onError: (err: string) => { hadError = err; },
        }, dashboardOverride);

        hideCursor();

        if (pendingDesignPrompt && !hadError) {
            const engine = engineRef.current?.current ?? engineRef.current;
            if (!engine) {
                // No engine (e.g. dashboard) — tell user to navigate to editor
                return 'I need a canvas to create designs. Please open a creative set in the editor first, then I can design for you.';
            }
            return await runGenerateFlow(pendingDesignPrompt) || 'Design generated.';
        }
        const reply = serviceRef.current.getLastReply();
        if (hadError) throw new Error(hadError);
        return reply || 'Request completed.';
    }, [navigate, addCard, updateCard, moveCursor, hideCursor, narrate, runGenerateFlow]);

    // ── Main Send ──
    const send = useCallback(async (text?: string, imageData?: string) => {
        const msg = text ?? input.trim();
        if (!msg && !imageData) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg || 'Scan this design', timestamp: Date.now() }]);

        const intent: AgentIntent = imageData ? 'scan' : 'agent';
        setState({ ...INITIAL_STATE, phase: 'thinking', intent });

        try {
            let reply = '';
            if (intent === 'scan' && imageData) {
                reply = await runScanFlow(imageData);
            } else {
                // ★ Check AI quota before proceeding
                if (!canUseAI()) {
                    setMessages(prev => [...prev, { role: 'assistant', content: 'You have reached your monthly AI generation limit. Please upgrade your plan for more AI generations.', timestamp: Date.now() }]);
                    setState(prev => ({ ...prev, phase: 'done' }));
                    return;
                }
                const config = getConfig();
                const ctx = buildContext(location.pathname);
                const enrichedMsg = enrichMessageWithContext(msg, ctx);
                const designState = useDesignStore.getState();
                if (serviceRef.current) {
                    serviceRef.current.setDesignContext(designState.creativeSet ?? null, designState.creativeSet?.masterVariantId);
                    console.log(`[ContextRouter] Page: ${ctx.pageLabel}, Pipeline: ${ctx.useDesignPipeline ? 'design' : 'direct'}, Elements: ${ctx.elementCount}`);
                }
                reply = await runChatFlow(enrichedMsg, config);
            }
            setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
            setState(prev => ({ ...prev, phase: 'done' }));

            // ★ Record AI usage after successful completion
            console.log('[useUnifiedAgent] AI request completed — recording usage');
            recordAIUsage(1);
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setMessages(prev => [...prev, { role: 'assistant', content: `[Error] ${errMsg}`, timestamp: Date.now() }]);
            setState(prev => ({ ...prev, phase: 'error', error: errMsg }));

            // ★ Record even failed attempts (they still cost tokens)
            console.log('[useUnifiedAgent] AI request errored — still recording usage');
            recordAIUsage(1);
        }
    }, [input, location.pathname, getConfig, runGenerateFlow, runScanFlow, runChatFlow, canUseAI, recordAIUsage]);

    const clearChat = useCallback(() => { setMessages([]); setState(INITIAL_STATE); }, []);

    const applyGalleryImage = useCallback((imageUrl: string, canvasW: number, canvasH: number) => {
        const engine = engineRef.current;
        if (!engine?.add_image) return;
        try { const allNodes = JSON.parse(engine.get_all_nodes?.() ?? '[]'); for (const node of allNodes) { const name = (node.name ?? node.label ?? '').toLowerCase(); if (name.includes('background') || name.includes('ai_background') || name.includes('bg')) { try { engine.delete_node?.(node.id); } catch { /* ok */ } } } } catch { /* */ }
        engine.add_image(0, 0, imageUrl, canvasW, canvasH, 'ai_background').then((nodeId: number) => { if (engine.send_to_back) engine.send_to_back(nodeId); });
    }, []);

    return { messages, state, input, setInput, send, setEngine, clearChat, applyGalleryImage, engineRef };
}
