// ─────────────────────────────────────────────────
// aiStructureService.test.ts — Unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { generateLayoutSpecSync } from './aiStructureService';
import type { GeneratedContent } from '@/services/designTemplates';

// Helper: make content with specified headline
function makeContent(headline: string, overrides?: Partial<GeneratedContent>): GeneratedContent {
    return {
        headline,
        subheadline: overrides?.subheadline ?? 'A great subtitle for your brand',
        cta: overrides?.cta ?? 'Learn More',
        tag: overrides?.tag ?? '',
    };
}

describe('aiStructureService — generateLayoutSpecSync', () => {
    // ── Aspect Ratio → Layout Type ──

    describe('aspect ratio routing', () => {
        it('chooses horizontal-strip for ultra-wide canvas (728x90)', () => {
            const spec = generateLayoutSpecSync('Nike ad', makeContent('Run'), 728, 90);
            expect(spec.layoutType).toBe('horizontal-strip');
            expect(spec.alignment).toBe('left');
        });

        it('chooses tower for ultra-tall canvas (160x600)', () => {
            const spec = generateLayoutSpecSync('luxury ad', makeContent('Exclusive'), 160, 600);
            expect(spec.layoutType).toBe('tower');
            expect(spec.alignment).toBe('center');
        });

        it('chooses centered-stack or badge for square canvas', () => {
            const spec = generateLayoutSpecSync('SaaS ad', makeContent('Cloud Platform'), 300, 250);
            expect(['centered-stack', 'badge-focus']).toContain(spec.layoutType);
        });

        it('chooses centered-stack for square with longer headline', () => {
            const spec = generateLayoutSpecSync('SaaS', makeContent('Your Cloud Platform Solution'), 300, 250);
            expect(spec.layoutType).toBe('centered-stack');
        });

        it('chooses badge-focus for square with short headline', () => {
            const spec = generateLayoutSpecSync('Sale', makeContent('50% OFF'), 250, 250);
            expect(spec.layoutType).toBe('badge-focus');
        });
    });

    // ── Content-Aware Font Sizing ──

    describe('content-aware font sizing', () => {
        it('gives larger font to short headlines', () => {
            const short = generateLayoutSpecSync('Nike', makeContent('Run'), 300, 250);
            const long = generateLayoutSpecSync('Nike', makeContent('The Ultimate Running Experience for Athletes'), 300, 250);
            expect(short.headlineFontSize).toBeGreaterThan(long.headlineFontSize);
        });

        it('headline font is always >= 14px', () => {
            const spec = generateLayoutSpecSync('test', makeContent('A'.repeat(200)), 300, 250);
            expect(spec.headlineFontSize).toBeGreaterThanOrEqual(14);
        });

        it('headline font is always <= 80px', () => {
            const spec = generateLayoutSpecSync('test', makeContent('Hi'), 1920, 1080);
            expect(spec.headlineFontSize).toBeLessThanOrEqual(80);
        });

        it('subheadline is always smaller than headline', () => {
            const spec = generateLayoutSpecSync('Nike', makeContent('Just Do It'), 300, 250);
            expect(spec.subheadlineFontSize).toBeLessThan(spec.headlineFontSize);
        });

        it('subheadline is always >= 10px', () => {
            const spec = generateLayoutSpecSync('test', makeContent('A'.repeat(100)), 160, 600);
            expect(spec.subheadlineFontSize).toBeGreaterThanOrEqual(10);
        });
    });

    // ── Mood Detection ──

    describe('mood detection', () => {
        it('detects luxury mood', () => {
            const spec = generateLayoutSpecSync('luxury watch collection', makeContent('Exclusive'), 300, 250);
            expect(spec.mood).toBe('luxury');
        });

        it('detects energetic mood for sports', () => {
            const spec = generateLayoutSpecSync('Nike fitness gear', makeContent('Run'), 300, 250);
            expect(spec.mood).toBe('energetic');
        });

        it('detects tech mood', () => {
            const spec = generateLayoutSpecSync('SaaS cloud platform', makeContent('Build'), 300, 250);
            expect(spec.mood).toBe('tech');
        });

        it('detects promotional mood for sales', () => {
            const spec = generateLayoutSpecSync('50% off sale discount', makeContent('Save'), 300, 250);
            expect(spec.mood).toBe('promotional');
        });

        it('detects minimal mood', () => {
            const spec = generateLayoutSpecSync('clean minimal design', makeContent('Simple'), 300, 250);
            expect(spec.mood).toBe('minimal');
        });

        it('defaults to professional for unknown', () => {
            const spec = generateLayoutSpecSync('generic business ad', makeContent('Hello'), 300, 250);
            expect(spec.mood).toBe('professional');
        });
    });

    // ── Zone Positions ──

    describe('zone positioning', () => {
        it('headlineZone fits within canvas (percentage check)', () => {
            const spec = generateLayoutSpecSync('test', makeContent('Title'), 300, 250);
            const hz = spec.headlineZone;
            expect(hz.xPct).toBeGreaterThanOrEqual(0);
            expect(hz.yPct).toBeGreaterThanOrEqual(0);
            expect(hz.xPct + hz.wPct).toBeLessThanOrEqual(1);
            expect(hz.yPct + hz.hPct).toBeLessThanOrEqual(1);
        });

        it('ctaZone fits within canvas', () => {
            const spec = generateLayoutSpecSync('test', makeContent('Title'), 300, 250);
            const cz = spec.ctaZone;
            expect(cz.xPct).toBeGreaterThanOrEqual(0);
            expect(cz.yPct).toBeGreaterThanOrEqual(0);
            expect(cz.xPct + cz.wPct).toBeLessThanOrEqual(1);
            expect(cz.yPct + cz.hPct).toBeLessThanOrEqual(1);
        });

        it('ctaZone is below headlineZone in vertical layouts', () => {
            const spec = generateLayoutSpecSync('test', makeContent('Title'), 300, 250);
            if (spec.layoutType !== 'horizontal-strip') {
                expect(spec.ctaZone.yPct).toBeGreaterThan(spec.headlineZone.yPct);
            }
        });
    });

    // ── Reasoning ──

    describe('reasoning output', () => {
        it('includes layout type in reasoning', () => {
            const spec = generateLayoutSpecSync('Nike', makeContent('Run'), 300, 250);
            expect(spec.reasoning).toContain(spec.layoutType);
        });

        it('includes mood in reasoning', () => {
            const spec = generateLayoutSpecSync('luxury', makeContent('Exclusive'), 300, 250);
            expect(spec.reasoning).toContain(spec.mood);
        });
    });
});
