// ─────────────────────────────────────────────────
// overlapGuard.test.ts — Unit tests for fixAllOverlaps
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { fixAllOverlaps } from './overlapGuard';
import type { RenderElement } from '@/services/autoDesignTypes';

function makeEl(name: string, y: number, h: number, opts: Partial<RenderElement> = {}): RenderElement {
    return {
        name, type: 'text' as any,
        x: 50, y, w: 200, h,
        content: name, font_size: 24,
        ...opts,
    } as RenderElement;
}

describe('fixAllOverlaps', () => {
    it('does nothing when elements do not overlap', () => {
        const elements: RenderElement[] = [
            makeEl('headline', 100, 40),
            makeEl('subheadline', 160, 30),
        ];
        fixAllOverlaps(elements, 500, 250);
        expect(elements[0]!.y).toBe(100);
        expect(elements[1]!.y).toBe(160);
    });

    it('★ REGRESSION: fixes overlapping headline + subheadline', () => {
        const elements: RenderElement[] = [
            makeEl('headline', 100, 50),
            makeEl('subheadline', 120, 30), // overlaps headline
        ];
        fixAllOverlaps(elements, 500, 250);
        const headBottom = elements[0]!.y! + elements[0]!.h!;
        expect(elements[1]!.y!).toBeGreaterThanOrEqual(headBottom);
    });

    it('★ REGRESSION: fixes CTA overlapping subheadline', () => {
        const elements: RenderElement[] = [
            makeEl('headline', 50, 60),
            makeEl('subheadline', 120, 40),
            { name: 'cta_button', type: 'rounded_rect' as any, x: 50, y: 130, w: 200, h: 40 } as any,
            makeEl('cta_label', 130, 40),
        ];
        fixAllOverlaps(elements, 500, 250);
        const subBottom = elements[1]!.y! + elements[1]!.h!;
        const ctaTop = elements[2]!.y!;
        expect(ctaTop).toBeGreaterThanOrEqual(subBottom);
    });

    it('cascade-shifts all subsequent elements', () => {
        const elements: RenderElement[] = [
            makeEl('headline', 100, 60),
            makeEl('subheadline', 110, 30), // overlaps
            { name: 'cta_button', type: 'rounded_rect' as any, x: 50, y: 150, w: 200, h: 40 } as any,
        ];
        fixAllOverlaps(elements, 500, 250);
        // Subheadline should be shifted, and CTA should cascade
        expect(elements[1]!.y!).toBeGreaterThanOrEqual(elements[0]!.y! + elements[0]!.h!);
        expect(elements[2]!.y!).toBeGreaterThanOrEqual(elements[1]!.y! + elements[1]!.h!);
    });

    it('compresses when content overflows canvas', () => {
        const elements: RenderElement[] = [
            makeEl('headline', 0, 200, { font_size: 60 }),
            makeEl('subheadline', 100, 100, { font_size: 30 }), // heavy overlap
            { name: 'cta_button', type: 'rounded_rect' as any, x: 50, y: 150, w: 200, h: 60 } as any,
            makeEl('cta_label', 150, 60, { font_size: 20 }),
        ];
        fixAllOverlaps(elements, 250, 250);
        // Everything should fit within canvas
        for (const el of elements) {
            expect((el.y ?? 0) + (el.h ?? 0)).toBeLessThanOrEqual(250);
        }
    });

    it('cta_label stays synced with cta_button position', () => {
        const elements: RenderElement[] = [
            makeEl('headline', 50, 80),
            makeEl('subheadline', 60, 60), // overlaps
            { name: 'cta_button', type: 'rounded_rect' as any, x: 50, y: 100, w: 200, h: 40 } as any,
            makeEl('cta_label', 100, 40),
        ];
        fixAllOverlaps(elements, 300, 250);
        const btn = elements.find(e => e.name === 'cta_button')!;
        const lbl = elements.find(e => e.name === 'cta_label')!;
        expect(lbl.x).toBe(btn.x);
        expect(lbl.y).toBe(btn.y);
    });

    it('skips elements with no horizontal overlap', () => {
        const elements: RenderElement[] = [
            makeEl('headline', 100, 50, { x: 0, w: 100 }),
            makeEl('subheadline', 100, 50, { x: 200, w: 100 }), // same Y but different X
        ];
        fixAllOverlaps(elements, 500, 250);
        // Should NOT shift because no horizontal overlap
        expect(elements[0]!.y).toBe(100);
        expect(elements[1]!.y).toBe(100);
    });

    it('handles single element gracefully', () => {
        const elements: RenderElement[] = [makeEl('headline', 100, 50)];
        fixAllOverlaps(elements, 500, 250);
        expect(elements[0]!.y).toBe(100);
    });

    it('handles empty array', () => {
        const elements: RenderElement[] = [];
        fixAllOverlaps(elements, 500, 250); // should not throw
        expect(elements).toHaveLength(0);
    });
});
