// ─────────────────────────────────────────────────
// assetAnalyzer.test.ts — Asset analysis + fallback tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/apiKeys', () => ({
    getAnthropicKey: vi.fn().mockReturnValue(''),
}));

import { analyzeAsset } from './assetAnalyzer';
import { getAnthropicKey } from '@/config/apiKeys';
import type { AssetAnalysis, AssetType, SuggestedRole } from './assetAnalyzer';

describe('assetAnalyzer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('analyzeAsset (fallback mode — no API key)', () => {
        it('should detect logo from filename', async () => {
            const result = await analyzeAsset('data:image/png;base64,abc', 'brand-logo.png', 200, 50);
            expect(result.type).toBe('logo');
            expect(result.suggestedRole).toBe('logo');
        });

        it('should detect icon from filename', async () => {
            const result = await analyzeAsset('data:image/jpg;base64,abc', 'menu-icon.jpg', 24, 24);
            expect(result.type).toBe('icon');
            expect(result.suggestedRole).toBe('badge');
        });

        it('should detect background from filename', async () => {
            const result = await analyzeAsset('data:image/jpg;base64,abc', 'hero-bg.jpg', 1920, 1080);
            expect(result.type).toBe('photo');
            expect(result.suggestedRole).toBe('background');
        });

        it('should detect pattern from filename', async () => {
            const result = await analyzeAsset('data:image/png;base64,abc', 'dot-pattern.png', 400, 400);
            expect(result.type).toBe('pattern');
            expect(result.suggestedRole).toBe('background');
        });

        it('should detect small transparent image as logo', async () => {
            const result = await analyzeAsset('data:image/png;base64,abc', 'unknown.png', 100, 100);
            expect(result.type).toBe('logo');
            expect(result.suggestedRole).toBe('logo');
            expect(result.hasTransparency).toBe(true);
        });

        it('should detect small non-transparent image as icon', async () => {
            const result = await analyzeAsset('data:image/jpg;base64,abc', 'unknown.jpg', 100, 100);
            expect(result.type).toBe('icon');
            expect(result.suggestedRole).toBe('badge');
        });

        it('should default regular photo to hero_image', async () => {
            const result = await analyzeAsset('data:image/jpg;base64,abc', 'product-shot.jpg', 800, 600);
            expect(result.type).toBe('photo');
            expect(result.suggestedRole).toBe('hero_image');
        });

        it('should detect aspect ratio 1:1', async () => {
            const result = await analyzeAsset('data:image/png;base64,abc', 'test.png', 500, 500);
            expect(result.aspectRatio).toBe('1:1');
        });

        it('should detect aspect ratio 16:9', async () => {
            const result = await analyzeAsset('data:image/png;base64,abc', 'test.png', 1920, 1080);
            expect(result.aspectRatio).toBe('16:9');
        });

        it('should detect quality by resolution', async () => {
            const hi = await analyzeAsset('data:image/png;base64,abc', 'test.png', 2000, 1500);
            expect(hi.quality).toBe('high');

            const med = await analyzeAsset('data:image/png;base64,abc', 'test.png', 800, 600);
            expect(med.quality).toBe('medium');

            const low = await analyzeAsset('data:image/png;base64,abc', 'test.png', 200, 150);
            expect(low.quality).toBe('low');
        });

        it('should detect transparency for PNG', async () => {
            const png = await analyzeAsset('data:image/png;base64,abc', 'test.png', 500, 500);
            expect(png.hasTransparency).toBe(true);
        });

        it('should detect no transparency for JPEG', async () => {
            const jpg = await analyzeAsset('data:image/jpeg;base64,abc', 'test.jpg', 500, 500);
            expect(jpg.hasTransparency).toBe(false);
        });

        it('should include tags', async () => {
            const result = await analyzeAsset('data:image/png;base64,abc', 'brand-logo.png', 200, 50);
            expect(result.tags.length).toBeGreaterThan(0);
        });

        it('should include description', async () => {
            const result = await analyzeAsset('data:image/png;base64,abc', 'test.png', 500, 500);
            expect(result.description).toContain('test.png');
        });
    });

    describe('analyzeAsset (API error fallback)', () => {
        it('should fall back gracefully on network error', async () => {
            vi.mocked(getAnthropicKey).mockReturnValue('test-key');
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

            try {
                const result = await analyzeAsset('data:image/png;base64,abc', 'test.png', 500, 500);
                expect(result.type).toBeDefined();
                expect(result.description).toBeDefined();
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });
});
