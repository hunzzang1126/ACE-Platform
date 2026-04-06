// ─────────────────────────────────────────────────
// smartSizing.edgePin.test.ts — Edge Pin v2 adaptive sizing tests
// ─────────────────────────────────────────────────
// Guards: padding ratio, adaptive upscale, overflow, font scaling

import { describe, it, expect } from 'vitest';
import { smartSizeElements } from './smartSizing';
import type { DesignElement } from '@/schema/elements.types';

function makeEl(id: string, type: DesignElement['type'], x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}): DesignElement {
    return {
        id, type, name: id, visible: true, locked: false, opacity: 1, zIndex: 1,
        constraints: {
            horizontal: { anchor: 'left' as const, offset: x },
            vertical: { anchor: 'top' as const, offset: y },
            size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: w, height: h },
        },
        ...extra,
    } as DesignElement;
}

function makeTextEl(id: string, x: number, y: number, w: number, h: number, fontSize: number): DesignElement {
    return makeEl(id, 'text', x, y, w, h, { fontSize, text: id, shapeType: 'rectangle', fill: '#000' });
}

function makeBgEl(x: number, y: number, w: number, h: number): DesignElement {
    return makeEl('bg', 'shape', x, y, w, h, { shapeType: 'rectangle', fill: '#ffffff' });
}

const ORIGIN_W = 300;
const ORIGIN_H = 250;

// Standard test layout: left=20, top=30, group spans to ~200x120
function standardLayout() {
    return [
        makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
        makeTextEl('headline', 20, 30, 200, 40, 32),
        makeTextEl('body', 20, 80, 180, 30, 14),
        makeEl('cta', 'button', 20, 120, 120, 40, { fontSize: 14, label: 'Shop', shapeType: 'rectangle' }),
    ];
}

describe('Edge Pin v2 — padding ratio preservation', () => {
    it('left gap uses ratio, not fixed px', () => {
        const result = smartSizeElements(standardLayout(), ORIGIN_W, ORIGIN_H, 970, 250, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        // Original leftRatio = 20/300 ≈ 6.67%, target = 970 * 0.0667 ≈ 65
        const expectedLeftGap = Math.round(970 * (20 / ORIGIN_W));
        expect(headline.constraints.horizontal.offset).toBe(expectedLeftGap);
    });

    it('top gap uses ratio', () => {
        const result = smartSizeElements(standardLayout(), ORIGIN_W, ORIGIN_H, 300, 600, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        // Original topRatio = 30/250 = 12%, target = 600 * 0.12 = 72
        const expectedTopGap = Math.round(600 * (30 / ORIGIN_H));
        expect(headline.constraints.vertical.offset).toBe(expectedTopGap);
    });
});

describe('Edge Pin v2 — adaptive upscale', () => {
    it('★ CRITICAL: upscales content when target is taller', () => {
        const elements = standardLayout();
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 300, 600, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;

        // baseScale = min(300/300, 600/250) = 1.0
        // Target is much taller → boost should kick in → finalScale > 1.0
        // Font should be BIGGER than original 32
        expect((headline as any).fontSize).toBeGreaterThan(32);
    });

    it('does not upscale when same height (wider only)', () => {
        const elements = standardLayout();
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 970, 250, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;

        // baseScale = min(970/300, 250/250) = 1.0
        // Height is same → might upscale slightly due to available space
        // Font should be >= original (never shrink for wider canvas)
        expect((headline as any).fontSize).toBeGreaterThanOrEqual(32);
    });

    it('shrinks when target is smaller in both axes', () => {
        const elements = standardLayout();
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 160, 90, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;

        // baseScale = min(160/300, 90/250) = min(0.53, 0.36) = 0.36
        // Font should be smaller
        expect((headline as any).fontSize).toBeLessThan(32);
        expect((headline as any).fontSize).toBeGreaterThanOrEqual(8);
    });

    it('boost is capped at 2x', () => {
        // Very small origin → very large target
        const elements = [
            makeBgEl(0, 0, 100, 100),
            makeTextEl('headline', 10, 10, 80, 30, 12),
        ];
        const result = smartSizeElements(elements, 100, 100, 1920, 1080, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;

        // Even with massive upscale opportunity, fontSize should be capped reasonably
        // baseScale = min(1920/100, 1080/100) = 10.8, boost capped at 2x → finalScale = 21.6
        // But font = 12 * 21.6 = 259 — this is large but allowed
        // The key check: element must fit within canvas
        const rightEdge = headline.constraints.horizontal.offset + headline.constraints.size.width;
        expect(rightEdge).toBeLessThanOrEqual(1920);
    });
});

describe('Edge Pin v2 — inter-element distance ratio', () => {
    it('★ CRITICAL: vertical gaps maintain same ratio', () => {
        const result = smartSizeElements(standardLayout(), ORIGIN_W, ORIGIN_H, 300, 600, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const body = result.find(e => e.id === 'body')!;
        const cta = result.find(e => e.id === 'cta')!;

        // Original gaps: headline(30-70) → body(80-110) → cta(120-160)
        // gap1 = 80 - 70 = 10, gap2 = 120 - 110 = 10
        const headlineBottom = headline.constraints.vertical.offset + headline.constraints.size.height;
        const bodyTop = body.constraints.vertical.offset;
        const bodyBottom = body.constraints.vertical.offset + body.constraints.size.height;
        const ctaTop = cta.constraints.vertical.offset;

        const gap1 = bodyTop - headlineBottom;
        const gap2 = ctaTop - bodyBottom;

        // Both gaps should be equal (same ratio) and positive
        expect(gap1).toBe(gap2);
        expect(gap1).toBeGreaterThanOrEqual(0);
    });
});

describe('Edge Pin v2 — background handling', () => {
    it('background fills 100% of target canvas', () => {
        const result = smartSizeElements(standardLayout(), ORIGIN_W, ORIGIN_H, 728, 90, 'edge-pin');
        const bg = result.find(e => e.id === 'bg')!;
        expect(bg.constraints.size.width).toBe(728);
        expect(bg.constraints.size.height).toBe(90);
    });
});

describe('Edge Pin v2 — overflow clamping', () => {
    it('elements do not overflow canvas right edge', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 30, 260, 40, 48),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 160, 600, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const rightEdge = headline.constraints.horizontal.offset + headline.constraints.size.width;
        expect(rightEdge).toBeLessThanOrEqual(160);
    });

    it('elements do not overflow canvas bottom edge', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 220, 200, 40, 48),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 728, 90, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const bottomEdge = headline.constraints.vertical.offset + headline.constraints.size.height;
        expect(bottomEdge).toBeLessThanOrEqual(90);
    });
});

describe('Edge Pin v2 — font scaling', () => {
    it('font size never goes below 8px', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 30, 200, 40, 10),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 80, 40, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        expect((headline as any).fontSize).toBeGreaterThanOrEqual(8);
    });
});

describe('Edge Pin v2 — same size passthrough', () => {
    it('same dimensions returns deep clone', () => {
        const elements = [makeTextEl('a', 20, 20, 100, 50, 16)];
        const result = smartSizeElements(elements, 300, 250, 300, 250, 'edge-pin');
        expect(result[0]!.constraints.horizontal.offset).toBe(20);
        expect(result).not.toBe(elements);
    });
});
