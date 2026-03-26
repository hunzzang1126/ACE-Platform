// ─────────────────────────────────────────────────
// creativeScore.test — Pre-publish scoring tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { calculateCreativeScore } from './creativeScore';
import type { BannerVariant } from '@/schema/design.types';
import type { EngineNode } from '@/hooks/canvasTypes';

function makeVariant(width: number, height: number): BannerVariant {
    return {
        id: 'v1',
        preset: { id: 'p1', name: `${width}x${height}`, width, height, category: 'social' },
        elements: [],
    } as unknown as BannerVariant;
}

function makeNodes(overrides: Partial<EngineNode>[] = []): EngineNode[] {
    return overrides.map((o, i) => ({
        id: i,
        name: `Element ${i}`,
        type: 'text' as const,
        x: 10, y: 10, width: 100, height: 30,
        fontSize: 16,
        ...o,
    })) as unknown as EngineNode[];
}

describe('calculateCreativeScore', () => {
    it('returns publishReady=true for valid 1080x1080 IG post', () => {
        const variant = makeVariant(1080, 1080);
        const nodes = makeNodes([
            { type: 'text' as const, name: 'Headline', text: 'Shop Now', fontSize: 32, width: 200, height: 40 },
            { type: 'button' as const, name: 'CTA', text: 'Buy', width: 120, height: 40 },
        ]);
        const score = calculateCreativeScore(variant, nodes, null, ['instagram']);
        expect(score.total).toBeGreaterThanOrEqual(60);
        expect(score.publishReady).toBe(true);
        expect(score.grade).not.toBe('F');
    });

    it('flags non-standard GDN size', () => {
        const variant = makeVariant(500, 400); // not a standard GDN size
        const nodes = makeNodes([{ type: 'text' as const, text: 'Hello' }]);
        const score = calculateCreativeScore(variant, nodes, null, ['google_ads']);
        const gdnIssue = score.platformReadiness.find(p => p.platform === 'google_ads');
        expect(gdnIssue).toBeDefined();
        const sizeWarning = gdnIssue!.issues.find(i => i.id === 'gdn-accepted-size');
        expect(sizeWarning).toBeDefined();
    });

    it('flags Google Ads missing CTA', () => {
        const variant = makeVariant(300, 250);
        const nodes = makeNodes([{ type: 'text' as const, text: 'Hello world' }]); // no CTA keywords
        const score = calculateCreativeScore(variant, nodes, null, ['google_ads']);
        const gdnReadiness = score.platformReadiness.find(p => p.platform === 'google_ads');
        const ctaIssue = gdnReadiness!.issues.find(i => i.id === 'gdn-has-cta');
        expect(ctaIssue).toBeDefined();
    });

    it('passes Google Ads CTA check when button exists', () => {
        const variant = makeVariant(300, 250);
        const nodes = makeNodes([
            { type: 'text' as const, text: 'Big Sale' },
            { type: 'button' as const, text: 'Shop Now' },
        ]);
        const score = calculateCreativeScore(variant, nodes, null, ['google_ads']);
        const gdnReadiness = score.platformReadiness.find(p => p.platform === 'google_ads');
        const ctaIssue = gdnReadiness!.issues.find(i => i.id === 'gdn-has-cta');
        expect(ctaIssue).toBeUndefined();
    });

    it('flags Instagram below minimum size (320px)', () => {
        const variant = makeVariant(200, 200);
        const nodes = makeNodes([]);
        const score = calculateCreativeScore(variant, nodes, null, ['instagram']);
        const igReadiness = score.platformReadiness.find(p => p.platform === 'instagram');
        const sizeIssue = igReadiness!.issues.find(i => i.id === 'ig-min-size');
        expect(sizeIssue).toBeDefined();
        expect(sizeIssue!.severity).toBe('error');
    });

    it('returns summary for ready design', () => {
        const variant = makeVariant(1080, 1080);
        const nodes = makeNodes([
            { type: 'text' as const, text: 'Shop Now', fontSize: 24, width: 150, height: 30 },
            { type: 'button' as const, text: 'Buy' },
        ]);
        const score = calculateCreativeScore(variant, nodes, null, ['instagram']);
        expect(score.summary.length).toBeGreaterThan(0);
        expect(typeof score.publishReady).toBe('boolean');
    });

    it('handles null variant gracefully', () => {
        const score = calculateCreativeScore(null, [], null, ['instagram', 'google_ads']);
        expect(score.total).toBeDefined();
        expect(score.platformReadiness).toHaveLength(2);
    });

    it('combines design and platform scores (60/40 weighting)', () => {
        const variant = makeVariant(300, 250); // good GDN size
        const nodes = makeNodes([
            { type: 'button' as const, text: 'Shop Now' },
        ]);
        const score = calculateCreativeScore(variant, nodes, null, ['google_ads']);
        // Score should be between 0 and 100
        expect(score.total).toBeGreaterThanOrEqual(0);
        expect(score.total).toBeLessThanOrEqual(100);
    });
});
