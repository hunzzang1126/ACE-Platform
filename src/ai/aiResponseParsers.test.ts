// ─────────────────────────────────────────────────
// aiResponseParsers.test.ts — SSE + JSON parser tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { parseNonStreamingResponse } from './aiResponseParsers';

describe('parseNonStreamingResponse', () => {
    it('parses a standard text response', () => {
        const data = {
            id: 'test-123',
            choices: [{ message: { content: 'Hello world', tool_calls: undefined } }],
            usage: { prompt_tokens: 50, completion_tokens: 10 },
        };
        const result = parseNonStreamingResponse(data, 'test-model');
        expect(result).not.toBeNull();
        expect(result!.content).toHaveLength(1);
        expect(result!.content[0]!.type).toBe('text');
        expect(result!.content[0]!.text).toBe('Hello world');
        expect(result!.stop_reason).toBe('end_turn');
        expect(result!.usage.input_tokens).toBe(50);
    });

    it('parses tool_calls into tool_use blocks', () => {
        const data = {
            id: 'test-456',
            choices: [{
                message: {
                    content: null,
                    tool_calls: [{
                        id: 'call_1',
                        type: 'function',
                        function: { name: 'generate_full_design', arguments: '{"prompt":"test banner"}' },
                    }],
                },
            }],
            usage: { prompt_tokens: 100, completion_tokens: 30 },
        };
        const result = parseNonStreamingResponse(data, 'test-model');
        expect(result).not.toBeNull();
        expect(result!.stop_reason).toBe('tool_use');
        const toolBlock = result!.content.find(b => b.type === 'tool_use')!;
        expect(toolBlock.name).toBe('generate_full_design');
        expect(toolBlock.input).toEqual({ prompt: 'test banner' });
    });

    it('returns null for empty choices', () => {
        expect(parseNonStreamingResponse({ choices: [] }, 'model')).toBeNull();
    });

    it('handles malformed tool_call arguments gracefully', () => {
        const data = {
            id: 'test-789',
            choices: [{
                message: {
                    content: 'text before tools',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bad_tool', arguments: 'NOT JSON' } }],
                },
            }],
        };
        const result = parseNonStreamingResponse(data, 'model');
        expect(result).not.toBeNull();
        // Text should still be parsed even if tool args are malformed
        expect(result!.content[0]!.type).toBe('text');
        // Malformed tool should be skipped
        expect(result!.content.filter(b => b.type === 'tool_use')).toHaveLength(0);
    });

    it('combines text content + valid tool calls', () => {
        const data = {
            id: 'combo',
            choices: [{
                message: {
                    content: 'Planning your design...',
                    tool_calls: [
                        { id: 'c1', function: { name: 'add_text', arguments: '{"content":"Hello"}' } },
                        { id: 'c2', function: { name: 'add_button', arguments: '{"text":"Buy"}' } },
                    ],
                },
            }],
            usage: { prompt_tokens: 200, completion_tokens: 50 },
        };
        const result = parseNonStreamingResponse(data, 'model');
        expect(result!.content).toHaveLength(3); // 1 text + 2 tool_use
        expect(result!.stop_reason).toBe('tool_use');
    });
});
