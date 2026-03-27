// ─────────────────────────────────────────────────
// imageGenHelpers.test.ts — Flux resolution snapping + URL parsing tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { snapToFluxResolution, extractImageUrl, buildEnhancedPrompt } from '@/services/imageGenHelpers';

describe('snapToFluxResolution — canvas → Flux-optimal dimensions', () => {
    it('300x250 (standard banner) → landscape close to 6:5', () => {
        const r = snapToFluxResolution(300, 250);
        expect(r.width).toBeGreaterThanOrEqual(768);
        expect(r.height).toBeGreaterThanOrEqual(480);
        // Should pick a resolution with similar aspect ratio
        const origAspect = 300 / 250; // 1.2
        const fluxAspect = r.width / r.height;
        expect(Math.abs(fluxAspect - origAspect)).toBeLessThan(0.5);
    });

    it('728x90 (leaderboard) → ultra-wide resolution', () => {
        const r = snapToFluxResolution(728, 90);
        expect(r.width).toBeGreaterThan(r.height);
        // Should pick widest available
        expect(r.width / r.height).toBeGreaterThan(2);
    });

    it('160x600 (sky scraper) → ultra-tall resolution', () => {
        const r = snapToFluxResolution(160, 600);
        expect(r.height).toBeGreaterThan(r.width);
        expect(r.height / r.width).toBeGreaterThan(2);
    });

    it('1080x1080 (social square) → 1024x1024', () => {
        const r = snapToFluxResolution(1080, 1080);
        expect(r.width).toBe(1024);
        expect(r.height).toBe(1024);
    });

    it('1920x1080 (16:9 HD) → 16:9 landscape resolution', () => {
        const r = snapToFluxResolution(1920, 1080);
        const aspect = r.width / r.height;
        expect(aspect).toBeCloseTo(16 / 9, 0);
    });

    it('1080x1920 (9:16 story) → 9:16 portrait resolution', () => {
        const r = snapToFluxResolution(1080, 1920);
        expect(r.height).toBeGreaterThan(r.width);
        const aspect = r.width / r.height;
        expect(aspect).toBeCloseTo(9 / 16, 0);
    });

    it('always returns dimensions >= 480px on shortest side', () => {
        const testCases = [[300, 250], [728, 90], [160, 600], [100, 100], [468, 60]];
        for (const [w, h] of testCases) {
            const r = snapToFluxResolution(w!, h!);
            expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(480);
        }
    });
});

describe('extractImageUrl — response parsing', () => {
    it('extracts URL from standard choices format', () => {
        const resp = { choices: [{ message: { content: 'https://example.com/image.png' } }] };
        expect(extractImageUrl(resp)).toBe('https://example.com/image.png');
    });

    it('extracts data URL from base64 content', () => {
        const resp = { choices: [{ message: { content: 'data:image/png;base64,abc123' } }] };
        expect(extractImageUrl(resp)).toBe('data:image/png;base64,abc123');
    });

    it('extracts from DALL-E b64_json format', () => {
        const resp = { data: [{ b64_json: 'iVBORw0KGgo=' }] };
        expect(extractImageUrl(resp)).toBe('data:image/png;base64,iVBORw0KGgo=');
    });

    it('extracts from data[].url format', () => {
        const resp = { data: [{ url: 'https://cdn.example.com/img.jpg' }] };
        expect(extractImageUrl(resp)).toBe('https://cdn.example.com/img.jpg');
    });

    it('returns null for empty response', () => {
        expect(extractImageUrl({})).toBeNull();
        expect(extractImageUrl({ choices: [] })).toBeNull();
    });
});

describe('buildEnhancedPrompt', () => {
    it('includes base prompt', () => {
        const result = buildEnhancedPrompt({ prompt: 'sunset beach', width: 300, height: 250 });
        expect(result).toContain('sunset beach');
    });

    it('adds style enhancement when specified', () => {
        const result = buildEnhancedPrompt({ prompt: 'test', width: 300, height: 250, style: 'photography' });
        expect(result).toContain('DSLR');
    });

    it('includes color constraints', () => {
        const result = buildEnhancedPrompt({ prompt: 'test', width: 300, height: 250, colorConstraint: ['#ff0000', '#00ff00'] });
        expect(result).toContain('#ff0000');
    });
});
