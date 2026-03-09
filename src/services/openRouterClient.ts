// ─────────────────────────────────────────────────
// openRouterClient.ts — Unified OpenRouter API Client
// ─────────────────────────────────────────────────
// Replaces anthropicClient.ts. Single gateway for:
//   - Claude (Planner/Executor/Critic)
//   - Flux (Image Gen — fast)
//   - Nano Banana / Imagen (Image Gen — quality)
//
// OpenRouter uses OpenAI-compatible chat/completions API.
// All existing Claude features (tool_use, vision) work.
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

interface AnthropicMessage {
    role: string;
    content: string | Array<{ type: string; text?: string; source?: unknown }>;
}

interface OpenRouterMessage {
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

function convertAnthropicToOpenRouter(body: Record<string, unknown>): Record<string, unknown> {
    const messages = (body.messages as AnthropicMessage[]) ?? [];
    const convertedMessages: OpenRouterMessage[] = [];

    // Add system message if present
    if (body.system) {
        convertedMessages.push({ role: 'system', content: body.system as string });
    }

    // Convert messages
    for (const msg of messages) {
        if (typeof msg.content === 'string') {
            convertedMessages.push({ role: msg.role, content: msg.content });
        } else if (Array.isArray(msg.content)) {
            // Convert Anthropic content blocks to OpenAI format
            const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
            for (const block of msg.content) {
                if (block.type === 'text') {
                    parts.push({ type: 'text', text: block.text });
                } else if (block.type === 'image') {
                    // Anthropic: { type: 'image', source: { type: 'base64', media_type, data } }
                    const source = block.source as { type: string; media_type: string; data: string } | undefined;
                    if (source) {
                        parts.push({
                            type: 'image_url',
                            image_url: { url: `data:${source.media_type};base64,${source.data}` },
                        });
                    }
                }
            }
            convertedMessages.push({ role: msg.role, content: parts });
        }
    }

    const result: Record<string, unknown> = {
        model: body.model as string,
        messages: convertedMessages,
        max_tokens: body.max_tokens ?? 4096,
    };

    // Forward tools if present (OpenRouter supports OpenAI tool format)
    if (body.tools) {
        result.tools = body.tools;
    }
    if (body.tool_choice) {
        result.tool_choice = body.tool_choice;
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
                name: tc.function?.name,
                input: JSON.parse(tc.function?.arguments ?? '{}'),
            });
        }
    }

    return {
        id: data.id,
        type: 'message',
        role: 'assistant',
        content,
        model: data.model,
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
        throw new Error(`OpenRouter API error (${res.status}): ${errText.slice(0, 200)}`);
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
export const DEFAULT_CLAUDE_MODEL = 'anthropic/claude-sonnet-4-20250514';
