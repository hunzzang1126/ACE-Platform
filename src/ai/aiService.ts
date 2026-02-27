// ─────────────────────────────────────────────────
// AI Service — Claude API + Agentic Loop
// ─────────────────────────────────────────────────
// Client-side LLM integration using Anthropic Claude API:
// - Claude Messages API (/v1/messages)
// - Extended thinking for complex reasoning
// - 4-phase agentic loop (think → plan → execute → reflect)
// ─────────────────────────────────────────────────

import { AgentContext, type AgentMessage, type ToolCallRecord, type SceneNodeInfo } from './agentContext';
import { getToolsForClaude } from './agentTools';
import { executeToolCall, type ExecutionResult } from './commandExecutor';
import { DASHBOARD_TOOL_NAMES } from './dashboardTools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

// ── Config ───────────────────────────────────────

export interface AiConfig {
    apiKey: string;
    endpoint: string;
    model: string;
    maxToolRounds: number;
}

const DEFAULT_CONFIG: AiConfig = {
    apiKey: '',
    endpoint: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514',
    maxToolRounds: 30,
};

export function loadConfig(): AiConfig {
    try {
        const stored = localStorage.getItem('ace-ai-config');
        if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch { /* */ }
    return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AiConfig): void {
    localStorage.setItem('ace-ai-config', JSON.stringify(config));
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
        return !!this.config.apiKey;
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
        if (!this.config.apiKey) {
            progress.onError('API key not configured. Set it in the settings panel.');
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

        // Build system prompt
        const systemPrompt = AgentContext.buildSystemPrompt(engine, this.trackedNodes);

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
        const tools = getToolsForClaude();

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
                        result = executeToolCall(engine, tc.name!, params, this.trackedNodes);
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
        tools: ReturnType<typeof getToolsForClaude>,
        progress: LiveProgress,
    ): Promise<ClaudeResponse | null> {
        const { apiKey, model } = this.config;

        // Use Vite dev proxy to bypass CORS
        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const apiUrl = isLocalDev
            ? '/api/anthropic/v1/messages'
            : 'https://api.anthropic.com/v1/messages';

        const body = {
            model,
            max_tokens: 2048,
            system: systemPrompt,
            messages,
            tools: tools.length > 0 ? tools : undefined,
        };

        console.log(`[AiService] callClaude → ${apiUrl} (model: ${model}, msgs: ${messages.length})`);

        // Retry loop for rate limits (429)
        const maxRetries = 3;
        let lastError = '';

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify(body),
            });

            if (resp.ok) {
                const data = await resp.json() as ClaudeResponse;
                console.log(`[AiService] Claude response: stop=${data.stop_reason}, blocks=${data.content.length}, usage=${data.usage.input_tokens}in/${data.usage.output_tokens}out`);
                return data;
            }

            // Rate limit — retry with backoff
            if (resp.status === 429) {
                const waitSec = 10 * Math.pow(2, attempt); // 10s, 20s, 40s
                console.warn(`[AiService] Rate limited (429). Retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxRetries})`);
                progress.onThinking(`Rate limited. Waiting ${waitSec}s before retrying... (${attempt + 1}/${maxRetries})`);
                await sleep(waitSec * 1000);
                continue;
            }

            // Other error — don't retry
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
