// ─────────────────────────────────────────────────
// openRouterClient.ts — Unified OpenRouter API Client
// ─────────────────────────────────────────────────
// Replaces anthropicClient.ts. Single gateway for:
//   - Claude (Planner/Executor/Critic)
//   - Flux (Image Gen — fast)
//   - Imagen (Image Gen — quality)
//
// OpenRouter uses OpenAI-compatible chat/completions API.
// This converter bridges Anthropic-format callers → OpenAI format.
// ─────────────────────────────────────────────────

import { getOpenRouterKey } from '@/config/apiKeys';
import { getModelId, getMaxTokens, type AceModelRole } from '@/services/modelRouter';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// ── URL ──

export function getOpenRouterUrl(): string {
    const isLocalDev =
        typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isLocalDev
        ? '/api/openrouter/v1/chat/completions'
        : `${OPENROUTER_BASE}/chat/completions`;
}

// ── Headers ──

export function getOpenRouterHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getOpenRouterKey()}`,
        'HTTP-Referer': 'https://ace.design',
        'X-Title': 'ACE Design Engine',
    };
}

// ── Anthropic → OpenRouter Format Converter ──
// Converts Anthropic Messages API format to OpenAI-compatible format
// so existing callers don't need to change their request shape.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = Record<string, any>;

function convertAnthropicToOpenRouter(body: Record<string, unknown>): Record<string, unknown> {
    const messages = (body.messages as AnyBlock[]) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertedMessages: any[] = [];

    // ── System message ──
    if (body.system) {
        convertedMessages.push({ role: 'system', content: body.system as string });
    }

    // ── Messages ──
    for (const msg of messages) {
        if (typeof msg.content === 'string') {
            // Simple text message
            convertedMessages.push({ role: msg.role, content: msg.content });
        } else if (Array.isArray(msg.content)) {
            if (msg.role === 'assistant') {
                // Assistant message may contain tool_use blocks
                const textParts = msg.content.filter((b: AnyBlock) => b.type === 'text');
                const toolParts = msg.content.filter((b: AnyBlock) => b.type === 'tool_use');

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const openAiMsg: any = { role: 'assistant' };
                if (textParts.length > 0) {
                    openAiMsg.content = textParts.map((b: AnyBlock) => b.text).join('\n');
                } else {
                    openAiMsg.content = null;
                }
                if (toolParts.length > 0) {
                    openAiMsg.tool_calls = toolParts.map((tc: AnyBlock) => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.name ?? '',
                            arguments: JSON.stringify(tc.input ?? {}),
                        },
                    }));
                }
                convertedMessages.push(openAiMsg);
            } else if (msg.role === 'user') {
                // User message — may contain text, image, or tool_result blocks
                const hasToolResults = msg.content.some((b: AnyBlock) => b.type === 'tool_result');

                if (hasToolResults) {
                    // tool_result blocks → OpenAI "tool" role messages (one per result)
                    for (const block of msg.content) {
                        if (block.type === 'tool_result') {
                            const resultContent = typeof block.content === 'string'
                                ? block.content
                                : Array.isArray(block.content)
                                    ? block.content.map((c: AnyBlock) => c.text ?? '').join('\n')
                                    : JSON.stringify(block.content ?? '');
                            convertedMessages.push({
                                role: 'tool',
                                tool_call_id: block.tool_use_id,
                                content: resultContent,
                            });
                        }
                    }
                } else {
                    // Regular user message — convert text + image blocks
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const parts: any[] = [];
                    for (const block of msg.content) {
                        if (block.type === 'text') {
                            parts.push({ type: 'text', text: block.text });
                        } else if (block.type === 'image') {
                            // Anthropic: { source: { type: 'base64', media_type, data } }
                            const source = block.source as { media_type: string; data: string } | undefined;
                            if (source) {
                                parts.push({
                                    type: 'image_url',
                                    image_url: { url: `data:${source.media_type};base64,${source.data}` },
                                });
                            }
                        }
                    }
                    convertedMessages.push({ role: 'user', content: parts });
                }
            }
        }
    }

    const result: Record<string, unknown> = {
        model: body.model as string,
        messages: convertedMessages,
        max_tokens: body.max_tokens ?? 4096,
    };

    // ── Tools: Anthropic input_schema → OpenAI parameters format ──
    if (body.tools && Array.isArray(body.tools)) {
        result.tools = (body.tools as AnyBlock[]).map(t => ({
            type: 'function',
            function: {
                name: t.name ?? '',
                description: t.description ?? '',
                // Anthropic uses 'input_schema', OpenAI uses 'parameters'
                parameters: t.input_schema ?? t.parameters ?? { type: 'object', properties: {} },
            },
        }));
    }

    // ── tool_choice: Anthropic → OpenAI format ──
    if (body.tool_choice) {
        const tc = body.tool_choice as AnyBlock;
        if (tc.type === 'tool' && tc.name) {
            // Anthropic: { type: 'tool', name: 'render_banner' }
            // OpenAI:    { type: 'function', function: { name: 'render_banner' } }
            result.tool_choice = { type: 'function', function: { name: tc.name } };
        } else if (tc.type === 'auto' || tc === 'auto') {
            result.tool_choice = 'auto';
        } else if (tc.type === 'none' || tc === 'none') {
            result.tool_choice = 'none';
        } else if (tc.type === 'any') {
            // Anthropic 'any' → OpenAI 'required'
            result.tool_choice = 'required';
        }
    }

    return result;
}

// ── Response Converter ──
// Convert OpenRouter (OpenAI format) response back to Anthropic format
// so existing callers don't break.

function convertResponseToAnthropic(data: Record<string, unknown>): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const choices = (data.choices as any[]) ?? [];
    const firstChoice = choices[0];
    if (!firstChoice) return { content: [] };

    const message = firstChoice.message ?? {};
    const content: Array<Record<string, unknown>> = [];

    // Text content
    if (message.content) {
        content.push({ type: 'text', text: message.content });
    }

    // Tool calls (convert OpenAI → Anthropic format)
    if (message.tool_calls) {
        for (const tc of message.tool_calls) {
            content.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.function?.name ?? '',
                input: JSON.parse(tc.function?.arguments ?? '{}'),
            });
        }
    }

    // Determine stop reason
    const finishReason = firstChoice.finish_reason;
    let stopReason = 'end_turn';
    if (finishReason === 'tool_calls' || message.tool_calls?.length > 0) {
        stopReason = 'tool_use';
    } else if (finishReason === 'length') {
        stopReason = 'max_tokens';
    }

    return {
        id: data.id,
        type: 'message',
        role: 'assistant',
        content,
        model: data.model,
        stop_reason: stopReason,
        usage: data.usage,
    };
}

// ── Main API Call ──

/**
 * Call OpenRouter API with Anthropic-compatible request format.
 * Automatically converts request/response formats.
 * Drop-in replacement for callAnthropicApi().
 */
export async function callOpenRouterApi(
    body: Record<string, unknown>,
    signal?: AbortSignal,
): Promise<unknown> {
    const key = getOpenRouterKey();
    if (!key) {
        throw new Error('OpenRouter API key is not configured. Set VITE_OPENROUTER_API_KEY in .env');
    }

    const converted = convertAnthropicToOpenRouter(body);
    const url = getOpenRouterUrl();

    console.log(`[OpenRouter] → ${url} model=${converted.model}, tools=${(converted.tools as unknown[])?.length ?? 0}`);

    const res = await fetch(url, {
        method: 'POST',
        headers: getOpenRouterHeaders(),
        body: JSON.stringify(converted),
        signal,
    });

    if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401) {
            throw new Error('OpenRouter API key invalid (401). Check VITE_OPENROUTER_API_KEY.');
        }
        if (res.status === 402) {
            throw new Error('OpenRouter: Insufficient credits. Add credits at openrouter.ai.');
        }
        throw new Error(`OpenRouter API error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const responseData = await res.json() as Record<string, unknown>;
    return convertResponseToAnthropic(responseData);
}

// ── Convenience: Role-Based Call ──

/**
 * Call API with automatic model selection based on role.
 * Uses modelRouter to pick the right model.
 */
export async function callWithRole(
    role: AceModelRole,
    body: Omit<Record<string, unknown>, 'model' | 'max_tokens'> & { max_tokens?: number },
    signal?: AbortSignal,
): Promise<unknown> {
    return callOpenRouterApi(
        {
            ...body,
            model: getModelId(role),
            max_tokens: body.max_tokens ?? getMaxTokens(role),
        },
        signal,
    );
}

// ── Legacy Compatibility ──

/** @deprecated Use callOpenRouterApi() or callWithRole() instead */
export const callAnthropicApi = callOpenRouterApi;
export const DEFAULT_CLAUDE_MODEL = 'anthropic/claude-sonnet-4';
