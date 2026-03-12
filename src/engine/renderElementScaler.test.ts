// ─────────────────────────────────────────────────
// renderElementScaler.test.ts — Unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { scaleRenderElements } from './renderElementScaler';
import type { RenderElement } from '@/services/autoDesignService';

// Helper: make a minimal element
function makeEl(overrides: Partial<RenderElement> & { name: string }): RenderElement {
    return { type: 'rect', x: 0, y: 0, w: 100, h: 50, ...overrides };
}

describe('renderElementScaler', () => {
    const MASTER_W = 300, MASTER_H = 250;

    // ── Identity Scaling ──

    describe('identity scaling', () => {
        it('returns identical elements for same dimensions', () => {
            const els = [makeEl({ name: 'bg', x: 10, y: 20, w: 100, h: 50 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, MASTER_W, MASTER_H);
            expect(result[0]!.x).toBe(10);
            expect(result[0]!.y).toBe(20);
            expect(result[0]!.w).toBe(100);
            expect(result[0]!.h).toBe(50);
        });

        it('returns deep copies (no mutation)', () => {
            const els = [makeEl({ name: 'test', x: 10, y: 20 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, MASTER_W, MASTER_H);
            result[0]!.x = 999;
            expect(els[0]!.x).toBe(10); // Original unchanged
        });
    });

    // ── Background Handling ──

    describe('background handling', () => {
        it('always fills target canvas for background element', () => {
            const els = [makeEl({ name: 'background', x: 0, y: 0, w: 300, h: 250 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 728, 90);
            expect(result[0]!.x).toBe(0);
            expect(result[0]!.y).toBe(0);
            expect(result[0]!.w).toBe(728);
            expect(result[0]!.h).toBe(90);
        });

        it('fills target even for 160x600', () => {
            const els = [makeEl({ name: 'background', x: 0, y: 0, w: 300, h: 250 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 160, 600);
            expect(result[0]!.w).toBe(160);
            expect(result[0]!.h).toBe(600);
        });
    });

    // ── Proportional Scaling ──

    describe('proportional scaling', () => {
        it('scales position proportionally (2x width)', () => {
            const els = [makeEl({ name: 'headline', x: 30, y: 50 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 600, 250);
            expect(result[0]!.x).toBe(60); // 30 * (600/300) = 60
        });

        it('scales position proportionally (2x height)', () => {
            const els = [makeEl({ name: 'headline', x: 30, y: 50 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 300, 500);
            expect(result[0]!.y).toBe(100); // 50 * (500/250) = 100
        });

        it('scales width and height proportionally', () => {
            const els = [makeEl({ name: 'accent', x: 0, y: 0, w: 150, h: 50 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 600, 500);
            expect(result[0]!.w).toBe(300); // 150 * (600/300) = 300
            expect(result[0]!.h).toBe(100); // 50 * (500/250) = 100
        });
    });

    // ── Font Size Scaling ──

    describe('font size scaling', () => {
        it('scales font size by smaller dimension ratio', () => {
            const els = [makeEl({ name: 'headline', type: 'text', font_size: 24 })];
            // Scale 300x250 → 600x500 (both 2x)
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 600, 500);
            expect(result[0]!.font_size).toBe(48); // 24 * 2.0 = 48
        });

        it('scales font by smaller ratio when asymmetric', () => {
            const els = [makeEl({ name: 'headline', type: 'text', font_size: 24 })];
            // Scale 300x250 → 150x250 (0.5x width, 1x height) → scaleFont = min(0.5, 1.0) = 0.5
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 150, 250);
            expect(result[0]!.font_size).toBe(12); // 24 * 0.5 = 12
        });

        it('enforces minimum font size of 8', () => {
            const els = [makeEl({ name: 'tiny', type: 'text', font_size: 10 })];
            // Scale down 10x → 10 * 0.1 = 1 → clamped to 8
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 30, 25);
            expect(result[0]!.font_size).toBe(8);
        });

        it('enforces maximum font size of 80', () => {
            const els = [makeEl({ name: 'huge', type: 'text', font_size: 50 })];
            // Scale up 5x → 50 * 5 = 250 → clamped to 80
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 1500, 1250);
            expect(result[0]!.font_size).toBe(80);
        });

        it('respects custom min/max options', () => {
            const els = [makeEl({ name: 'small', type: 'text', font_size: 10 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 30, 25, {
                minFontSize: 6,
                maxFontSize: 60,
            });
            expect(result[0]!.font_size).toBeGreaterThanOrEqual(6);
        });
    });

    // ── Radius Scaling ──

    describe('radius scaling', () => {
        it('scales border radius proportionally', () => {
            const els = [makeEl({ name: 'cta', type: 'rounded_rect', radius: 8 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 600, 500);
            expect(result[0]!.radius).toBe(16); // 8 * 2.0 = 16
        });

        it('enforces minimum radius of 2', () => {
            const els = [makeEl({ name: 'cta', type: 'rounded_rect', radius: 6 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 30, 25);
            expect(result[0]!.radius).toBeGreaterThanOrEqual(2);
        });
    });

    // ── Shadow Scaling ──

    describe('shadow scaling', () => {
        it('scales shadow blur proportionally', () => {
            const els = [makeEl({ name: 'box', shadow_blur: 10, shadow_offset_x: 2, shadow_offset_y: 4 })];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 600, 500);
            expect(result[0]!.shadow_blur).toBe(20); // 10 * 2.0
            expect(result[0]!.shadow_offset_x).toBe(4); // 2 * 2.0
            expect(result[0]!.shadow_offset_y).toBe(8); // 4 * 2.0
        });
    });

    // ── Multi-Element Array ──

    describe('multi-element arrays', () => {
        it('scales all elements in array', () => {
            const els = [
                makeEl({ name: 'background', x: 0, y: 0, w: 300, h: 250 }),
                makeEl({ name: 'headline', type: 'text', x: 24, y: 50, w: 252, h: 40, font_size: 28 }),
                makeEl({ name: 'cta_button', type: 'rounded_rect', x: 80, y: 200, w: 140, h: 36, radius: 6 }),
            ];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 600, 500);
            expect(result.length).toBe(3);
            expect(result[0]!.w).toBe(600); // bg fills target
            expect(result[1]!.x).toBe(48); // 24 * 2
            expect(result[2]!.x).toBe(160); // 80 * 2
        });

        it('preserves element order', () => {
            const els = [
                makeEl({ name: 'background' }),
                makeEl({ name: 'headline' }),
                makeEl({ name: 'cta_button' }),
            ];
            const result = scaleRenderElements(els, MASTER_W, MASTER_H, 600, 500);
            expect(result.map(e => e.name)).toEqual(['background', 'headline', 'cta_button']);
        });
    });
});
