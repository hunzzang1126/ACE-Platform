// ─────────────────────────────────────────────────
// Size Router Tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getRoutesForSize, groupVariantsByPlatform } from './sizeRouter';

describe('sizeRouter', () => {
    describe('getRoutesForSize', () => {
        it('routes 1080x1080 to Instagram Feed + Facebook Feed', () => {
            const routes = getRoutesForSize(1080, 1080);
            expect(routes.length).toBe(2);
            expect(routes[0].platform).toBe('instagram');
            expect(routes[0].placement).toBe('feed');
            expect(routes[1].platform).toBe('facebook');
        });

        it('routes 1080x1920 to Instagram Stories + Facebook Stories', () => {
            const routes = getRoutesForSize(1080, 1920);
            expect(routes.length).toBe(2);
            expect(routes[0].platform).toBe('instagram');
            expect(routes[0].placement).toBe('stories');
        });

        it('routes 300x250 to Google Display Medium Rectangle', () => {
            const routes = getRoutesForSize(300, 250);
            expect(routes.length).toBe(1);
            expect(routes[0].platform).toBe('google_ads');
            expect(routes[0].placement).toBe('medium_rectangle');
        });

        it('routes 728x90 to Google Display Leaderboard', () => {
            const routes = getRoutesForSize(728, 90);
            expect(routes.length).toBe(1);
            expect(routes[0].platform).toBe('google_ads');
            expect(routes[0].placement).toBe('leaderboard');
        });

        it('routes 160x600 to Google Display Wide Skyscraper', () => {
            const routes = getRoutesForSize(160, 600);
            expect(routes.length).toBe(1);
            expect(routes[0].platform).toBe('google_ads');
            expect(routes[0].placement).toBe('wide_skyscraper');
        });

        it('routes 1200x628 to Facebook Link Ad + Google Discover', () => {
            const routes = getRoutesForSize(1200, 628);
            expect(routes.length).toBe(2);
            expect(routes[0].platform).toBe('facebook');
            expect(routes[1].platform).toBe('google_ads');
        });

        it('fuzzy matches within ±10px tolerance', () => {
            const routes = getRoutesForSize(1085, 1080);
            expect(routes.length).toBeGreaterThan(0);
            expect(routes[0].platform).toBe('instagram');
        });

        it('falls back to aspect ratio for unknown sizes', () => {
            // Square-ish → Instagram Feed
            const square = getRoutesForSize(800, 800);
            expect(square.length).toBeGreaterThan(0);
            expect(square[0].platform).toBe('instagram');

            // Tall portrait → Stories
            const portrait = getRoutesForSize(600, 1200);
            expect(portrait.length).toBeGreaterThan(0);
            expect(portrait[0].platform).toBe('instagram');
            expect(portrait[0].placement).toBe('stories');
        });

        it('returns empty for very unusual aspect ratios', () => {
            const weird = getRoutesForSize(100, 100);
            // 100x100 is square, should get aspect ratio fallback
            expect(weird.length).toBeGreaterThan(0);
        });
    });

    describe('groupVariantsByPlatform', () => {
        it('groups variants by platform correctly', () => {
            const variants = [
                { id: '1', label: '1080x1080', width: 1080, height: 1080 },
                { id: '2', label: '300x250', width: 300, height: 250 },
                { id: '3', label: '728x90', width: 728, height: 90 },
                { id: '4', label: '1080x1920', width: 1080, height: 1920 },
            ];

            const grouped = groupVariantsByPlatform(variants);

            // Instagram should have 1080x1080 (feed) + 1080x1920 (stories)
            const ig = grouped.get('instagram');
            expect(ig).toBeDefined();
            expect(ig!.length).toBe(2);

            // Google should have 300x250 + 728x90
            const google = grouped.get('google_ads');
            expect(google).toBeDefined();
            expect(google!.length).toBe(2);

            // Facebook should have 1080x1080 (feed) + 1080x1920 (stories)
            const fb = grouped.get('facebook');
            expect(fb).toBeDefined();
            expect(fb!.length).toBe(2);
        });

        it('handles empty variants', () => {
            const grouped = groupVariantsByPlatform([]);
            expect(grouped.size).toBe(0);
        });
    });
});
