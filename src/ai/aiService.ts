// ─────────────────────────────────────────────────
// AI Service v2 — Eval-First Agentic Loop
// ─────────────────────────────────────────────────
// Simplified: no extended thinking, no vision healing,
// contextRouter as sole prompt source, 1 retry max.
// Narration: AI explains before executing, results shown after.

import { AgentContext, type AgentMessage, type ToolCallRecord, type SceneNodeInfo } from './agentContext';
import { ALL_TOOLS } from './agentTools';
import { toClaudeTools } from './aceToolDef';
import { executeToolCall, type ExecutionResult } from './commandExecutor';
import { buildContext, buildContextSystemPrompt, enrichMessageWithContext } from './contextRouter';
import { getOpenRouterKey } from '@/config/apiKeys';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

// ── Config ───────────────────────────────────────

export interface AiConfig {
    endpoint: string;
    model: string;
    maxToolRounds: number;
}

const DEFAULT_CONFIG: AiConfig = {
    endpoint: 'https://openrouter.ai/api',
    model: 'anthropic/claude-sonnet-4',
    maxToolRounds: 2, // 1 tool batch + 1 text response
};

export function loadConfig(): AiConfig {
    try {
        const stored = localStorage.getItem('ace-ai-config');
        if (stored) {
            const parsed = JSON.parse(stored);
            delete parsed.maxToolRounds;
            return { ...DEFAULT_CONFIG, ...parsed };
        }
    } catch { /* */ }
    return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AiConfig): void {
    const { maxToolRounds: _, ...rest } = config;
    localStorage.setItem('ace-ai-config', JSON.stringify(rest));
}

// ── Live Progress Callbacks ──────────────────────

export interface LiveProgress {
    onCanvasScan: (summary: string) => void;
    onThinking: (content: string) => void;
    onPlan: (steps: string[]) => void;
    onStepStart: (stepIndex: number, toolName: string, params: Record<string, unknown>) => void;
    onStepComplete: (stepIndex: number, result: ExecutionResult) => void;
    onReflection: (content: string) => void;
    onToken: (token: string) => void;
    onComplete: (message: AgentMessage) => void;
    onError: (error: string) => void;
}

export type ToolExecutorOverride = (toolName: string, params: Record<string, unknown>) => ExecutionResult | null;

// ── Claude API Types ─────────────────────────────

interface ClaudeContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
    is_error?: boolean;
}

interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string | ClaudeContentBlock[];
}

interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    content: ClaudeContentBlock[];
    model: string;
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
    usage: { input_tokens: number; output_tokens: number };
}

// ── AI Service ───────────────────────────────────

export class AiService {
    private context: AgentContext;
    private config: AiConfig;
    private trackedNodes: SceneNodeInfo[];

    constructor(trackedNodes: SceneNodeInfo[]) {
        this.context = new AgentContext();
        this.config = loadConfig();
        this.trackedNodes = trackedNodes;
    }

    getContext(): AgentContext {
        return this.context;
    }

    updateConfig(config: Partial<AiConfig>): void {
        this.config = { ...this.config, ...config };
        saveConfig(this.config);
    }

    getConfig(): AiConfig {
        return { ...this.config };
    }

    isConfigured(): boolean {
        return !!getOpenRouterKey();
    }

    getLastReply(): string {
        const msgs = this.context.getHistory();
        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (m?.role === 'assistant') return m.content;
        }
        return '';
    }

    /**
     * Main chat — runs eval-first agentic loop.
     */
    async chat(
        userMessage: string,
        engine: Engine,
        progress: LiveProgress,
        executorOverride?: ToolExecutorOverride,
    ): Promise<void> {
        if (!getOpenRouterKey()) {
            progress.onError('OpenRouter API key not configured. Set VITE_OPENROUTER_API_KEY in .env');
            return;
        }

        // Add user message
        const userMsg: AgentMessage = {
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
        };
        this.context.addMessage(userMsg);

        // Phase 0: Build shadow workspace snapshot
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
        const ctx = buildContext(pathname);
        const systemPrompt = buildContextSystemPrompt(ctx);

        // Enrich message with context
        const enrichedMessage = enrichMessageWithContext(userMessage, ctx);

        // Show workspace scan
        const scanSummary = ctx.elementCount > 0
            ? `${ctx.pageLabel}: ${ctx.elementCount} elements on ${ctx.canvasSize?.w}x${ctx.canvasSize?.h}px canvas`
            : `${ctx.pageLabel}: empty canvas`;
        progress.onCanvasScan(scanSummary);
        await nextFrame();
        await sleep(300);

        // Phase 1: Thinking
        progress.onThinking('Analyzing your request...');
        await nextFrame();

        try {
            await this.agenticLoop(engine, systemPrompt, enrichedMessage, progress, executorOverride);
        } catch (err) {
            progress.onError(`AI Error: ${err}`);
        }

        // Post-interaction: save facts to memory (fire-and-forget)
        this.saveInteractionMemory(userMessage).catch(() => {});
    }

    /**
     * Core agentic loop — single round + text response.
     */
    private async agenticLoop(
        engine: Engine,
        systemPrompt: string,
        enrichedUserMessage: string,
        progress: LiveProgress,
        executorOverride?: ToolExecutorOverride,
    ): Promise<void> {
        const messages = this.buildClaudeMessages(enrichedUserMessage);
        const tools = toClaudeTools(ALL_TOOLS);

        let rounds = 0;
        let finished = false;
        const allToolRecords: ToolCallRecord[] = [];

        await nextFrame();

        while (!finished && rounds < this.config.maxToolRounds) {
            rounds++;

            const response = await this.callClaude(systemPrompt, messages, tools, progress);

            if (!response) {
                progress.onError('No response from AI');
                return;
            }

            const textBlocks = response.content.filter(b => b.type === 'text');
            const toolBlocks = response.content.filter(b => b.type === 'tool_use');

            // ★ Narration: text was already streamed token-by-token via SSE in callClaude.
            // No fake char-by-char loop needed.

            if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
                // Show plan with natural language labels
                const planSteps = toolBlocks.map(tc => {
                    const params = tc.input as Record<string, unknown> ?? {};
                    return humanizeToolStep(tc.name!, params);
                });
                progress.onPlan(planSteps);
                await sleep(400);

                // Store assistant message
                messages.push({ role: 'assistant', content: response.content });

                // Execute tools
                const toolResults: ClaudeContentBlock[] = [];
                const toolRecords: ToolCallRecord[] = [];

                for (let i = 0; i < toolBlocks.length; i++) {
                    const tc = toolBlocks[i]!;
                    const params = (tc.input ?? {}) as Record<string, unknown>;

                    progress.onStepStart(i, tc.name!, params);
                    await nextFrame();

                    const startTime = Date.now();

                    // Route: override → canvas executor
                    let result: ExecutionResult;
                    const overrideResult = executorOverride?.(tc.name!, params);
                    if (overrideResult) {
                        result = overrideResult;
                    } else {
                        result = await executeToolCall(engine, tc.name!, params, this.trackedNodes);
                    }
                    const durationMs = Date.now() - startTime;

                    progress.onStepComplete(i, result);
                    await sleep(200);

                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: tc.id!,
                        content: JSON.stringify(result),
                        is_error: !result.success,
                    });

                    toolRecords.push({
                        name: tc.name!,
                        input: params,
                        result,
                        durationMs,
                    });
                }

                allToolRecords.push(...toolRecords);

                messages.push({ role: 'user', content: toolResults });

                // Store text narration from this round
                const roundText = textBlocks.map(b => b.text).filter(Boolean).join('\n');
                if (roundText) {
                    this.context.addMessage({
                        role: 'assistant',
                        content: roundText,
                        timestamp: Date.now(),
                        toolCalls: toolRecords,
                    });
                }
            } else {
                // Final text response
                finished = true;

                const content = textBlocks.map(b => b.text).filter(Boolean).join('\n');
                progress.onReflection(content);
                await sleep(300);

                const assistantMsg: AgentMessage = {
                    role: 'assistant',
                    content,
                    timestamp: Date.now(),
                    toolCalls: allToolRecords.length > 0 ? allToolRecords : undefined,
                };
                this.context.addMessage(assistantMsg);
                progress.onComplete(assistantMsg);
            }
        }

        if (rounds >= this.config.maxToolRounds && !finished) {
            progress.onError(`Reached maximum tool rounds (${this.config.maxToolRounds}).`);
        }
    }

    /**
     * Build conversation messages for Claude.
     * Rolling summarization for long conversations.
     */
    private buildClaudeMessages(currentMessage?: string): ClaudeMessage[] {
        const messages: ClaudeMessage[] = [];
        const all = this.context.getHistory()
            .filter(m => m.role === 'user' || m.role === 'assistant');

        const RECENT_WINDOW = 10;

        if (all.length > RECENT_WINDOW) {
            const older = all.slice(0, all.length - RECENT_WINDOW);
            const summaryLines: string[] = [];
            for (const msg of older) {
                const prefix = msg.role === 'user' ? 'User' : 'AI';
                const short = msg.content.replace(/\n+/g, ' ').slice(0, 80);
                summaryLines.push(`${prefix}: ${short}`);
            }
            messages.push({
                role: 'user',
                content: `[HISTORY — ${older.length} earlier messages]\n${summaryLines.join('\n')}\n[END]`,
            });
            messages.push({
                role: 'assistant',
                content: 'Understood.',
            });
        }

        // Recent messages (excluding the current one which was already added to context)
        const recent = all.slice(-RECENT_WINDOW);
        for (const msg of recent) {
            messages.push({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            });
        }

        // Override the last user message with enriched version if provided
        if (currentMessage && messages.length > 0 && messages[messages.length - 1]!.role === 'user') {
            messages[messages.length - 1]!.content = currentMessage;
        }

        return messages;
    }

    /**
     * Call Claude via OpenRouter — ★ SSE STREAMING for Cursor-grade UX.
     * Tokens stream to progress.onToken() in real-time.
     * max_tokens: 4096 (halved), retries: 1 (was 3).
     */
    private async callClaude(
        systemPrompt: string,
        messages: ClaudeMessage[],
        tools: ReturnType<typeof toClaudeTools>,
        progress: LiveProgress,
    ): Promise<ClaudeResponse | null> {
        // ★ FIX: User's UI selection is ALWAYS primary.
        // Plan gating happens at the dropdown level (GlobalAiPanel), not here.
        const { useAuthStore } = await import('@/stores/authStore');
        const { PLAN_LIMITS } = await import('@/schema/planTypes');
        const authState = useAuthStore.getState();
        const userPlan = authState.user?.plan ?? 'starter';
        const planDefaults = PLAN_LIMITS[userPlan];
        // this.config.model = user's explicit dropdown selection. Only fall back to plan default if empty.
        const model = this.config.model || planDefaults?.defaultModel || 'anthropic/claude-3.5-haiku';
        console.log(`[AiService] Plan: ${userPlan} → Model: ${model} (user-selected: ${this.config.model})`);
        const apiKey = getOpenRouterKey();

        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const apiUrl = isLocalDev
            ? '/api/openrouter/v1/chat/completions'
            : 'https://openrouter.ai/api/v1/chat/completions';

        // Build OpenAI-format messages
        const openAiMessages: Array<Record<string, unknown>> = [];
        if (systemPrompt) {
            openAiMessages.push({ role: 'system', content: systemPrompt });
        }
        for (const msg of messages) {
            if (typeof msg.content === 'string') {
                openAiMessages.push({ role: msg.role, content: msg.content });
            } else if (Array.isArray(msg.content)) {
                if (msg.role === 'user') {
                    const toolResults = msg.content.filter((b: ClaudeContentBlock) => b.type === 'tool_result');
                    if (toolResults.length > 0) {
                        for (const tr of toolResults) {
                            openAiMessages.push({
                                role: 'tool',
                                tool_call_id: tr.tool_use_id,
                                content: tr.content ?? '',
                            });
                        }
                    } else {
                        openAiMessages.push({ role: msg.role, content: msg.content });
                    }
                } else {
                    const textParts = msg.content.filter((b: ClaudeContentBlock) => b.type === 'text');
                    const toolParts = msg.content.filter((b: ClaudeContentBlock) => b.type === 'tool_use');
                    const openAiMsg: Record<string, unknown> = { role: 'assistant' };
                    openAiMsg.content = textParts.length > 0
                        ? textParts.map((b: ClaudeContentBlock) => b.text).join('\n')
                        : null;
                    if (toolParts.length > 0) {
                        openAiMsg.tool_calls = toolParts.map((tc: ClaudeContentBlock) => ({
                            id: tc.id,
                            type: 'function',
                            function: { name: tc.name, arguments: JSON.stringify(tc.input ?? {}) },
                        }));
                    }
                    openAiMessages.push(openAiMsg);
                }
            }
        }

        const openAiTools = tools.length > 0 ? tools.map(t => ({
            type: 'function' as const,
            function: {
                name: t.name,
                description: t.description,
                parameters: t.input_schema,
            },
        })) : undefined;

        // ★ SSE streaming enabled
        const body: Record<string, unknown> = {
            model,
            max_tokens: 4096,
            messages: openAiMessages,
            tools: openAiTools,
            stream: true,  // ★ Cursor-grade: token-by-token streaming
        };

        console.log(`[AiService] → ${apiUrl} (model: ${model}, msgs: ${openAiMessages.length}, tools: ${tools.length}, stream: true)`);

        // ★ 1 retry max (was 3)
        const maxRetries = 1;
        let lastError = '';

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://ace.design',
                    'X-Title': 'Glid Design Engine',
                },
                body: JSON.stringify(body),
            });

            if (resp.ok) {
                return await this.parseSSEStream(resp, model, progress);
            }

            if (resp.status === 429 && attempt < maxRetries) {
                const waitSec = 10;
                console.warn(`[AiService] Rate limited (429). Retrying in ${waitSec}s...`);
                progress.onThinking(`Rate limited. Retrying in ${waitSec}s...`);
                await sleep(waitSec * 1000);
                continue;
            }

            const errorText = await resp.text();
            try {
                const errJson = JSON.parse(errorText);
                lastError = errJson?.error?.message || `API Error ${resp.status}: ${errorText.substring(0, 200)}`;
            } catch {
                lastError = `API Error ${resp.status}: ${errorText.substring(0, 200)}`;
            }
            console.error(`[AiService] ${lastError}`);
            progress.onError(lastError);
            return null;
        }

        progress.onError(`Rate limited. Please wait a moment and try again.`);
        return null;
    }

    /**
     * ★ SSE Stream Parser — Cursor-grade token streaming.
     * Reads OpenRouter SSE chunks, emits tokens in real-time via progress.onToken(),
     * accumulates text + tool calls, returns complete ClaudeResponse at the end.
     */
    private async parseSSEStream(
        resp: Response,
        model: string,
        progress: LiveProgress,
    ): Promise<ClaudeResponse | null> {
        const reader = resp.body?.getReader();
        if (!reader) {
            progress.onError('Streaming not supported');
            return null;
        }

        const decoder = new TextDecoder();
        let sseBuffer = '';
        let fullText = '';
        let responseId = '';
        let inputTokens = 0;
        let outputTokens = 0;

        // Tool call accumulation (OpenAI streams tool calls in incremental chunks)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolCallMap = new Map<number, { id: string; name: string; args: string }>();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split('\n');
                sseBuffer = lines.pop() ?? '';  // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                    if (trimmed === 'data: [DONE]') continue;

                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const chunk = JSON.parse(trimmed.slice(6)) as any;
                        if (chunk.id) responseId = chunk.id;

                        // Usage info (sent in final chunk by some providers)
                        if (chunk.usage) {
                            inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
                            outputTokens = chunk.usage.completion_tokens ?? outputTokens;
                        }

                        const delta = chunk.choices?.[0]?.delta;
                        if (!delta) continue;

                        // ★ Text content — stream to UI immediately
                        if (delta.content) {
                            fullText += delta.content;
                            progress.onToken(delta.content);
                        }

                        // ★ Tool calls — accumulate incrementally
                        if (delta.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                const idx = tc.index ?? 0;
                                if (!toolCallMap.has(idx)) {
                                    toolCallMap.set(idx, { id: tc.id ?? '', name: '', args: '' });
                                }
                                const entry = toolCallMap.get(idx)!;
                                if (tc.id) entry.id = tc.id;
                                if (tc.function?.name) entry.name += tc.function.name;
                                if (tc.function?.arguments) entry.args += tc.function.arguments;
                            }
                        }
                    } catch {
                        // Skip malformed SSE chunks
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // Build ClaudeResponse from accumulated stream data
        const content: ClaudeContentBlock[] = [];
        if (fullText) {
            content.push({ type: 'text', text: fullText });
        }

        for (const [, tc] of toolCallMap) {
            try {
                content.push({
                    type: 'tool_use',
                    id: tc.id,
                    name: tc.name,
                    input: JSON.parse(tc.args || '{}'),
                });
            } catch {
                console.warn(`[AiService] Failed to parse tool args for ${tc.name}`);
            }
        }

        const stopReason = toolCallMap.size > 0 ? 'tool_use' : 'end_turn';

        const result: ClaudeResponse = {
            id: responseId,
            type: 'message',
            role: 'assistant',
            content,
            model,
            stop_reason: stopReason as ClaudeResponse['stop_reason'],
            usage: { input_tokens: inputTokens, output_tokens: outputTokens },
        };

        console.log(`[AiService] Stream complete: stop=${result.stop_reason}, tools=${toolCallMap.size}, text=${fullText.length}ch, in=${inputTokens}|out=${outputTokens}`);
        return result;
    }

    /**
     * Save interaction facts to Supabase memory (fire-and-forget).
     * Extracts user preferences and design patterns.
     */
    private async saveInteractionMemory(userMessage: string): Promise<void> {
        try {
            const { saveAiMemory, extractFacts } = await import('@/services/aiMemoryService');
            const facts = extractFacts(userMessage, this.getLastReply());
            if (Object.keys(facts).length > 0) {
                await saveAiMemory(facts);
                console.log('[AiService] Memory saved:', Object.keys(facts));
            }
        } catch {
            // Memory save is optional — silently fail
        }
    }
}

// ── Helpers ──────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function nextFrame(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 16));
    });
}

/**
 * Convert a tool call into a human-readable narration step.
 */
function humanizeToolStep(name: string, params: Record<string, unknown>): string {
    switch (name) {
        case 'execute_dynamic_action':
            return (params.description as string) || 'Executing custom action...';
        case 'generate_full_design':
            return `Creating design: "${(params.prompt as string)?.slice(0, 50) || 'new design'}"`;
        case 'replace_background_image':
            return `Generating background: "${(params.prompt as string)?.slice(0, 50) || 'new image'}"`;
        case 'generate_image':
            return `Generating image: "${(params.prompt as string)?.slice(0, 50) || 'new image'}"`;
        case 'add_text':
            return `Adding text: "${(params.content as string)?.slice(0, 30) || 'text'}"`;
        case 'add_button':
            return `Adding button: "${(params.text as string) || 'Shop Now'}"`;
        case 'analyze_scene':
            return 'Reading canvas state...';
        default:
            return name.replace(/_/g, ' ');
    }
}
