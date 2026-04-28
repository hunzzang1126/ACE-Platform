// ─────────────────────────────────────────────────
// imageGenClient.test.ts — Image generation service tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/apiKeys', () => ({
    getOpenRouterKey: vi.fn().mockReturnValue('test-key'),
    isAiAvailable: vi.fn().mockReturnValue(true),
    isProxyMode: vi.fn().mockReturnValue(false),
}));

vi.mock('@/services/openRouterClient', () => ({
    getOpenRouterUrl: () => 'https://openrouter.ai/api/v1/chat/completions',
    getOpenRouterHeaders: () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer test-key' }),
    getProxyHeaders: () => Promise.resolve({ 'Content-Type': 'application/json', 'Authorization': 'Bearer test-key' }),
}));

vi.mock('@/services/modelRouter', () => ({
    getModelId: (role: string) => `test-${role}-model`,
}));

vi.mock('./imageGenHelpers', () => ({
    extractImageUrl: vi.fn().mockReturnValue('data:image/png;base64,abc'),
    resizeImageToTarget: vi.fn().mockImplementation((url: string) => Promise.resolve(url)),
    generateFallbackImage: vi.fn().mockImplementation((req: any) => ({
        success: true, imageUrl: 'data:image/png;base64,fallback', model: 'fallback' as const,
        isFallback: true, message: `Gradient fallback ${req.width}x${req.height}`,
    })),
    buildEnhancedPrompt: vi.fn().mockImplementation((req: any) => req.prompt),
    snapToFluxResolution: vi.fn().mockImplementation((w: number, h: number) => ({ width: 1024, height: 768 })),
}));

import { generateImage, generateBackgroundImage } from './imageGenClient';
import { isAiAvailable } from '@/config/apiKeys';
import { generateFallbackImage } from './imageGenHelpers';
import type { ImageGenRequest, ImageGenResult, ImageGenModel } from './imageGenClient';

describe('imageGenClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Type validation ──
    describe('types', () => {
        it('should support ImageGenModel types', () => {
            const models: ImageGenModel[] = ['flux', 'imagen', 'fallback'];
            expect(models).toHaveLength(3);
        });

        it('should support ImageGenRequest structure', () => {
            const req: ImageGenRequest = { prompt: 'sunset', width: 300, height: 250 };
            expect(req.prompt).toBe('sunset');
        });
    });

    // ── generateImage ──
    describe('generateImage', () => {
        it('should use fallback when AI not available', async () => {
            vi.mocked(isAiAvailable).mockReturnValueOnce(false);
            const result = await generateImage({ prompt: 'test', width: 300, height: 250 });
            expect(result.isFallback).toBe(true);
        });

        it('should return fallback directly when model is fallback', async () => {
            const result = await generateImage({ prompt: 'test', width: 300, height: 250, model: 'fallback' });
            expect(result.isFallback).toBe(true);
            expect(result.model).toBe('fallback');
        });

        it('should call API and return result for flux model', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ choices: [{ message: { content: [{ image_url: { url: 'data:image/png;base64,img' } }] } }] }),
            }) as any;

            try {
                const result = await generateImage({ prompt: 'sports car', width: 300, height: 250, model: 'flux' });
                expect(result.success).toBe(true);
                expect(result.isFallback).toBe(false);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should fall back gracefully on API failure', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

            try {
                const result = await generateImage({ prompt: 'test', width: 300, height: 250 });
                expect(result.success).toBe(true);
                expect(result.isFallback).toBe(true);
                expect(result.message).toContain('Image API failed');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    // ── generateBackgroundImage ──
    describe('generateBackgroundImage', () => {
        it('should enhance the background prompt', async () => {
            vi.mocked(isAiAvailable).mockReturnValueOnce(false);
            const result = await generateBackgroundImage('sunset beach', 300, 250, ['#ff6b35']);
            expect(result).toBeDefined();
        });
    });

    // ── Retry Logic (v708) ──
    describe('★ REGRESSION: image gen retry on transient failures (v708)', () => {
        it('should retry on 500 and succeed on 2nd attempt', async () => {
            let callCount = 0;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async () => {
                callCount++;
                if (callCount === 1) {
                    return { ok: false, status: 500, text: async () => 'cold start' } as Response;
                }
                return {
                    ok: true,
                    json: async () => ({ choices: [{ message: { content: [{ image_url: { url: 'data:image/png;base64,img' } }] } }] }),
                } as any;
            }) as any;

            try {
                const result = await generateImage({ prompt: 'test', width: 300, height: 250, model: 'flux' });
                expect(result.success).toBe(true);
                expect(result.isFallback).toBe(false);
                expect(callCount).toBeGreaterThanOrEqual(2);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should fall back to gradient after all retries exhausted', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async () => ({
                ok: false, status: 500, text: async () => 'persistent error',
            })) as any;

            try {
                const result = await generateImage({ prompt: 'test', width: 300, height: 250, model: 'flux' });
                // Should gracefully fall back (generateImage catches and returns fallback)
                expect(result.isFallback).toBe(true);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    // ── Source code guards ──
    describe('★ REGRESSION: imageGenClient source guards (v708)', () => {
        const fs = require('fs');
        const path = require('path');
        const src = fs.readFileSync(path.resolve(__dirname, './imageGenClient.ts'), 'utf-8');

        it('callImageGenApi should have retry loop with MAX_RETRIES', () => {
            expect(src).toContain('MAX_RETRIES');
            expect(src).toMatch(/MAX_RETRIES\s*=\s*2/);
        });

        it('should use fresh headers on each retry attempt', () => {
            expect(src).toContain('Fresh headers on each attempt');
            expect(src).toContain('await getProxyHeaders()');
        });

        it('should have 90s timeout (not 60s) for image generation', () => {
            expect(src).toContain('TIMEOUT_MS = 90_000');
        });

        it('should retry on empty image response (extractImageUrl returns null)', () => {
            expect(src).toContain('Retry on empty image response');
        });

        it('should retry on timeout (AbortError)', () => {
            expect(src).toContain("err.name === 'AbortError'");
        });

        it('should NOT retry on 401/402 auth errors', () => {
            expect(src).toContain('res.status === 401 || res.status === 402');
        });

        it('★ ROOT CAUSE: request body MUST include modalities for Gemini image models (v709)', () => {
            // Without modalities: ["image", "text"], Gemini returns text-only → no image → fallback!
            expect(src).toContain("modalities: ['image', 'text']");
        });

        it('★ REGRESSION: fallback message must include actual error (v709)', () => {
            // Old code: "Image API failed, using gradient fallback" (useless)
            // New code: "Image API failed: <actual error>" (debuggable)
            expect(src).toContain('errMsg.slice(0, 200)');
        });
    });
});

