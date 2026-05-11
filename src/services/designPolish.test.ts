// ─────────────────────────────────────────────────
// designPolish.test.ts — Post-render quality auto-fixes
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { polishDesign } from './designPolish';
import type { RenderElement } from './autoDesignTypes';

describe('polishDesign — contrast fixes', () => {
    it('flips dark text to white on dark backgrounds', () => {
        const els: RenderElement[] = [
            { type: 'text', x: 0, y: 0, w: 300, h: 50, color_hex: '#333333', name: 'headline', content: 'Test' },
        ];
        const { elements, fixes } = polishDesign(els, 300, 250, '#0B0F1A');
        expect(elements[0].color_hex).toBe('#FFFFFF');
        expect(fixes.length).toBe(1);
        expect(fixes[0]).toContain('Contrast fix');
    });

    it('flips light text to dark on light backgrounds', () => {
        const els: RenderElement[] = [
            { type: 'text', x: 0, y: 0, w: 300, h: 50, color_hex: '#E0E0E0', name: 'headline', content: 'Test' },
        ];
        const { elements, fixes } = polishDesign(els, 300, 250, '#F0F2F5');
        expect(elements[0].color_hex).toBe('#1A1A2E');
        expect(fixes.length).toBe(1);
    });

    it('leaves good contrast untouched', () => {
        const els: RenderElement[] = [
            { type: 'text', x: 0, y: 0, w: 300, h: 50, color_hex: '#FFFFFF', name: 'headline', content: 'Test' },
        ];
        const { elements, fixes } = polishDesign(els, 300, 250, '#0B0F1A');
        expect(elements[0].color_hex).toBe('#FFFFFF');
        expect(fixes.length).toBe(0);
    });
});

describe('polishDesign — overflow guard', () => {
    it('clamps text width when exceeding canvas', () => {
        const els: RenderElement[] = [
            { type: 'text', x: 50, y: 0, w: 400, h: 50, name: 'headline', content: 'Test' },
        ];
        const { elements, fixes } = polishDesign(els, 300, 250, '#0B0F1A');
        expect(elements[0].w).toBeLessThanOrEqual(250);
        expect(fixes.some(f => f.includes('Overflow'))).toBe(true);
    });

    it('clamps text height when exceeding canvas', () => {
        const els: RenderElement[] = [
            { type: 'text', x: 0, y: 200, w: 100, h: 100, name: 'sub', content: 'Test' },
        ];
        const { elements, fixes } = polishDesign(els, 300, 250, '#0B0F1A');
        expect(elements[0].h).toBeLessThanOrEqual(50);
    });
});

describe('polishDesign — CTA minimum sizing', () => {
    it('enforces minimum button width of 80px', () => {
        const els: RenderElement[] = [
            { type: 'rounded_rect', x: 100, y: 200, w: 50, h: 40, name: 'cta_button', radius: 8 },
        ];
        const { elements, fixes } = polishDesign(els, 300, 250, '#0B0F1A');
        expect(elements[0].w).toBeGreaterThanOrEqual(80);
        expect(fixes.some(f => f.includes('CTA fix'))).toBe(true);
    });

    it('enforces minimum button height of 30px', () => {
        const els: RenderElement[] = [
            { type: 'rounded_rect', x: 100, y: 200, w: 120, h: 20, name: 'cta_button', radius: 8 },
        ];
        const { elements, fixes } = polishDesign(els, 300, 250, '#0B0F1A');
        expect(elements[0].h).toBeGreaterThanOrEqual(30);
    });

    it('does not touch non-CTA rounded rects', () => {
        const els: RenderElement[] = [
            { type: 'rounded_rect', x: 0, y: 0, w: 50, h: 20, name: 'accent_zone', radius: 4 },
        ];
        const { elements, fixes } = polishDesign(els, 300, 250, '#0B0F1A');
        expect(elements[0].w).toBe(50);
        expect(fixes.length).toBe(0);
    });
});

describe('polishDesign — no false positives', () => {
    it('returns empty fixes for valid design', () => {
        const els: RenderElement[] = [
            { type: 'rect', x: 0, y: 0, w: 300, h: 250, name: 'background' },
            { type: 'text', x: 20, y: 50, w: 260, h: 40, color_hex: '#FFFFFF', name: 'headline', content: 'Sale' },
            { type: 'rounded_rect', x: 80, y: 180, w: 140, h: 40, name: 'cta_button', radius: 8, r: 0.3, g: 0.5, b: 1.0 },
        ];
        const { fixes } = polishDesign(els, 300, 250, '#0B0F1A');
        expect(fixes.length).toBe(0);
    });
});
