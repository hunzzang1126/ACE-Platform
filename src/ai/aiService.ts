// ─────────────────────────────────────────────────
// AI Service — Agentic Loop with Live Progress
// ─────────────────────────────────────────────────
// Client-side LLM integration with:
// - Streaming response display
// - 4-phase agentic loop (think → plan → execute → reflect)
// ─────────────────────────────────────────────────

import { AgentContext, type AgentMessage, type AgentPhase, type ToolCallRecord, type SceneNodeInfo } from './agentContext';
import { getToolsForApi } from './agentTools';
import { executeToolCall, type ExecutionResult } from './commandExecutor';
import { DASHBOARD_TOOL_NAMES } from './dashboardTools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

// ── Config ───────────────────────────────────────

export interface AiConfig {
    apiKey: string;
    endpoint: string;       // e.g. "https://api.openai.com/v1"
    model: string;           // e.g. "gpt-4o"
    maxToolRounds: number;   // max tool-use iterations (default 10)
}

const DEFAULT_CONFIG: AiConfig = {
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    maxToolRounds: 10,
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
    /** Called when scanning the canvas state */
    onCanvasScan: (summary: string) => void;
    /** Called when AI starts thinking */
    onThinking: (content: string) => void;
    /** Called when AI generates a plan */
    onPlan: (steps: string[]) => void;
    /** Called before each tool execution */
    onStepStart: (stepIndex: number, toolName: string, params: Record<string, unknown>) => void;
    /** Called after each tool execution */
    onStepComplete: (stepIndex: number, result: ExecutionResult) => void;
    /** Called during reflection phase */
    onReflection: (content: string) => void;
    /** Called when streaming text tokens arrive */
    onToken: (token: string) => void;
    /** Called when the full response is complete */
    onComplete: (message: AgentMessage) => void;
    /** Called on error */
    onError: (error: string) => void;
}

/**
 * Override executor for specific tool sets (e.g. dashboard tools).
 * Return ExecutionResult if handled, or null to fall through to default executor.
 */
export type ToolExecutorOverride = (toolName: string, params: Record<string, unknown>) => ExecutionResult | null;

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

    /** Get the latest assistant reply from context history. */
    getLastReply(): string {
        const msgs = this.context.getHistory();
        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (m?.role === 'assistant') return m.content;
        }
        return '';
    }

    /**
     * Main chat method — runs the full agentic loop.
     * @param executorOverride Optional function to handle specific tools (e.g. dashboard tools)
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

        // Phase 0: Canvas scan — only if engine is available
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

        // Build system prompt with scene RAG
        const systemPrompt = AgentContext.buildSystemPrompt(engine, this.trackedNodes);

        // Phase 1: Thinking
        progress.onThinking(`Reading your request and preparing the AI model...\nUsing: ${this.config.model}`);
        await nextFrame();

        try {
            await this.agenticLoop(engine, systemPrompt, progress, executorOverride);
        } catch (err) {
            progress.onError(`AI Error: ${err}`);
        }
    }

    /**
     * The core agentic loop — handles multi-round tool calling.
     * Uses nextFrame() between phases so React renders each transition.
     */
    private async agenticLoop(
        engine: Engine,
        systemPrompt: string,
        progress: LiveProgress,
        executorOverride?: ToolExecutorOverride,
    ): Promise<void> {
        const messages = this.buildApiMessages(systemPrompt);
        const tools = getToolsForApi();

        let rounds = 0;
        let finished = false;

        // Let React render the "Thinking" phase
        await nextFrame();

        while (!finished && rounds < this.config.maxToolRounds) {
            rounds++;

            // Call LLM API (this blocks while waiting for the response)
            const response = await this.callLlm(messages, tools, progress);

            if (!response) {
                progress.onError('No response from AI');
                return;
            }

            // Check for tool calls
            const toolCalls = response.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
                // Phase 2: Planning — show the plan
                const planSteps = toolCalls.map(
                    (tc: ToolCallResponse) => `${tc.function.name}(${truncateArgs(tc.function.arguments)})`
                );
                progress.onPlan(planSteps);
                await sleep(800); // Let user read the plan

                // Phase 3: Executing — step by step with visible progress
                const toolResults: ToolCallRecord[] = [];
                for (let i = 0; i < toolCalls.length; i++) {
                    const tc = toolCalls[i] as ToolCallResponse;
                    const params = JSON.parse(tc.function.arguments) as Record<string, unknown>;

                    progress.onStepStart(i, tc.function.name, params);
                    await nextFrame(); // Show "running" state

                    const startTime = Date.now();

                    // Route tool execution: override first, then dashboard, then canvas
                    let result: ExecutionResult;
                    const overrideResult = executorOverride?.(tc.function.name, params);
                    if (overrideResult) {
                        result = overrideResult;
                    } else if (DASHBOARD_TOOL_NAMES.has(tc.function.name)) {
                        // Skip — dashboard tools handled by override, but if no override, return error
                        result = { success: false, message: `Dashboard tool "${tc.function.name}" not available in this context.` };
                    } else if (engine) {
                        result = executeToolCall(engine, tc.function.name, params, this.trackedNodes);
                    } else {
                        result = { success: false, message: `Canvas engine not available. Navigate to the editor first.` };
                    }
                    const durationMs = Date.now() - startTime;

                    progress.onStepComplete(i, result);
                    await sleep(400); // Show "done" state for each step

                    toolResults.push({
                        name: tc.function.name,
                        input: params,
                        result,
                        durationMs,
                    });

                    // Add tool result to messages for the next round
                    messages.push({
                        role: 'assistant',
                        content: null,
                        tool_calls: [tc],
                    });
                    messages.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: JSON.stringify(result),
                    });
                }

                // Store tool calls with the assistant message
                if (response.content) {
                    const assistantMsg: AgentMessage = {
                        role: 'assistant',
                        content: response.content,
                        timestamp: Date.now(),
                        toolCalls: toolResults,
                    };
                    this.context.addMessage(assistantMsg);
                }
            } else {
                // No tool calls — final text response
                finished = true;

                const content = response.content ?? '';

                // Phase 4: Reflection — stream text with visible typing
                progress.onReflection(content);
                await sleep(500); // Show reflection before completing

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
     * Build the API messages array from conversation history.
     */
    private buildApiMessages(systemPrompt: string): ApiMessage[] {
        const messages: ApiMessage[] = [
            { role: 'system', content: systemPrompt },
        ];

        // Add recent conversation history
        const recent = this.context.getRecentMessages(10);
        for (const msg of recent) {
            messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }

        return messages;
    }

    /**
     * Call the LLM API (OpenAI-compatible).
     */
    private async callLlm(
        messages: ApiMessage[],
        tools: ReturnType<typeof getToolsForApi>,
        progress: LiveProgress,
    ): Promise<LlmResponse | null> {
        const { apiKey, endpoint, model } = this.config;

        const body = {
            model,
            messages,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: 'auto',
            stream: false, // Streaming handled via onToken for text
        };

        // Use Vite dev proxy to bypass CORS when running on localhost
        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        let apiUrl: string;
        if (isLocalDev && endpoint.includes('api.openai.com')) {
            // Route through Vite proxy: /api/openai/v1/chat/completions
            apiUrl = `/api/openai/v1/chat/completions`;
        } else {
            apiUrl = `${endpoint}/chat/completions`;
        }

        console.log(`[AiService] callLlm → ${apiUrl} (model: ${model})`);

        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            // Parse OpenAI error format for a readable message
            let errorMsg = `API Error ${resp.status}`;
            try {
                const errJson = JSON.parse(errorText);
                errorMsg = errJson?.error?.message || errorMsg + ': ' + errorText.substring(0, 200);
            } catch {
                errorMsg += ': ' + errorText.substring(0, 200);
            }
            console.error(`[AiService] ${errorMsg}`);
            progress.onError(errorMsg);
            return null;
        }

        const data = await resp.json();
        const choice = data.choices?.[0];
        if (!choice) return null;

        const message = choice.message;

        // Stream text content character by character for live display
        if (message.content) {
            for (const char of message.content) {
                progress.onToken(char);
                // Small delay for streaming effect
                await sleep(8);
            }
        }

        return {
            content: message.content ?? null,
            tool_calls: message.tool_calls ?? null,
        };
    }
}

// ── Types ────────────────────────────────────────

interface ApiMessage {
    role: string;
    content: string | null;
    tool_calls?: ToolCallResponse[];
    tool_call_id?: string;
}

interface ToolCallResponse {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

interface LlmResponse {
    content: string | null;
    tool_calls: ToolCallResponse[] | null;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wait for the next animation frame + microtask so React can paint */
function nextFrame(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 16));
    });
}

/** Truncate tool arguments for readable plan display */
function truncateArgs(argsJson: string): string {
    try {
        const obj = JSON.parse(argsJson);
        const short = JSON.stringify(obj);
        return short.length > 60 ? short.slice(0, 57) + '...' : short;
    } catch {
        return argsJson.length > 60 ? argsJson.slice(0, 57) + '...' : argsJson;
    }
}

