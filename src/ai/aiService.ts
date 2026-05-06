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
import { getCanvasElementCount, getCanvasElementNames, saveInteractionMemory } from './aiServiceHelpers';
import { parseSSEStream, parseNonStreamingResponse } from './aiResponseParsers';

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

        // ★ Refresh AI memory before building context (memory → system prompt)
        try {
            const { refreshMemoryCache } = await import('./smartContextHelpers');
            await refreshMemoryCache();
        } catch { /* non-critical */ }

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
        saveInteractionMemory(userMessage, this.getLastReply()).catch(() => {});
    }

    private async agenticLoop(engine: Engine, systemPrompt: string, enrichedUserMessage: string, progress: LiveProgress, page: import('./contextRouter').PageContext, executorOverride?: ToolExecutorOverride, canvasScreenshot?: string): Promise<void> {
        const messages = this.buildClaudeMessages(enrichedUserMessage, canvasScreenshot);
        const tools = toClaudeTools(getToolsForPage(page));
        let rounds = 0, finished = false;
        const allToolRecords: ToolCallRecord[] = [];
        // ★ Hallucination Guard: track pre-execution element count
        const preElementCount = getCanvasElementCount(engine);
        await nextFrame();

        while (!finished && rounds < this.config.maxToolRounds) {
            rounds++;
            const response = await this.callClaude(systemPrompt, messages, tools, progress, rounds);
            if (!response) { progress.onError('No response from AI'); return; }

            const textBlocks = response.content.filter(b => b.type === 'text');
            const toolBlocks = response.content.filter(b => b.type === 'tool_use');

            if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
                // ★ Planner Phase: Round 1 shows plan preview before execution
                if (rounds === 1 && textBlocks.length > 0) {
                    try {
                        const { extractPlan, formatPlanForDisplay } = await import('./plannerPhase');
                        const planText = textBlocks.map(b => b.text).filter(Boolean).join('\n');
                        const plan = extractPlan(planText, toolBlocks);
                        if (plan.steps.length > 0) {
                            progress.onThinking(planText.slice(0, 120));
                            await sleep(400);
                            progress.onPlan(formatPlanForDisplay(plan));
                            await sleep(800); // Let user read the plan
                        }
                    } catch { /* non-critical */ }
                } else {
                    progress.onPlan(toolBlocks.map(tc => humanizeToolStep(tc.name!, (tc.input ?? {}) as Record<string, unknown>)));
                }
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
                    const NO_RETRY_TOOLS = new Set(['analyze_scene', 'undo_ai_action']);
                    const overrideResult = executorOverride?.(tc.name!, params);
                    let result: ExecutionResult = overrideResult ?? await executeToolCall(engine, tc.name!, params, this.trackedNodes);
                    // ★ Error-aware auto-retry: re-execute once, but narrate the error to the user
                    if (!result.success && !NO_RETRY_TOOLS.has(tc.name!) && !overrideResult) {
                        console.log(`[AI Tool] Retry: ${tc.name} — error: ${result.message.slice(0, 100)}`);
                        progress.onToken(`Retrying ${tc.name}... `);
                        await sleep(300);
                        result = await executeToolCall(engine, tc.name!, params, this.trackedNodes);
                        if (!result.success) {
                            // ★ Error context is passed to AI via tool_result (is_error=true)
                            // The AI sees the error message in the next round and can self-correct
                            progress.onToken(`[${tc.name} failed: ${result.message.slice(0, 60)}] `);
                        }
                    }
                    console.log(`[AI Tool] Result: ${tc.name} → ${result.success ? 'OK' : 'FAIL'} ${result.message?.slice(0, 200)}`);
                    progress.onStepComplete(i, result); await sleep(200);
                    toolResults.push({ type: 'tool_result', tool_use_id: tc.id!, content: JSON.stringify(result), is_error: !result.success });
                    toolRecords.push({ name: tc.name!, input: params, result, durationMs: Date.now() - startTime });

                    // ★ Track AI changes for multi-turn context ("undo that", "do same to X")
                    if (result.success && tc.name !== 'analyze_scene') {
                        try {
                            const { pushAiChange } = await import('./smartContextBuilder');
                            const elementName = typeof params.element_name === 'string' ? params.element_name
                                : typeof params.name === 'string' ? params.name
                                : typeof params.description === 'string' ? params.description.slice(0, 40) : tc.name!;
                            pushAiChange({ tool: tc.name!, elementName, summary: result.message.slice(0, 80), timestamp: Date.now() });
                        } catch { /* non-critical */ }
                    }
                }
                allToolRecords.push(...toolRecords);
                // ★ Post-round verification: summarize success/failure for AI self-correction
                const failedTools = toolRecords.filter(r => !r.result.success);
                if (failedTools.length > 0) {
                    const verifySummary = `[ROUND ${rounds} VERIFICATION] ${toolRecords.length - failedTools.length}/${toolRecords.length} tools succeeded. Failed: ${failedTools.map(f => `${f.name}: ${f.result.message.slice(0, 60)}`).join('; ')}. Fix these issues in the next round.`;
                    // ★ FIX: Append verification to last real tool_result instead of creating
                    // a fake tool_result with id='verify' — OpenRouter rejects tool_call_ids
                    // that don't match any tool_call in the previous assistant message.
                    if (toolResults.length > 0) {
                        const lastResult = toolResults[toolResults.length - 1]!;
                        lastResult.content = `${lastResult.content}\n\n${verifySummary}`;
                        lastResult.is_error = true;
                    }
                    progress.onToken(verifySummary.slice(0, 80) + '... ');
                }

                // ★ Hallucination Guard: verify claimed creations match canvas
                // Append guard message to last tool_result to avoid consecutive user messages.
                try {
                    const { verifyToolResults, buildVerificationMessage } = await import('./hallucinationGuard');
                    const verification = verifyToolResults(
                        toolRecords,
                        () => getCanvasElementCount(engine),
                        () => getCanvasElementNames(engine),
                        preElementCount,
                    );
                    if (!verification.verified) {
                        const guardMsg = buildVerificationMessage(verification);
                        if (guardMsg) {
                            console.warn(`[AI] ${guardMsg}`);
                            progress.onToken(verification.summary.slice(0, 80) + ' ');
                            // ★ FIX: Append to last tool result instead of separate user message
                            // Separate user messages after tool results → OpenRouter 400
                            if (toolResults.length > 0) {
                                const lastResult = toolResults[toolResults.length - 1]!;
                                lastResult.content = `${lastResult.content}\n\n${guardMsg}`;
                            }
                        }
                    }
                } catch { /* non-critical */ }

                messages.push({ role: 'user', content: toolResults });

                const roundText = textBlocks.map(b => b.text).filter(Boolean).join('\n');
                if (roundText) this.context.addMessage({ role: 'assistant', content: roundText, timestamp: Date.now(), toolCalls: toolRecords });
            } else {
                // ★ Vision QA Loop: verify design quality after generation
                if (allToolRecords.length > 0 && rounds < this.config.maxToolRounds) {
                    try {
                        const { shouldRunQA, runVisionQA } = await import('./visionQALoop');
                        if (shouldRunQA(allToolRecords)) {
                            const cs = this._designContext.creativeSet;
                            const master = cs?.variants?.find((v: { id: string }) => v.id === cs.masterVariantId) ?? cs?.variants?.[0];
                            if (master) {
                                progress.onThinking('Verifying design quality...');
                                await sleep(300);
                                const qa = await runVisionQA(master.width, master.height);
                                if (qa.screenshotCaptured && qa.correctionPrompt) {
                                    progress.onToken(`Quality: ${qa.score}/100. Fixing ${qa.issues.length} issues...`);
                                    messages.push({ role: 'assistant', content: response.content });
                                    messages.push({ role: 'user', content: qa.correctionPrompt });
                                    finished = false;
                                    continue; // Run one more correction round
                                } else if (qa.screenshotCaptured && qa.score >= 0) {
                                    progress.onToken(`Design quality: ${qa.score}/100`);
                                }
                            }
                        }
                    } catch { /* non-critical */ }
                }

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
        // ★ Circuit Breaker: block calls when API is consistently failing
        const { getAiCircuitBreaker, getCircuitOpenMessage } = await import('./circuitBreaker');
        const breaker = getAiCircuitBreaker();
        if (!breaker.canCall()) {
            progress.onError(getCircuitOpenMessage());
            return null;
        }

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

        // ★ v715: 3-attempt strategy:
        //   Attempt 0: streaming (fast UX)
        //   Attempt 1: fresh JWT + streaming
        //   Attempt 2: fresh JWT + NON-streaming (fallback for SSE+tools 400 bugs)
        for (let attempt = 0; attempt <= 2; attempt++) {
            const { getProxyHeaders } = await import('@/services/openRouterClient');
            const headers = await getProxyHeaders();

            // ★ v715: On last attempt, disable streaming as fallback
            const useStream = attempt < 2;
            const reqBody = { ...body, stream: useStream };

            const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(reqBody) });
            if (resp.ok) {
                breaker.recordSuccess();
                if (useStream) {
                    return await parseSSEStream(resp, model, progress);
                }
                // ★ Non-streaming fallback: parse JSON response directly
                return parseNonStreamingResponse(await resp.json(), model);
            }
            breaker.recordFailure();

            // ★ v715: Read error body BEFORE retry to log the actual OpenRouter error
            const errorText = await resp.text();
            let errorMessage = `API Error ${resp.status}`;
            try { const errJson = JSON.parse(errorText); errorMessage = errJson?.error?.message || errorMessage; } catch { /* raw text */ }
            console.error(`[AiService] ${resp.status} (attempt ${attempt + 1}/3): ${errorMessage.slice(0, 200)}`);

            if (resp.status === 429 && attempt < 2) { progress.onThinking('Rate limited. Retrying in 10s...'); await sleep(10000); continue; }

            if ((resp.status === 400 || resp.status === 401) && attempt < 2) {
                // ★ v715: Refresh JWT + on attempt 2 will fall back to non-streaming
                try {
                    const { getSupabase } = await import('@/services/supabaseClient');
                    const sb = getSupabase();
                    if (sb) await sb.auth.refreshSession();
                } catch { /* ignore refresh failure */ }
                progress.onThinking(attempt === 0 ? 'Retrying request...' : 'Retrying without streaming...');
                await sleep(1000);
                continue;
            }

            progress.onError(errorMessage);
            return null;
        }
        progress.onError('Request failed after retries. Please try again.');
        return null;
    }

}
