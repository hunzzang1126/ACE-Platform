// ─────────────────────────────────────────────────
// layoutValidator.test.ts — Unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { validateLayout } from './layoutValidator';
import type { RenderElement } from '@/services/autoDesignService';

// Helper: make a minimal valid element
function makeEl(overrides: Partial<RenderElement> & { type: RenderElement['type']; name: string }): RenderElement {
    return { x: 0, y: 0, w: 100, h: 30, ...overrides };
}

describe('layoutValidator', () => {
    // ── Rule 1: Boundary Clamping ──

    describe('boundary clamping', () => {
        it('clamps negative x to 0', () => {
            const els = [makeEl({ type: 'text', name: 'headline', x: -20, y: 50, w: 100, h: 30 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.x).toBeGreaterThanOrEqual(0);
            expect(result.fixes.length).toBeGreaterThan(0);
        });

        it('clamps negative y to 0', () => {
            const els = [makeEl({ type: 'text', name: 'headline', x: 50, y: -15, w: 100, h: 30 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.y).toBeGreaterThanOrEqual(0);
        });

        it('clamps element extending past right edge', () => {
            const els = [makeEl({ type: 'rect', name: 'accent', x: 280, y: 50, w: 100, h: 30 })];
            const result = validateLayout(els, 300, 250);
            const el = result.elements[0]!;
            expect(el.x + el.w).toBeLessThanOrEqual(300);
        });

        it('clamps element extending past bottom', () => {
            const els = [makeEl({ type: 'rect', name: 'accent', x: 50, y: 240, w: 100, h: 30 })];
            const result = validateLayout(els, 300, 250);
            const el = result.elements[0]!;
            expect(el.y + el.h).toBeLessThanOrEqual(250);
        });

        it('skips background element', () => {
            const els = [makeEl({ type: 'rect', name: 'background', x: 0, y: 0, w: 300, h: 250 })];
            const result = validateLayout(els, 300, 250);
            expect(result.isClean).toBe(true);
        });

        it('shrinks element wider than canvas', () => {
            const els = [makeEl({ type: 'rect', name: 'accent', x: 0, y: 50, w: 400, h: 30 })];
            const result = validateLayout(els, 300, 250);
            const el = result.elements[0]!;
            expect(el.w).toBeLessThanOrEqual(300);
        });
    });

    // ── Rule 2: Text Edge Padding ──

    describe('text edge padding', () => {
        it('adds padding to text touching left edge', () => {
            const els = [makeEl({ type: 'text', name: 'headline', x: 0, y: 50, w: 100, h: 30 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.x).toBeGreaterThanOrEqual(4);
        });

        it('adds padding to text touching top edge', () => {
            const els = [makeEl({ type: 'text', name: 'headline', x: 50, y: 0, w: 100, h: 30 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.y).toBeGreaterThanOrEqual(4);
        });

        it('does not add padding to non-text elements', () => {
            const els = [makeEl({ type: 'rect', name: 'accent', x: 0, y: 0, w: 100, h: 30 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.x).toBe(0);
        });
    });

    // ── Rule 3: Overlap Detection ──

    describe('overlap detection', () => {
        it('nudges vertically overlapping text boxes apart', () => {
            const els = [
                makeEl({ type: 'text', name: 'headline', x: 20, y: 50, w: 200, h: 40 }),
                makeEl({ type: 'text', name: 'subheadline', x: 20, y: 85, w: 200, h: 30 }), // gap = 85 - (50+40) = -5px
            ];
            const result = validateLayout(els, 300, 250);
            const a = result.elements[0]!;
            const b = result.elements[1]!;
            expect(b.y - (a.y + a.h)).toBeGreaterThanOrEqual(8);
        });

        it('does not nudge non-overlapping text', () => {
            const els = [
                makeEl({ type: 'text', name: 'headline', x: 20, y: 50, w: 200, h: 30 }),
                makeEl({ type: 'text', name: 'subheadline', x: 20, y: 100, w: 200, h: 20 }), // gap = 100 - 80 = 20px
            ];
            const result = validateLayout(els, 300, 250);
            // Should be clean (or only padding fixes)
            expect(result.elements[1]!.y).toBe(100);
        });

        it('does not nudge text in different columns', () => {
            const els = [
                makeEl({ type: 'text', name: 'left_text', x: 10, y: 50, w: 100, h: 30 }),
                makeEl({ type: 'text', name: 'right_text', x: 150, y: 50, w: 100, h: 30 }), // same Y but no horizontal overlap
            ];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.y).toBe(50);
            expect(result.elements[1]!.y).toBe(50);
        });
    });

    // ── Rule 4: Hierarchy Enforcement ──

    describe('hierarchy enforcement', () => {
        it('reduces subordinate text larger than headline', () => {
            const els = [
                makeEl({ type: 'text', name: 'headline', x: 20, y: 50, w: 200, h: 40, font_size: 24 }),
                makeEl({ type: 'text', name: 'subheadline', x: 20, y: 120, w: 200, h: 30, font_size: 30 }), // too big!
            ];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[1]!.font_size).toBeLessThan(24);
            expect(result.fixes.some(f => f.includes('headline must be largest'))).toBe(true);
        });

        it('leaves correct hierarchy alone', () => {
            const els = [
                makeEl({ type: 'text', name: 'headline', x: 20, y: 50, w: 200, h: 40, font_size: 30 }),
                makeEl({ type: 'text', name: 'subheadline', x: 20, y: 120, w: 200, h: 30, font_size: 14 }),
            ];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[1]!.font_size).toBe(14);
        });
    });

    // ── Rule 5: CTA Alignment ──

    describe('CTA alignment', () => {
        it('aligns cta_label horizontally with cta_button', () => {
            const els = [
                makeEl({ type: 'rounded_rect', name: 'cta_button', x: 80, y: 200, w: 140, h: 40 }),
                makeEl({ type: 'text', name: 'cta_label', x: 90, y: 208, w: 120, h: 18, font_size: 14 }),
            ];
            const result = validateLayout(els, 300, 250);
            const btn = result.elements[0]!;
            const lbl = result.elements[1]!;
            expect(lbl.x).toBe(btn.x);
            expect(lbl.w).toBe(btn.w);
        });

        it('centers cta_label vertically within button', () => {
            const els = [
                makeEl({ type: 'rounded_rect', name: 'cta_button', x: 80, y: 200, w: 140, h: 40 }),
                makeEl({ type: 'text', name: 'cta_label', x: 80, y: 200, w: 140, h: 18, font_size: 14 }), // top-aligned, not centered
            ];
            const result = validateLayout(els, 300, 250);
            const btn = result.elements[0]!;
            const lbl = result.elements[1]!;
            // Label should be vertically centered
            const labelH = 14 + 4; // font_size + 4
            const expectedY = btn.y + Math.round((btn.h - labelH) / 2);
            expect(lbl.y).toBe(expectedY);
        });
    });

    // ── Rule 6: Minimum Font Size ──

    describe('minimum font size', () => {
        it('enforces minimum 8px font size', () => {
            const els = [makeEl({ type: 'text', name: 'tiny_text', x: 20, y: 20, w: 100, h: 10, font_size: 5 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.font_size).toBe(8);
        });

        it('leaves adequate font sizes alone', () => {
            const els = [makeEl({ type: 'text', name: 'normal_text', x: 20, y: 20, w: 100, h: 20, font_size: 14 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.font_size).toBe(14);
        });
    });

    // ── Rule 7: Proportional Guard ──

    describe('proportional guard', () => {
        it('shrinks element exceeding 95% of canvas width', () => {
            const els = [makeEl({ type: 'rect', name: 'accent', x: 0, y: 0, w: 295, h: 30 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.w).toBeLessThanOrEqual(Math.round(300 * 0.95));
        });

        it('allows background to be full canvas', () => {
            const els = [makeEl({ type: 'rect', name: 'background', x: 0, y: 0, w: 300, h: 250 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.w).toBe(300);
        });

        it('allows overlay elements to be large', () => {
            const els = [makeEl({ type: 'rect', name: 'text_overlay', x: 0, y: 125, w: 300, h: 125 })];
            const result = validateLayout(els, 300, 250);
            expect(result.elements[0]!.w).toBe(300);
        });
    });

    // ── Integration: Full Layout ──

    describe('full layout validation', () => {
        it('validates a well-formed layout cleanly', () => {
            const els: RenderElement[] = [
                { type: 'rect', name: 'background', x: 0, y: 0, w: 300, h: 250, gradient_start_hex: '#1a1f2e', gradient_end_hex: '#0d1117', gradient_angle: 180 },
                { type: 'text', name: 'tag_text', x: 24, y: 20, w: 252, h: 14, content: 'NEW', font_size: 10, font_weight: '600', color_hex: '#6366f1', text_align: 'center' },
                { type: 'text', name: 'headline', x: 24, y: 45, w: 252, h: 60, content: 'Bold Move', font_size: 30, font_weight: '800', color_hex: '#ffffff', text_align: 'center' },
                { type: 'text', name: 'subheadline', x: 40, y: 120, w: 220, h: 30, content: 'Professional solutions', font_size: 12, font_weight: '400', color_hex: '#94a3b8', text_align: 'center' },
                { type: 'rounded_rect', name: 'cta_button', x: 80, y: 175, w: 140, h: 36, r: 0.39, g: 0.4, b: 0.95, a: 1.0, radius: 8 },
                { type: 'text', name: 'cta_label', x: 80, y: 185, w: 140, h: 18, content: 'LEARN MORE', font_size: 12, font_weight: '700', color_hex: '#ffffff', text_align: 'center' },
            ];
            const result = validateLayout(els, 300, 250);
            // Should mostly be clean (maybe minor CTA vertical centering fix)
            expect(result.elements.length).toBe(6);
            expect(result.elements[0]!.name).toBe('background');
        });

        it('does not mutate original array', () => {
            const els: RenderElement[] = [
                { type: 'text', name: 'headline', x: -10, y: -10, w: 100, h: 30, font_size: 24 },
            ];
            const origX = els[0]!.x;
            validateLayout(els, 300, 250);
            expect(els[0]!.x).toBe(origX); // Original should not change
        });
    });
});
