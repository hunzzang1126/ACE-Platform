// ─────────────────────────────────────────────────
// AI Service v2 — Eval-First Agentic Loop
// ─────────────────────────────────────────────────
// Types + Config + Helpers → aiServiceTypes.ts
// ─────────────────────────────────────────────────

import { AgentContext, type AgentMessage, type ToolCallRecord, type SceneNodeInfo } from './agentContext';
import { getToolsForPage } from './agentTools';
import { toClaudeTools } from './aceToolDef';
import { executeToolCall, type ExecutionResult } from './commandExecutor';
import { buildContext, buildContextSystemPrompt, enrichMessageWithContext } from './contextRouter';
import { isAiAvailable } from '@/config/apiKeys';
import { getOpenRouterUrl } from '@/services/openRouterClient';
import type { AiConfig, LiveProgress, ToolExecutorOverride, ClaudeContentBlock, ClaudeMessage, ClaudeResponse } from './aiServiceTypes';
import { loadConfig, saveConfig, sleep, nextFrame, humanizeToolStep } from './aiServiceTypes';

// Re-export for backward compat
export type { AiConfig, LiveProgress, ToolExecutorOverride };
export { loadConfig, saveConfig };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

export class AiService {
    private context: AgentContext;
    private config: AiConfig;
    private trackedNodes: SceneNodeInfo[];

    constructor(trackedNodes: SceneNodeInfo[]) {
        this.context = new AgentContext();
        this.config = loadConfig();
        this.trackedNodes = trackedNodes;
    }

    getContext(): AgentContext { return this.context; }
    updateConfig(config: Partial<AiConfig>): void { this.config = { ...this.config, ...config }; saveConfig(this.config); }
    getConfig(): AiConfig { return { ...this.config }; }
    isConfigured(): boolean { return isAiAvailable(); }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _designContext: { creativeSet: any | null; masterVariantId?: string } = { creativeSet: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDesignContext(creativeSet: any | null, masterVariantId?: string): void { this._designContext = { creativeSet, masterVariantId }; }
    getDesignContext() { return this._designContext; }

    getLastReply(): string {
        const msgs = this.context.getHistory();
        for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i]?.role === 'assistant') return msgs[i]!.content; }
        return '';
    }

    async chat(userMessage: string, engine: Engine, progress: LiveProgress, executorOverride?: ToolExecutorOverride): Promise<void> {
        if (!isAiAvailable()) { progress.onError('AI is not available. Check your configuration.'); return; }
        this.context.addMessage({ role: 'user', content: userMessage, timestamp: Date.now() });

        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
        const ctx = buildContext(pathname);
        const systemPrompt = buildContextSystemPrompt(ctx);
        const enrichedMessage = enrichMessageWithContext(userMessage, ctx);

        // ★ P2-11: Save undo snapshot before AI modifies anything
        if (ctx.page === 'canvas-editor') {
            try {
                const { pushSnapshot } = await import('./aiUndoStack');
                pushSnapshot(`Before: "${userMessage.slice(0, 50)}"`);
            } catch { /* non-critical */ }
        }

        const scanSummary = ctx.elementCount > 0 ? `${ctx.pageLabel}: ${ctx.elementCount} elements on ${ctx.canvasSize?.w}x${ctx.canvasSize?.h}px canvas` : `${ctx.pageLabel}: empty canvas`;
        progress.onCanvasScan(scanSummary);
        await nextFrame(); await sleep(300);
        progress.onThinking('Analyzing your request...');
        await nextFrame();

        try { await this.agenticLoop(engine, systemPrompt, enrichedMessage, progress, ctx.page, executorOverride, ctx.canvasScreenshot); }
        catch (err) { progress.onError(`AI Error: ${err}`); }
        this.saveInteractionMemory(userMessage).catch(() => {});
    }

    private async agenticLoop(engine: Engine, systemPrompt: string, enrichedUserMessage: string, progress: LiveProgress, page: import('./contextRouter').PageContext, executorOverride?: ToolExecutorOverride, canvasScreenshot?: string): Promise<void> {
        const messages = this.buildClaudeMessages(enrichedUserMessage, canvasScreenshot);
        const tools = toClaudeTools(getToolsForPage(page));
        let rounds = 0, finished = false;
        const allToolRecords: ToolCallRecord[] = [];
        await nextFrame();

        while (!finished && rounds < this.config.maxToolRounds) {
            rounds++;
            const response = await this.callClaude(systemPrompt, messages, tools, progress, rounds);
            if (!response) { progress.onError('No response from AI'); return; }

            const textBlocks = response.content.filter(b => b.type === 'text');
            const toolBlocks = response.content.filter(b => b.type === 'tool_use');

            if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
                progress.onPlan(toolBlocks.map(tc => humanizeToolStep(tc.name!, (tc.input ?? {}) as Record<string, unknown>)));
                await sleep(400);
                messages.push({ role: 'assistant', content: response.content });

                const toolResults: ClaudeContentBlock[] = [];
                const toolRecords: ToolCallRecord[] = [];
                for (let i = 0; i < toolBlocks.length; i++) {
                    const tc = toolBlocks[i]!;
                    const params = (tc.input ?? {}) as Record<string, unknown>;
                    console.log(`[AI Tool] Calling: ${tc.name}`, JSON.stringify(params).slice(0, 300));
                    progress.onStepStart(i, tc.name!, params); await nextFrame();
                    const startTime = Date.now();
                    const overrideResult = executorOverride?.(tc.name!, params);
                    const result: ExecutionResult = overrideResult ?? await executeToolCall(engine, tc.name!, params, this.trackedNodes);
                    console.log(`[AI Tool] Result: ${tc.name} → ${result.success ? '✅' : '❌'} ${result.message?.slice(0, 200)}`);
                    progress.onStepComplete(i, result); await sleep(200);
                    toolResults.push({ type: 'tool_result', tool_use_id: tc.id!, content: JSON.stringify(result), is_error: !result.success });
                    toolRecords.push({ name: tc.name!, input: params, result, durationMs: Date.now() - startTime });
                }
                allToolRecords.push(...toolRecords);
                messages.push({ role: 'user', content: toolResults });
                const roundText = textBlocks.map(b => b.text).filter(Boolean).join('\n');
                if (roundText) this.context.addMessage({ role: 'assistant', content: roundText, timestamp: Date.now(), toolCalls: toolRecords });
            } else {
                finished = true;
                const content = textBlocks.map(b => b.text).filter(Boolean).join('\n');
                progress.onReflection(content); await sleep(300);
                const assistantMsg: AgentMessage = { role: 'assistant', content, timestamp: Date.now(), toolCalls: allToolRecords.length > 0 ? allToolRecords : undefined };
                this.context.addMessage(assistantMsg);
                progress.onComplete(assistantMsg);
            }
        }
        if (rounds >= this.config.maxToolRounds && !finished) progress.onError(`Reached maximum tool rounds (${this.config.maxToolRounds}).`);
    }

    private buildClaudeMessages(currentMessage?: string, canvasScreenshot?: string): ClaudeMessage[] {
        const messages: ClaudeMessage[] = [];
        const all = this.context.getHistory().filter(m => m.role === 'user' || m.role === 'assistant');
        const RECENT_WINDOW = 10;
        if (all.length > RECENT_WINDOW) {
            const older = all.slice(0, all.length - RECENT_WINDOW);
            const summaryLines = older.map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content.replace(/\n+/g, ' ').slice(0, 80)}`);
            messages.push({ role: 'user', content: `[HISTORY — ${older.length} earlier messages]\n${summaryLines.join('\n')}\n[END]` });
            messages.push({ role: 'assistant', content: 'Understood.' });
        }
        for (const msg of all.slice(-RECENT_WINDOW)) messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        if (currentMessage && messages.length > 0 && messages[messages.length - 1]!.role === 'user') {
            // ★ P1-7: If canvas screenshot available, send as multimodal (image + text)
            if (canvasScreenshot) {
                messages[messages.length - 1]!.content = [
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${canvasScreenshot}`, detail: 'low' } },
                    { type: 'text', text: `[Current canvas screenshot attached above]\n\n${currentMessage}` },
                ] as any;
                console.info('[AiService] ★ Vision context: canvas screenshot injected into user message');
            } else {
                messages[messages.length - 1]!.content = currentMessage;
            }
        }
        return messages;
    }

    private async callClaude(systemPrompt: string, messages: ClaudeMessage[], tools: ReturnType<typeof toClaudeTools>, progress: LiveProgress, round = 1): Promise<ClaudeResponse | null> {
        const { useAuthStore } = await import('@/stores/authStore');
        const { PLAN_LIMITS } = await import('@/schema/planTypes');
        const { getModelForRole } = await import('@/services/modelRouter');
        const userPlan = useAuthStore.getState().user?.plan ?? 'starter';
        const planDefaults = PLAN_LIMITS[userPlan];

        // ★ 3-tier model routing: Round 1 = planner (reasoning), Round 2+ = executor (cheap)
        const role = round <= 1 ? 'planner' : 'executor';
        const routedModel = getModelForRole(role);
        let model = this.config.model || planDefaults?.defaultModel || routedModel.id;

        // If user has a specific model set AND it matches planner, downgrade on round 2+
        if (round > 1 && model === getModelForRole('planner').id) {
            model = routedModel.id; // Switch to Haiku for execution rounds
        }

        const requestedModel = model;
        if (planDefaults?.allowedModels && !planDefaults.allowedModels.includes(model)) { model = planDefaults.defaultModel; }
        console.info(`[AiService] Model routing: round=${round} role="${role}" model="${model}" | plan="${userPlan}"`);

        // ★ Use the unified proxy URL — never send API key directly from client
        const apiUrl = getOpenRouterUrl();

        const openAiMessages: Array<Record<string, unknown>> = [];
        if (systemPrompt) openAiMessages.push({ role: 'system', content: systemPrompt });
        for (const msg of messages) {
            if (typeof msg.content === 'string') { openAiMessages.push({ role: msg.role, content: msg.content }); }
            else if (Array.isArray(msg.content)) {
                if (msg.role === 'user') {
                    const toolResults = msg.content.filter((b: ClaudeContentBlock) => b.type === 'tool_result');
                    if (toolResults.length > 0) { for (const tr of toolResults) openAiMessages.push({ role: 'tool', tool_call_id: tr.tool_use_id, content: tr.content ?? '' }); }
                    else openAiMessages.push({ role: msg.role, content: msg.content });
                } else {
                    const textParts = msg.content.filter((b: ClaudeContentBlock) => b.type === 'text');
                    const toolParts = msg.content.filter((b: ClaudeContentBlock) => b.type === 'tool_use');
                    const oMsg: Record<string, unknown> = { role: 'assistant', content: textParts.length > 0 ? textParts.map((b: ClaudeContentBlock) => b.text).join('\n') : null };
                    if (toolParts.length > 0) oMsg.tool_calls = toolParts.map((tc: ClaudeContentBlock) => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.input ?? {}) } }));
                    openAiMessages.push(oMsg);
                }
            }
        }

        const openAiTools = tools.length > 0 ? tools.map(t => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.input_schema } })) : undefined;
        const body: Record<string, unknown> = { model, max_tokens: routedModel.maxTokens || 4096, messages: openAiMessages, tools: openAiTools, stream: true };

        // ★ Import getProxyHeaders dynamically to get JWT in production / direct key in dev
        for (let attempt = 0; attempt <= 2; attempt++) {
            const { getProxyHeaders } = await import('@/services/openRouterClient');
            const headers = await getProxyHeaders();
            const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(body) });
            if (resp.ok) return await this.parseSSEStream(resp, model, progress);
            if (resp.status === 429 && attempt < 2) { progress.onThinking('Rate limited. Retrying in 10s...'); await sleep(10000); continue; }
            // ★ Retry on 400/401 with fresh JWT — expired tokens or stale requests
            if ((resp.status === 400 || resp.status === 401) && attempt < 2) {
                console.warn(`[AiService] ${resp.status} from API — refreshing session and retrying (attempt ${attempt + 1})`);
                try {
                    const { getSupabase } = await import('@/services/supabaseClient');
                    const sb = getSupabase();
                    if (sb) await sb.auth.refreshSession();
                } catch { /* ignore refresh failure */ }
                progress.onThinking('Retrying request...');
                await sleep(1000);
                continue;
            }
            const errorText = await resp.text();
            console.error(`[AiService] API Error ${resp.status}:`, errorText.slice(0, 300));
            try { const errJson = JSON.parse(errorText); progress.onError(errJson?.error?.message || `API Error ${resp.status}`); } catch { progress.onError(`API Error ${resp.status}: ${errorText.substring(0, 200)}`); }
            return null;
        }
        progress.onError('Request failed after retries. Please try again.');
        return null;
    }

    private async parseSSEStream(resp: Response, model: string, progress: LiveProgress): Promise<ClaudeResponse | null> {
        const reader = resp.body?.getReader();
        if (!reader) { progress.onError('Streaming not supported'); return null; }
        const decoder = new TextDecoder();
        let sseBuffer = '', fullText = '', responseId = '', inputTokens = 0, outputTokens = 0;
        const toolCallMap = new Map<number, { id: string; name: string; args: string }>();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split('\n');
                sseBuffer = lines.pop() ?? '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
                    try {
                        const chunk = JSON.parse(trimmed.slice(6)) as any;
                        if (chunk.id) responseId = chunk.id;
                        if (chunk.usage) { inputTokens = chunk.usage.prompt_tokens ?? inputTokens; outputTokens = chunk.usage.completion_tokens ?? outputTokens; }
                        const delta = chunk.choices?.[0]?.delta;
                        if (!delta) continue;
                        if (delta.content) { fullText += delta.content; progress.onToken(delta.content); }
                        if (delta.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                const idx = tc.index ?? 0;
                                if (!toolCallMap.has(idx)) toolCallMap.set(idx, { id: tc.id ?? '', name: '', args: '' });
                                const entry = toolCallMap.get(idx)!;
                                if (tc.id) entry.id = tc.id;
                                if (tc.function?.name) entry.name += tc.function.name;
                                if (tc.function?.arguments) entry.args += tc.function.arguments;
                            }
                        }
                    } catch { /* skip malformed SSE chunks */ }
                }
            }
        } finally { reader.releaseLock(); }

        const content: ClaudeContentBlock[] = [];
        if (fullText) content.push({ type: 'text', text: fullText });
        for (const [, tc] of toolCallMap) { try { content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: JSON.parse(tc.args || '{}') }); } catch { /* */ } }

        return { id: responseId, type: 'message', role: 'assistant', content, model, stop_reason: (toolCallMap.size > 0 ? 'tool_use' : 'end_turn') as ClaudeResponse['stop_reason'], usage: { input_tokens: inputTokens, output_tokens: outputTokens } };
    }

    private async saveInteractionMemory(userMessage: string): Promise<void> {
        try {
            const { saveAiMemory, extractFacts } = await import('@/services/aiMemoryService');
            const facts = extractFacts(userMessage, this.getLastReply());
            if (Object.keys(facts).length > 0) {
                await saveAiMemory(facts);
                console.info('[AiMemory] Chat facts saved:', Object.keys(facts));
            } else {
                console.info('[AiMemory] No extractable facts from this message');
            }
        } catch (err) {
            console.warn('[AiMemory] Chat memory save failed:', err);
        }
    }
}
