// ─────────────────────────────────────────────────
// AI Service — Claude API + Agentic Loop
// ─────────────────────────────────────────────────
// Client-side LLM integration via OpenRouter:
// - OpenAI-compatible chat/completions API
// - Extended thinking for complex reasoning
// - 4-phase agentic loop (think → plan → execute → reflect)
// ─────────────────────────────────────────────────

import { AgentContext, type AgentMessage, type ToolCallRecord, type SceneNodeInfo } from './agentContext';
import { ALL_TOOLS } from './agentTools';
import { toClaudeTools } from './aceToolDef';
import { executeToolCall, type ExecutionResult } from './commandExecutor';
import { DASHBOARD_TOOL_NAMES } from './dashboardTools';
import { buildSmartContext, pushAction, type SmartContext } from './smartContextBuilder';
import { getOpenRouterKey } from '@/config/apiKeys';
import type { CreativeSet } from '@/schema/design.types';

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
    maxToolRounds: 30,
};

export function loadConfig(): AiConfig {
    try {
        const stored = localStorage.getItem('ace-ai-config');
        if (stored) {
            const parsed = JSON.parse(stored);
            // NEVER load maxToolRounds from storage — always use code default
            delete parsed.maxToolRounds;
            return { ...DEFAULT_CONFIG, ...parsed };
        }
    } catch { /* */ }
    return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AiConfig): void {
    // Don't persist maxToolRounds — it's a code-level constant
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
    /** Design context for smart context builder */
    designContext?: { creativeSet: CreativeSet | null; activeVariantId?: string };

    constructor(trackedNodes: SceneNodeInfo[]) {
        this.context = new AgentContext();
        this.config = loadConfig();
        this.trackedNodes = trackedNodes;
    }

    /** Set the current design context for smart AI prompting */
    setDesignContext(creativeSet: CreativeSet | null, activeVariantId?: string): void {
        this.designContext = { creativeSet, activeVariantId };
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
     * Main chat method — runs the full agentic loop with Claude.
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

        // Phase 0: Canvas scan
        let canvasSummary = 'No canvas engine connected (dashboard mode).';
        if (engine) {
            const nodeCount = engine.node_count?.() ?? 0;
            const animPlaying = engine.anim_playing?.() ? 'yes' : 'no';
            const trackedSummary = this.trackedNodes.length > 0
                ? this.trackedNodes.map(n => `• ${n.label} (${n.type}, id ${n.id})`).join('\n')
                : 'Empty canvas';
            canvasSummary = `Canvas: ${nodeCount} element${nodeCount !== 1 ? 's' : ''} · Animation: ${animPlaying}\n${trackedSummary}`;
        }
        progress.onCanvasScan(canvasSummary);
        await nextFrame();
        await sleep(400);

        // Build system prompt with smart context
        const smartCtx = buildSmartContext(
            engine ? 'editor' : 'dashboard',
            this.designContext?.creativeSet,
            this.designContext?.activeVariantId,
        );
        const systemPrompt = AgentContext.buildSystemPrompt(engine, this.trackedNodes, smartCtx);

        // Track user action for context continuity
        pushAction(`User: ${userMessage.substring(0, 100)}`);

        // Phase 1: Thinking
        progress.onThinking(`Analyzing your request with Claude...\nUsing: ${this.config.model}`);
        await nextFrame();

        try {
            await this.agenticLoop(engine, systemPrompt, progress, executorOverride);
        } catch (err) {
            progress.onError(`AI Error: ${err}`);
        }
    }

    /**
     * The core agentic loop — handles multi-round tool calling with Claude.
     */
    private async agenticLoop(
        engine: Engine,
        systemPrompt: string,
        progress: LiveProgress,
        executorOverride?: ToolExecutorOverride,
    ): Promise<void> {
        const messages = this.buildClaudeMessages();
        const tools = toClaudeTools(ALL_TOOLS);

        let rounds = 0;
        let finished = false;

        await nextFrame();

        while (!finished && rounds < this.config.maxToolRounds) {
            rounds++;

            const response = await this.callClaude(systemPrompt, messages, tools, progress);

            if (!response) {
                progress.onError('No response from Claude');
                return;
            }

            // Extract text and tool_use blocks
            const textBlocks = response.content.filter(b => b.type === 'text');
            const toolBlocks = response.content.filter(b => b.type === 'tool_use');

            // Stream text content
            for (const block of textBlocks) {
                if (block.text) {
                    for (const char of block.text) {
                        progress.onToken(char);
                        await sleep(6);
                    }
                }
            }

            if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
                // Phase 2: Planning
                const planSteps = toolBlocks.map(tc =>
                    `${tc.name}(${truncateArgs(JSON.stringify(tc.input ?? {}))})`
                );
                progress.onPlan(planSteps);
                await sleep(600);

                // Store assistant message with tool_use blocks
                messages.push({
                    role: 'assistant',
                    content: response.content,
                });

                // Phase 3: Execute tools and build tool_result blocks
                const toolResults: ClaudeContentBlock[] = [];
                const toolRecords: ToolCallRecord[] = [];

                for (let i = 0; i < toolBlocks.length; i++) {
                    const tc = toolBlocks[i]!;
                    const params = (tc.input ?? {}) as Record<string, unknown>;

                    progress.onStepStart(i, tc.name!, params);
                    await nextFrame();

                    const startTime = Date.now();

                    // Route execution: override → dashboard → canvas
                    let result: ExecutionResult;
                    const overrideResult = executorOverride?.(tc.name!, params);
                    if (overrideResult) {
                        result = overrideResult;
                    } else if (DASHBOARD_TOOL_NAMES.has(tc.name!)) {
                        result = { success: false, message: `Dashboard tool "${tc.name}" not available.` };
                    } else if (engine) {
                        result = await executeToolCall(engine, tc.name!, params, this.trackedNodes);
                    } else {
                        result = { success: false, message: 'Canvas engine not available. Navigate to the editor first.' };
                    }
                    const durationMs = Date.now() - startTime;

                    progress.onStepComplete(i, result);
                    await sleep(300);

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

                // Send tool results back as a user message
                messages.push({
                    role: 'user',
                    content: toolResults,
                });

                // Store text from this round if any
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
                // No tool calls — final text response
                finished = true;

                const content = textBlocks.map(b => b.text).filter(Boolean).join('\n');

                progress.onReflection(content);
                await sleep(500);

                const assistantMsg: AgentMessage = {
                    role: 'assistant',
                    content,
                    timestamp: Date.now(),
                };
                this.context.addMessage(assistantMsg);
                progress.onComplete(assistantMsg);
            }
        }

        if (rounds >= this.config.maxToolRounds && !finished) {
            progress.onError(`Reached maximum tool rounds (${this.config.maxToolRounds}). Stopping.`);
        }
    }

    /**
     * Build Claude messages from conversation history.
     */
    private buildClaudeMessages(): ClaudeMessage[] {
        const messages: ClaudeMessage[] = [];
        const recent = this.context.getRecentMessages(4);
        for (const msg of recent) {
            messages.push({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            });
        }
        return messages;
    }

    /**
     * Call the Claude Messages API.
     */
    private async callClaude(
        systemPrompt: string,
        messages: ClaudeMessage[],
        tools: ReturnType<typeof toClaudeTools>,
        progress: LiveProgress,
    ): Promise<ClaudeResponse | null> {
        const { model } = this.config;
        const apiKey = getOpenRouterKey();

        // Use Vite dev proxy to bypass CORS
        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const apiUrl = isLocalDev
            ? '/api/openrouter/v1/chat/completions'
            : 'https://openrouter.ai/api/v1/chat/completions';

        // Convert Anthropic messages → OpenAI format
        const openAiMessages: Array<Record<string, unknown>> = [];
        if (systemPrompt) {
            openAiMessages.push({ role: 'system', content: systemPrompt });
        }
        for (const msg of messages) {
            if (typeof msg.content === 'string') {
                openAiMessages.push({ role: msg.role, content: msg.content });
            } else if (Array.isArray(msg.content)) {
                // Handle tool_result blocks (user role) and tool_use blocks (assistant role)
                if (msg.role === 'user') {
                    // Convert tool_result blocks to OpenAI tool message format
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
                    // Assistant message with tool_use blocks → OpenAI tool_calls format
                    const textParts = msg.content.filter((b: ClaudeContentBlock) => b.type === 'text');
                    const toolParts = msg.content.filter((b: ClaudeContentBlock) => b.type === 'tool_use');
                    const openAiMsg: Record<string, unknown> = { role: 'assistant' };
                    if (textParts.length > 0) {
                        openAiMsg.content = textParts.map((b: ClaudeContentBlock) => b.text).join('\n');
                    } else {
                        openAiMsg.content = null;
                    }
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

        // Convert Anthropic tool schema → OpenAI function format
        const openAiTools = tools.length > 0 ? tools.map(t => ({
            type: 'function' as const,
            function: {
                name: t.name,
                description: t.description,
                parameters: t.input_schema,
            },
        })) : undefined;

        const body = {
            model,
            max_tokens: 2048,
            messages: openAiMessages,
            tools: openAiTools,
        };

        console.log(`[AiService] callClaude → ${apiUrl} (model: ${model}, msgs: ${openAiMessages.length})`);

        // Retry loop for rate limits (429)
        const maxRetries = 3;
        let lastError = '';

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://ace.design',
                    'X-Title': 'ACE Design Engine',
                },
                body: JSON.stringify(body),
            });

            if (resp.ok) {
                // Convert OpenAI response → Anthropic ClaudeResponse format
                const data = await resp.json() as Record<string, unknown>;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const choice = (data.choices as any[])?.[0];
                if (!choice) {
                    progress.onError('Empty response from OpenRouter');
                    return null;
                }

                const msg = choice.message ?? {};
                const content: ClaudeContentBlock[] = [];

                if (msg.content) {
                    content.push({ type: 'text', text: msg.content });
                }
                if (msg.tool_calls) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    for (const tc of msg.tool_calls as any[]) {
                        content.push({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.function?.name,
                            input: JSON.parse(tc.function?.arguments ?? '{}'),
                        });
                    }
                }

                const stopReason = msg.tool_calls?.length > 0 ? 'tool_use' : 'end_turn';
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const usage = data.usage as any ?? { input_tokens: 0, output_tokens: 0 };

                const result: ClaudeResponse = {
                    id: data.id as string ?? '',
                    type: 'message',
                    role: 'assistant',
                    content,
                    model: data.model as string ?? model,
                    stop_reason: stopReason as ClaudeResponse['stop_reason'],
                    usage: { input_tokens: usage.prompt_tokens ?? 0, output_tokens: usage.completion_tokens ?? 0 },
                };

                console.log(`[AiService] OpenRouter response: stop=${result.stop_reason}, blocks=${result.content.length}, usage=${result.usage.input_tokens}in/${result.usage.output_tokens}out`);
                return result;
            }

            // Rate limit — retry with backoff
            if (resp.status === 429) {
                const waitSec = 10 * Math.pow(2, attempt);
                console.warn(`[AiService] Rate limited (429). Retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxRetries})`);
                progress.onThinking(`Rate limited. Waiting ${waitSec}s before retrying... (${attempt + 1}/${maxRetries})`);
                await sleep(waitSec * 1000);
                continue;
            }

            // Other error — don't retry
            const errorText = await resp.text();
            try {
                const errJson = JSON.parse(errorText);
                lastError = errJson?.error?.message || `OpenRouter API Error ${resp.status}: ${errorText.substring(0, 200)}`;
            } catch {
                lastError = `OpenRouter API Error ${resp.status}: ${errorText.substring(0, 200)}`;
            }
            console.error(`[AiService] ${lastError}`);
            progress.onError(lastError);
            return null;
        }

        // All retries exhausted
        progress.onError(`Rate limit exceeded after ${maxRetries} retries. Please wait a minute and try again.`);
        return null;
    }
}

// ── Types ────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function nextFrame(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 16));
    });
}

function truncateArgs(argsJson: string): string {
    try {
        const obj = JSON.parse(argsJson);
        const short = JSON.stringify(obj);
        return short.length > 60 ? short.slice(0, 57) + '...' : short;
    } catch {
        return argsJson.length > 60 ? argsJson.slice(0, 57) + '...' : argsJson;
    }
}
