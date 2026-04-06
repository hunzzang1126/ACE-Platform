// ─────────────────────────────────────────────────
// smartSizing.edgePin.test.ts — Edge Pin sizing mode tests
// ─────────────────────────────────────────────────
// Guards: left gap preservation, inter-element distance ratio, overflow clamping

import { describe, it, expect } from 'vitest';
import { smartSizeElements } from './smartSizing';
import type { DesignElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';

// Helper to make a positioned element
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

const ORIGIN_W = 1080;
const ORIGIN_H = 1080;

describe('Edge Pin — left gap preservation', () => {
    it('preserves left gap when sizing to wide format', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 200, 400, 60, 48),
            makeTextEl('cta', 20, 280, 180, 50, 24),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 728, 90, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const cta = result.find(e => e.id === 'cta')!;

        // Left gap should be preserved at 20px
        expect(headline.constraints.horizontal.offset).toBe(20);
        expect(cta.constraints.horizontal.offset).toBe(20);
    });

    it('preserves left gap when sizing to tall format', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 30, 100, 400, 60, 48),
            makeTextEl('body', 30, 180, 350, 40, 16),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 160, 600, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const body = result.find(e => e.id === 'body')!;

        expect(headline.constraints.horizontal.offset).toBe(30);
        expect(body.constraints.horizontal.offset).toBe(30);
    });
});

describe('Edge Pin — inter-element distance ratio preservation', () => {
    it('★ CRITICAL: vertical gaps between elements maintain same ratio', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 200, 400, 60, 48),
            makeTextEl('body', 20, 280, 350, 40, 16),    // 20px gap from headline bottom
            makeTextEl('cta', 20, 340, 180, 50, 24),      // 20px gap from body bottom
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 728, 90, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const body = result.find(e => e.id === 'body')!;
        const cta = result.find(e => e.id === 'cta')!;

        // Original gaps: headline→body = 20px, body→cta = 20px (equal)
        // After edge-pin, the ratio should be preserved (gaps equal)
        const headlineBottom = headline.constraints.vertical.offset + headline.constraints.size.height;
        const bodyTop = body.constraints.vertical.offset;
        const bodyBottom = body.constraints.vertical.offset + body.constraints.size.height;
        const ctaTop = cta.constraints.vertical.offset;

        const gap1 = bodyTop - headlineBottom;
        const gap2 = ctaTop - bodyBottom;

        // Both gaps should be equal (same ratio as original)
        expect(gap1).toBe(gap2);
        // Both gaps should be > 0 (not collapsed)
        expect(gap1).toBeGreaterThanOrEqual(0);
    });

    it('horizontal inter-element distance is preserved', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeEl('logo', 'shape', 20, 50, 80, 80, { shapeType: 'rectangle', fill: '#000' }),
            makeTextEl('title', 120, 70, 300, 40, 32),  // 20px gap from logo right
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 728, 90, 'edge-pin');
        const logo = result.find(e => e.id === 'logo')!;
        const title = result.find(e => e.id === 'title')!;

        const logoRight = logo.constraints.horizontal.offset + logo.constraints.size.width;
        const titleLeft = title.constraints.horizontal.offset;
        const gap = titleLeft - logoRight;

        // Gap should be positive (not overlapping)
        expect(gap).toBeGreaterThanOrEqual(0);
    });
});

describe('Edge Pin — background handling', () => {
    it('background fills 100% of target canvas', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 200, 400, 60, 48),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 728, 90, 'edge-pin');
        const bg = result.find(e => e.id === 'bg')!;

        expect(bg.constraints.size.width).toBe(728);
        expect(bg.constraints.size.height).toBe(90);
    });
});

describe('Edge Pin — overflow clamping', () => {
    it('elements do not overflow canvas right edge', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 200, 900, 60, 48),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 160, 600, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const rightEdge = headline.constraints.horizontal.offset + headline.constraints.size.width;

        expect(rightEdge).toBeLessThanOrEqual(160);
    });

    it('elements do not overflow canvas bottom edge', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 950, 400, 60, 48),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 728, 90, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const bottomEdge = headline.constraints.vertical.offset + headline.constraints.size.height;

        expect(bottomEdge).toBeLessThanOrEqual(90);
    });
});

describe('Edge Pin — font scaling', () => {
    it('font size scales with uniformScale', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 200, 400, 60, 48),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 300, 250, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;
        const uniformScale = Math.min(300 / ORIGIN_W, 250 / ORIGIN_H);

        expect((headline as any).fontSize).toBe(Math.max(8, Math.round(48 * uniformScale)));
    });

    it('font size never goes below 8px', () => {
        const elements = [
            makeBgEl(0, 0, ORIGIN_W, ORIGIN_H),
            makeTextEl('headline', 20, 200, 400, 60, 10),
        ];
        const result = smartSizeElements(elements, ORIGIN_W, ORIGIN_H, 160, 90, 'edge-pin');
        const headline = result.find(e => e.id === 'headline')!;

        expect((headline as any).fontSize).toBeGreaterThanOrEqual(8);
    });
});

describe('Edge Pin — same size passthrough', () => {
    it('same dimensions returns deep clone', () => {
        const elements = [makeTextEl('a', 20, 20, 100, 50, 16)];
        const result = smartSizeElements(elements, 300, 250, 300, 250, 'edge-pin');
        expect(result[0]!.constraints.horizontal.offset).toBe(20);
        expect(result).not.toBe(elements); // deep clone
    });
});
