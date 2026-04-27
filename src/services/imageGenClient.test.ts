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
                expect(result.message).toContain('fallback');
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
});
