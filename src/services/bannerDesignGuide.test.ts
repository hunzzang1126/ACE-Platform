// ─────────────────────────────────────────────────
// bannerDesignGuide.test.ts — Banner design intelligence tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    buildBannerStyleGuide,
    getIndustryHints,
    BANNER_PROFILES,
    TYPOGRAPHY_RULES,
    COLOR_RULES,
    COMPOSITION_RULES,
    CTA_RULES,
    DESIGN_QUALITY_CHECKLIST,
} from './bannerDesignGuide';
import type { IndustryVertical } from './bannerDesignGuide';

describe('bannerDesignGuide', () => {
    describe('BANNER_PROFILES', () => {
        it('should have 300x250 Medium Rectangle', () => {
            expect(BANNER_PROFILES['300x250']).toBeDefined();
            expect(BANNER_PROFILES['300x250'].iabName).toBe('Medium Rectangle');
        });

        it('should have 728x90 Leaderboard', () => {
            expect(BANNER_PROFILES['728x90']).toBeDefined();
            expect(BANNER_PROFILES['728x90'].iabName).toBe('Leaderboard');
        });

        it('should have consistent profile structure', () => {
            for (const [key, profile] of Object.entries(BANNER_PROFILES)) {
                expect(profile.width).toBeGreaterThan(0);
                expect(profile.height).toBeGreaterThan(0);
                expect(profile.maxTextElements).toBeGreaterThanOrEqual(1);
                expect(profile.headlineFontRange[0]).toBeLessThan(profile.headlineFontRange[1]);
                expect(profile.safeMargin).toBeGreaterThan(0);
                expect(profile.personality.length).toBeGreaterThan(0);
            }
        });

        it('should include social sizes', () => {
            expect(BANNER_PROFILES['1080x1080']).toBeDefined();
            expect(BANNER_PROFILES['1080x1080'].iabName).toBe('Social Square');
        });

        it('should include story format', () => {
            expect(BANNER_PROFILES['1080x1920']).toBeDefined();
            expect(BANNER_PROFILES['1080x1920'].iabName).toBe('Story/Reel');
        });
    });

    describe('buildBannerStyleGuide', () => {
        it('should include profile info for known size', () => {
            const guide = buildBannerStyleGuide(300, 250);
            expect(guide).toContain('Medium Rectangle');
            expect(guide).toContain('300x250');
        });

        it('should include typography rules', () => {
            const guide = buildBannerStyleGuide(300, 250);
            expect(guide).toContain('TYPOGRAPHY');
        });

        it('should include color rules', () => {
            const guide = buildBannerStyleGuide(300, 250);
            expect(guide).toContain('COLOR');
        });

        it('should include composition rules', () => {
            const guide = buildBannerStyleGuide(300, 250);
            expect(guide).toContain('COMPOSITION');
        });

        it('should include CTA rules', () => {
            const guide = buildBannerStyleGuide(300, 250);
            expect(guide).toContain('CTA BUTTON');
        });

        it('should handle custom sizes gracefully', () => {
            const guide = buildBannerStyleGuide(450, 350);
            expect(guide).toContain('450x350');
            expect(guide).toContain('custom');
        });

        it('should detect wide format for ultra-wide banners', () => {
            const guide = buildBannerStyleGuide(800, 100);
            expect(guide).toContain('WIDE format');
        });

        it('should detect tall format for ultra-tall banners', () => {
            const guide = buildBannerStyleGuide(100, 800);
            expect(guide).toContain('TALL format');
        });
    });

    describe('getIndustryHints', () => {
        const verticals: IndustryVertical[] = [
            'ecommerce', 'saas', 'finance', 'travel', 'food',
            'fashion', 'automotive', 'real_estate', 'education', 'entertainment', 'generic',
        ];

        it('should return hints for all industry verticals', () => {
            for (const v of verticals) {
                const hints = getIndustryHints(v);
                expect(hints.length).toBeGreaterThan(0);
            }
        });

        it('should mention product for ecommerce', () => {
            expect(getIndustryHints('ecommerce')).toContain('product');
        });

        it('should mention trust for finance', () => {
            expect(getIndustryHints('finance')).toContain('Trust');
        });

        it('should mention free trial for saas', () => {
            expect(getIndustryHints('saas')).toContain('Free Trial');
        });
    });

    describe('constants', () => {
        it('should have typography rules string', () => {
            expect(TYPOGRAPHY_RULES.length).toBeGreaterThan(100);
        });

        it('should have design quality checklist', () => {
            expect(DESIGN_QUALITY_CHECKLIST.length).toBeGreaterThan(5);
        });
    });
});
