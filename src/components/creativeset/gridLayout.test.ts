// ─────────────────────────────────────────────────
// gridLayout.test.ts — Area-proportional sizing + flow layout
// ─────────────────────────────────────────────────
// ★ v729: Tests for the proportional card sizing and flow layout engine

import { describe, it, expect } from 'vitest';
import { getCardDisplaySize, computeAutoPositions, BASE_AREA, GRID_GAP, CARD_CHROME_H } from './gridLayout';

// ══════════════════════════════════════════════════
// getCardDisplaySize — area-proportional sizing
// ══════════════════════════════════════════════════
describe('getCardDisplaySize — area-proportional card sizing', () => {
    it('preserves aspect ratio for square canvas (1080x1080)', () => {
        const { dw, dh } = getCardDisplaySize(1080, 1080, 1.0);
        expect(dw).toBe(dh); // Square → equal width and height
    });

    it('1920x1080 landscape appears WIDER than 1080x1080 square', () => {
        const landscape = getCardDisplaySize(1920, 1080, 1.0);
        const square = getCardDisplaySize(1080, 1080, 1.0);
        expect(landscape.dw).toBeGreaterThan(square.dw);
    });

    it('1080x1350 portrait appears TALLER than 1080x1080 square', () => {
        const portrait = getCardDisplaySize(1080, 1350, 1.0);
        const square = getCardDisplaySize(1080, 1080, 1.0);
        expect(portrait.dh).toBeGreaterThan(square.dh);
    });

    it('1080x1350 portrait appears NARROWER than 1080x1080 square', () => {
        const portrait = getCardDisplaySize(1080, 1350, 1.0);
        const square = getCardDisplaySize(1080, 1080, 1.0);
        expect(portrait.dw).toBeLessThan(square.dw);
    });

    it('all cards have roughly equal visual area at same zoom', () => {
        const square = getCardDisplaySize(1080, 1080, 1.0);
        const landscape = getCardDisplaySize(1920, 1080, 1.0);
        const portrait = getCardDisplaySize(1080, 1350, 1.0);

        const sqArea = square.dw * square.dh;
        const lsArea = landscape.dw * landscape.dh;
        const ptArea = portrait.dw * portrait.dh;

        // Areas should be within 5% of BASE_AREA (rounding tolerance)
        expect(Math.abs(sqArea - BASE_AREA)).toBeLessThan(BASE_AREA * 0.05);
        expect(Math.abs(lsArea - BASE_AREA)).toBeLessThan(BASE_AREA * 0.05);
        expect(Math.abs(ptArea - BASE_AREA)).toBeLessThan(BASE_AREA * 0.05);
    });

    it('zoom=2 scales area by 4x (zoom²)', () => {
        const z1 = getCardDisplaySize(1080, 1080, 1.0);
        const z2 = getCardDisplaySize(1080, 1080, 2.0);
        const area1 = z1.dw * z1.dh;
        const area2 = z2.dw * z2.dh;
        // area2 should be ~4x area1
        expect(area2 / area1).toBeCloseTo(4.0, 0);
    });

    it('zoom=0.5 scales area by 0.25x', () => {
        const z1 = getCardDisplaySize(1080, 1080, 1.0);
        const zHalf = getCardDisplaySize(1080, 1080, 0.5);
        const area1 = z1.dw * z1.dh;
        const areaHalf = zHalf.dw * zHalf.dh;
        expect(areaHalf / area1).toBeCloseTo(0.25, 0);
    });

    it('returns correct scale factor (dw / original_width)', () => {
        const result = getCardDisplaySize(1080, 1080, 1.0);
        expect(result.scale).toBeCloseTo(result.dw / 1080, 2);
    });

    it('handles extreme aspect ratio (160x600 skyscraper)', () => {
        const { dw, dh, scale } = getCardDisplaySize(160, 600, 1.0);
        expect(dh).toBeGreaterThan(dw); // Very tall
        expect(dh / dw).toBeCloseTo(600 / 160, 0); // Aspect ratio preserved
        expect(scale).toBeGreaterThan(0);
    });

    it('handles extreme landscape (970x250 leaderboard)', () => {
        const { dw, dh } = getCardDisplaySize(970, 250, 1.0);
        expect(dw).toBeGreaterThan(dh); // Very wide
        expect(dw / dh).toBeCloseTo(970 / 250, 0); // Aspect ratio preserved
    });
});

// ══════════════════════════════════════════════════
// computeAutoPositions — flow layout
// ══════════════════════════════════════════════════
describe('computeAutoPositions — flow layout', () => {
    it('places first card at (0, 0)', () => {
        const cards = [{ id: 'a', w: 200, h: 150 }];
        const positions = computeAutoPositions(cards, 1.0, 800);
        expect(positions['a']).toEqual({ x: 0, y: 0 });
    });

    it('places second card to the right of first', () => {
        const cards = [
            { id: 'a', w: 200, h: 150 },
            { id: 'b', w: 200, h: 150 },
        ];
        const positions = computeAutoPositions(cards, 1.0, 800);
        expect(positions['b']!.x).toBe(200 + GRID_GAP);
        expect(positions['b']!.y).toBe(0); // Same row
    });

    it('wraps to next row when exceeding maxRowWidth', () => {
        const cards = [
            { id: 'a', w: 400, h: 150 },
            { id: 'b', w: 400, h: 150 },
            { id: 'c', w: 400, h: 150 }, // Would exceed 800px
        ];
        const positions = computeAutoPositions(cards, 1.0, 800);
        expect(positions['c']!.x).toBe(0); // Wrapped
        expect(positions['c']!.y).toBeGreaterThan(0); // New row
    });

    it('row height is determined by tallest card in row', () => {
        const cards = [
            { id: 'a', w: 200, h: 100 },
            { id: 'b', w: 200, h: 300 }, // Tallest
            { id: 'c', w: 200, h: 100 }, // Still fits in same row
            { id: 'd', w: 600, h: 100 }, // Wraps to next row
        ];
        const positions = computeAutoPositions(cards, 1.0, 700);
        // d should be on next row, y = tallest in row 1 (300 + CARD_CHROME_H) + GRID_GAP
        expect(positions['d']!.y).toBe(300 + CARD_CHROME_H + GRID_GAP);
    });

    it('★ REGRESSION: no two cards overlap at zoom=1', () => {
        const cards = [
            { id: 'sq', w: 264, h: 264 },   // 1080x1080
            { id: 'ls', w: 352, h: 198 },   // 1920x1080
            { id: 'pt', w: 237, h: 296 },   // 1080x1350
            { id: 'banner', w: 400, h: 103 }, // 970x250
        ];
        const positions = computeAutoPositions(cards, 1.0, 1200);

        for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
                const a = { ...positions[cards[i].id]!, w: cards[i].w, h: cards[i].h + CARD_CHROME_H };
                const b = { ...positions[cards[j].id]!, w: cards[j].w, h: cards[j].h + CARD_CHROME_H };
                const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
                const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
                expect(overlapX && overlapY).toBe(false);
            }
        }
    });

    it('★ REGRESSION: no overlap at zoom=2 (stress test)', () => {
        // At zoom=2, cards are ~4x area. Must not overlap.
        const cards = [
            { id: 'sq', w: 528, h: 528 },
            { id: 'ls', w: 704, h: 396 },
            { id: 'pt', w: 474, h: 592 },
        ];
        const positions = computeAutoPositions(cards, 2.0, 1200);

        for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
                const a = { ...positions[cards[i].id]!, w: cards[i].w, h: cards[i].h + CARD_CHROME_H };
                const b = { ...positions[cards[j].id]!, w: cards[j].w, h: cards[j].h + CARD_CHROME_H };
                const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
                const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
                expect(overlapX && overlapY).toBe(false);
            }
        }
    });

    it('handles empty card list', () => {
        const positions = computeAutoPositions([], 1.0, 800);
        expect(Object.keys(positions)).toHaveLength(0);
    });

    it('handles single very wide card (wider than maxRowWidth)', () => {
        const cards = [{ id: 'wide', w: 1500, h: 100 }];
        const positions = computeAutoPositions(cards, 1.0, 800);
        // Should still place at (0, 0) even though wider than max
        expect(positions['wide']).toEqual({ x: 0, y: 0 });
    });
});
