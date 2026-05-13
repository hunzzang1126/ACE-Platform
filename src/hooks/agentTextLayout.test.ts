// ─────────────────────────────────────────────────
// agentTextLayout.test.ts — Text sizing + overlap prevention
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { recalcTextHeights, estimateTextHeight, autoCreateSubheadline } from './agentTextLayout';

// ══════════════════════════════════════════════════
// estimateTextHeight
// ══════════════════════════════════════════════════
describe('estimateTextHeight — line estimation', () => {
    it('returns single-line height for short text', () => {
        const h = estimateTextHeight('Hello', 24, 300, false);
        // 5 chars × 12px = 60px → 1 line → 24 * 1.45 * 1 + 8 = 42.8 ≈ 43
        expect(h).toBeGreaterThan(30);
        expect(h).toBeLessThan(50);
    });

    it('returns multi-line height for long text', () => {
        const h = estimateTextHeight('Adventure Awaits With Your Favorite Minions Are Here', 48, 300, true);
        // Bold 48px → charW = 31.2px, 300/31.2 ≈ 9 chars/line → 54/9 = 6 lines
        expect(h).toBeGreaterThan(200);
    });

    it('bold text has wider characters', () => {
        const boldH = estimateTextHeight('Same text here', 24, 300, true);
        const normalH = estimateTextHeight('Same text here', 24, 300, false);
        expect(boldH).toBeGreaterThanOrEqual(normalH);
    });
});

// ══════════════════════════════════════════════════
// recalcTextHeights — auto-shrink + cascade
// ══════════════════════════════════════════════════
describe('recalcTextHeights — font auto-shrink', () => {
    it('shrinks font when text overflows bounding box', () => {
        const elements = [{
            type: 'text', name: 'headline', content: 'Adventure Awaits With Your Favorite Minions Today',
            font_size: 48, font_weight: '800', w: 300, h: 80, y: 50,
        }];
        recalcTextHeights(elements, 500);
        expect(elements[0].font_size).toBeLessThan(48);
        expect(elements[0].font_size).toBeGreaterThanOrEqual(12);
    });

    it('does NOT shrink when text fits', () => {
        const elements = [{
            type: 'text', name: 'headline', content: 'Hi',
            font_size: 48, font_weight: '800', w: 300, h: 200, y: 50,
        }];
        recalcTextHeights(elements, 500);
        expect(elements[0].font_size).toBe(48);
    });

    it('skips non-text elements', () => {
        const elements = [{ type: 'rect', name: 'bg', w: 300, h: 50 }];
        recalcTextHeights(elements, 500);
        // No error, no mutation
        expect(elements[0].type).toBe('rect');
    });
});

describe('recalcTextHeights — cascade-push overlap prevention', () => {
    it('★ REGRESSION v739: pushes subheadline below headline when overlap detected', () => {
        const elements = [
            { type: 'text', name: 'headline', content: 'A Long Headline That Wraps Multiple Lines',
              font_size: 36, font_weight: '800', w: 300, h: 80, y: 50 },
            { type: 'text', name: 'subheadline', content: 'Short sub',
              font_size: 18, font_weight: '400', w: 300, h: 40, y: 90 },
        ];
        recalcTextHeights(elements, 500);
        const headlineBottom = elements[0].y + estimateTextHeight(elements[0].content, elements[0].font_size, elements[0].w, true);
        // Subheadline Y must be BELOW headline bottom
        expect(elements[1].y).toBeGreaterThanOrEqual(headlineBottom);
    });

    it('does not push when elements already have enough space', () => {
        const elements = [
            { type: 'text', name: 'headline', content: 'Short',
              font_size: 24, font_weight: '400', w: 300, h: 40, y: 50 },
            { type: 'text', name: 'subheadline', content: 'Also short',
              font_size: 16, font_weight: '400', w: 300, h: 30, y: 200 },
        ];
        recalcTextHeights(elements, 500);
        // y should not change — already far apart
        expect(elements[1].y).toBe(200);
    });
});

// ══════════════════════════════════════════════════
// autoCreateSubheadline
// ══════════════════════════════════════════════════
describe('autoCreateSubheadline — dynamic creation', () => {
    it('creates a subheadline element below the headline', () => {
        const elements = [{
            type: 'text', name: 'headline', content: 'Test Headline',
            font_size: 36, font_weight: '800', w: 300, h: 60, y: 80, x: 20,
            text_align: 'left', color_hex: '#FFFFFF',
        }];
        const content = { headline: 'Test Headline', subheadline: 'This is the subheadline text' };
        autoCreateSubheadline(elements, content, 500, 500);
        expect(elements).toHaveLength(2);
        const sub = elements[1];
        expect(sub.name).toBe('subheadline');
        expect(sub.content).toBe('This is the subheadline text');
        expect(sub.y).toBeGreaterThan(80); // Below headline
        expect(sub.color_hex).toBe('#FFFFFF'); // Inherits from headline
    });
});
