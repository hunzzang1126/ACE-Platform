// ─────────────────────────────────────────────────
// aiResponseParsers.ts — SSE + JSON response parsers
// ─────────────────────────────────────────────────
// Extracted from aiService.ts to stay under 400 lines.
// Converts OpenRouter (OpenAI-format) responses → ClaudeResponse.
// ─────────────────────────────────────────────────

import type { ClaudeContentBlock, ClaudeResponse, LiveProgress } from './aiServiceTypes';

/**
 * Parse an SSE (Server-Sent Events) streaming response from OpenRouter.
 * Accumulates text tokens + tool calls from streamed deltas.
 */
export async function parseSSEStream(
    resp: Response, model: string, progress: LiveProgress,
): Promise<ClaudeResponse | null> {
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    for (const [, tc] of toolCallMap) {
        try { content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: JSON.parse(tc.args || '{}') }); } catch { /* */ }
    }

    return {
        id: responseId, type: 'message', role: 'assistant', content, model,
        stop_reason: (toolCallMap.size > 0 ? 'tool_use' : 'end_turn') as ClaudeResponse['stop_reason'],
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    };
}

/**
 * ★ v715: Parse a non-streaming JSON response from OpenRouter.
 * Used as fallback when streaming + tools triggers 400 errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseNonStreamingResponse(data: any, model: string): ClaudeResponse | null {
    const choices = data?.choices ?? [];
    const first = choices[0];
    if (!first) return null;

    const message = first.message ?? {};
    const content: ClaudeContentBlock[] = [];

    if (message.content) {
        content.push({ type: 'text', text: message.content });
    }

    if (message.tool_calls) {
        for (const tc of message.tool_calls) {
            try {
                content.push({
                    type: 'tool_use',
                    id: tc.id,
                    name: tc.function?.name ?? '',
                    input: JSON.parse(tc.function?.arguments ?? '{}'),
                });
            } catch { /* skip malformed tool call */ }
        }
    }

    const stopReason = message.tool_calls?.length > 0 ? 'tool_use' : 'end_turn';
    return {
        id: data.id ?? '',
        type: 'message', role: 'assistant', content, model,
        stop_reason: stopReason as ClaudeResponse['stop_reason'],
        usage: { input_tokens: data.usage?.prompt_tokens ?? 0, output_tokens: data.usage?.completion_tokens ?? 0 },
    };
}
