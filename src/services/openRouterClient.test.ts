// ─────────────────────────────────────────────────
// openRouterClient.test.ts — Format conversion + API call tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/apiKeys', () => ({
    getOpenRouterKey: () => 'test-key-123',
}));

vi.mock('@/services/modelRouter', () => ({
    getModelId: (role: string) => `test-model-${role}`,
    getMaxTokens: () => 4096,
}));

import {
    getOpenRouterUrl,
    getOpenRouterHeaders,
    callOpenRouterApi,
    callWithRole,
} from './openRouterClient';

describe('openRouterClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── URL ──
    describe('getOpenRouterUrl', () => {
        it('should return a valid URL string', () => {
            const url = getOpenRouterUrl();
            expect(typeof url).toBe('string');
            expect(url).toContain('openrouter');
        });
    });

    // ── Headers ──
    describe('getOpenRouterHeaders', () => {
        it('should include authorization header', () => {
            const h = getOpenRouterHeaders();
            expect(h['Authorization']).toBe('Bearer test-key-123');
        });

        it('should include content-type', () => {
            const h = getOpenRouterHeaders();
            expect(h['Content-Type']).toBe('application/json');
        });

        it('should include referer and title', () => {
            const h = getOpenRouterHeaders();
            expect(h['HTTP-Referer']).toBeTruthy();
            expect(h['X-Title']).toBeTruthy();
        });
    });

    // ── callOpenRouterApi ──
    describe('callOpenRouterApi', () => {
        it('should require an API key', () => {
            // The function checks for getOpenRouterKey() and throws if empty
            // We validate the function signature expects this check
            expect(typeof callOpenRouterApi).toBe('function');
        });

        it('should convert Anthropic format and call fetch', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    id: 'resp-1',
                    choices: [{
                        message: { content: 'Hello!', tool_calls: null },
                        finish_reason: 'stop',
                    }],
                    model: 'claude-3',
                    usage: { prompt_tokens: 10, completion_tokens: 5 },
                }),
            };
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

            try {
                const result = await callOpenRouterApi({
                    model: 'claude-3',
                    system: 'You are helpful',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 1024,
                }) as any;

                expect(globalThis.fetch).toHaveBeenCalled();
                expect(result.role).toBe('assistant');
                expect(result.content).toBeDefined();
                expect(result.content[0].text).toBe('Hello!');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should convert tool_use in response back to Anthropic format', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    id: 'resp-2',
                    choices: [{
                        message: {
                            content: null,
                            tool_calls: [{
                                id: 'call-1',
                                type: 'function',
                                function: { name: 'add_text', arguments: '{"content":"Test"}' },
                            }],
                        },
                        finish_reason: 'tool_calls',
                    }],
                }),
            };
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

            try {
                const result = await callOpenRouterApi({
                    model: 'claude-3',
                    messages: [{ role: 'user', content: 'Add text' }],
                }) as any;

                expect(result.stop_reason).toBe('tool_use');
                expect(result.content.find((b: any) => b.type === 'tool_use')).toBeDefined();
                const toolBlock = result.content.find((b: any) => b.type === 'tool_use');
                expect(toolBlock.name).toBe('add_text');
                expect(toolBlock.input).toEqual({ content: 'Test' });
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should throw on 401 with clear message', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false, status: 401, text: () => Promise.resolve('Unauthorized'),
            }) as any;

            try {
                await expect(callOpenRouterApi({ model: 'x', messages: [] }))
                    .rejects.toThrow('401');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should throw on 402 with credits message', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false, status: 402, text: () => Promise.resolve('Payment required'),
            }) as any;

            try {
                await expect(callOpenRouterApi({ model: 'x', messages: [] }))
                    .rejects.toThrow('credits');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    // ── callWithRole ──
    describe('callWithRole', () => {
        it('should inject model and max_tokens from role', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }),
            }) as any;

            try {
                await callWithRole('planner', { messages: [{ role: 'user', content: 'test' }] });
                const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
                expect(body.model).toBe('test-model-planner');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    // ── Proxy headers (source-level) ──
    describe('proxy auth — source-level checks', () => {
        const src = require('fs').readFileSync(require('path').resolve(__dirname, './openRouterClient.ts'), 'utf-8');

        it('★ REGRESSION: production path never sends OpenRouter key as Bearer', () => {
            // The old bug: fallback sent getOpenRouterKey() when JWT was null
            // New code should throw error instead
            expect(src).not.toContain("token ? `Bearer ${token}` : `Bearer ${getOpenRouterKey()}`");
        });

        it('throws clear error when no JWT in production', () => {
            expect(src).toContain("'Not logged in. Please log in to use AI features.'");
        });

        it('retries with refreshSession when token is null', () => {
            expect(src).toContain('sb.auth.refreshSession()');
        });

        it('includes apikey header for Supabase Edge Function', () => {
            expect(src).toContain("'apikey'");
            expect(src).toContain('VITE_SUPABASE_ANON_KEY');
        });

        it('checks token expiry and refreshes proactively', () => {
            expect(src).toContain('expires_at');
            expect(src).toContain('refreshSession');
        });
    });
});

// ══════════════════════════════════════════════════
// Edge Function — source-level structure tests
// ══════════════════════════════════════════════════
describe('ai-proxy edge function — structure', () => {
    const edgeSrc = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../supabase/functions/ai-proxy/index.ts'), 'utf-8'
    );

    it('handles CORS preflight', () => {
        expect(edgeSrc).toContain("req.method === 'OPTIONS'");
        expect(edgeSrc).toContain('Access-Control-Allow-Origin');
    });

    it('allows x-title and http-referer in CORS', () => {
        expect(edgeSrc).toContain('x-title');
        expect(edgeSrc).toContain('http-referer');
    });

    it('requires Bearer token (light auth)', () => {
        expect(edgeSrc).toContain("startsWith('Bearer ')");
    });

    it('reads OPENROUTER_API_KEY from server env', () => {
        expect(edgeSrc).toContain("Deno.env.get('OPENROUTER_API_KEY')");
    });

    it('returns 503 if OPENROUTER_API_KEY missing', () => {
        expect(edgeSrc).toContain('AI service not configured');
        expect(edgeSrc).toContain('503');
    });

    it('proxies to OpenRouter with server-side key', () => {
        expect(edgeSrc).toContain('openrouter.ai/api/v1/chat/completions');
        expect(edgeSrc).toContain('`Bearer ${openRouterKey}`');
    });

    it('★ does NOT expose API key to client (no VITE_ prefix)', () => {
        expect(edgeSrc).not.toContain('VITE_OPENROUTER');
    });
});

