// ─────────────────────────────────────────────────
// alignElements.test.ts — Multi-select alignment tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { computeAlignment } from './alignElements';
import type { ElementBounds } from './alignElements';

// ── Test fixtures ──
const threeBoxes: ElementBounds[] = [
    { id: 1, x: 10, y: 20, w: 100, h: 50 },
    { id: 2, x: 200, y: 80, w: 60, h: 40 },
    { id: 3, x: 120, y: 150, w: 80, h: 30 },
];

const twoBoxes: ElementBounds[] = [
    { id: 1, x: 0, y: 0, w: 100, h: 100 },
    { id: 2, x: 200, y: 200, w: 50, h: 50 },
];

describe('computeAlignment', () => {
    // ── Edge cases ──
    it('returns empty for fewer than 2 elements', () => {
        expect(computeAlignment([], 'left')).toEqual([]);
        expect(computeAlignment([{ id: 1, x: 0, y: 0, w: 10, h: 10 }], 'left')).toEqual([]);
    });

    // ── Align Left ──
    describe('align left', () => {
        it('snaps all elements to the leftmost x', () => {
            const result = computeAlignment(threeBoxes, 'left');
            expect(result).toHaveLength(3);
            expect(result.every(r => r.x === 10)).toBe(true);
        });

        it('preserves y positions', () => {
            const result = computeAlignment(threeBoxes, 'left');
            expect(result.find(r => r.id === 1)!.y).toBe(20);
            expect(result.find(r => r.id === 2)!.y).toBe(80);
            expect(result.find(r => r.id === 3)!.y).toBe(150);
        });
    });

    // ── Align Right ──
    describe('align right', () => {
        it('snaps all right edges to the rightmost right edge', () => {
            const result = computeAlignment(threeBoxes, 'right');
            // Rightmost = 200 + 60 = 260
            expect(result.find(r => r.id === 1)!.x).toBe(260 - 100); // 160
            expect(result.find(r => r.id === 2)!.x).toBe(260 - 60);  // 200
            expect(result.find(r => r.id === 3)!.x).toBe(260 - 80);  // 180
        });
    });

    // ── Align Center H ──
    describe('align center-h', () => {
        it('centers all elements horizontally within group', () => {
            const result = computeAlignment(twoBoxes, 'center-h');
            // Group: left=0, right=250, center=125
            expect(result.find(r => r.id === 1)!.x).toBe(125 - 50);  // 75
            expect(result.find(r => r.id === 2)!.x).toBe(125 - 25);  // 100
        });
    });

    // ── Align Top ──
    describe('align top', () => {
        it('snaps all elements to the topmost y', () => {
            const result = computeAlignment(threeBoxes, 'top');
            expect(result.every(r => r.y === 20)).toBe(true);
        });

        it('preserves x positions', () => {
            const result = computeAlignment(threeBoxes, 'top');
            expect(result.find(r => r.id === 1)!.x).toBe(10);
            expect(result.find(r => r.id === 2)!.x).toBe(200);
            expect(result.find(r => r.id === 3)!.x).toBe(120);
        });
    });

    // ── Align Bottom ──
    describe('align bottom', () => {
        it('snaps all bottom edges to the lowest bottom edge', () => {
            const result = computeAlignment(threeBoxes, 'bottom');
            // Bottommost = 150 + 30 = 180
            expect(result.find(r => r.id === 1)!.y).toBe(180 - 50);  // 130
            expect(result.find(r => r.id === 2)!.y).toBe(180 - 40);  // 140
            expect(result.find(r => r.id === 3)!.y).toBe(180 - 30);  // 150
        });
    });

    // ── Align Center V ──
    describe('align center-v', () => {
        it('centers all elements vertically within group', () => {
            const result = computeAlignment(twoBoxes, 'center-v');
            // Group: top=0, bottom=250, center=125
            expect(result.find(r => r.id === 1)!.y).toBe(125 - 50);  // 75
            expect(result.find(r => r.id === 2)!.y).toBe(125 - 25);  // 100
        });
    });

    // ── Distribute Horizontal ──
    describe('distribute-h', () => {
        it('distributes elements with equal horizontal spacing', () => {
            const boxes: ElementBounds[] = [
                { id: 1, x: 0, y: 0, w: 40, h: 20 },
                { id: 2, x: 100, y: 0, w: 40, h: 20 },
                { id: 3, x: 200, y: 0, w: 40, h: 20 },
            ];
            const result = computeAlignment(boxes, 'distribute-h');
            // Group: 0 to 240, totalWidth=120, space=120, gap=60
            const sorted = result.sort((a, b) => a.x - b.x);
            expect(sorted[0].x).toBe(0);
            expect(sorted[1].x).toBe(100);  // 0 + 40 + 60
            expect(sorted[2].x).toBe(200);  // 100 + 40 + 60
        });

        it('handles 2 elements (no distribute needed)', () => {
            const result = computeAlignment(twoBoxes, 'distribute-h');
            expect(result).toHaveLength(2);
            const sorted = result.sort((a, b) => a.x - b.x);
            // First stays at 0, second stays at 200 (gap = 100)
            expect(sorted[0].x).toBe(0);
            expect(sorted[1].x).toBe(200);
        });
    });

    // ── Distribute Vertical ──
    describe('distribute-v', () => {
        it('distributes elements with equal vertical spacing', () => {
            const boxes: ElementBounds[] = [
                { id: 1, x: 0, y: 0, w: 20, h: 30 },
                { id: 2, x: 0, y: 50, w: 20, h: 30 },
                { id: 3, x: 0, y: 200, w: 20, h: 30 },
            ];
            const result = computeAlignment(boxes, 'distribute-v');
            // Group: 0 to 230, totalHeight=90, space=140, gap=70
            const sorted = result.sort((a, b) => a.y - b.y);
            expect(sorted[0].y).toBe(0);
            expect(sorted[1].y).toBe(100);  // 0 + 30 + 70
            expect(sorted[2].y).toBe(200);  // 100 + 30 + 70
        });
    });

    // ── Unknown direction ──
    it('returns empty for unknown direction', () => {
        expect(computeAlignment(twoBoxes, 'unknown' as any)).toEqual([]);
    });

    // ── Identical positions ──
    it('handles elements at same position', () => {
        const samePos: ElementBounds[] = [
            { id: 1, x: 50, y: 50, w: 100, h: 100 },
            { id: 2, x: 50, y: 50, w: 100, h: 100 },
        ];
        const result = computeAlignment(samePos, 'left');
        expect(result.every(r => r.x === 50)).toBe(true);
    });

    // ── Varying sizes ──
    it('correctly aligns elements of different sizes', () => {
        const varied: ElementBounds[] = [
            { id: 1, x: 0, y: 0, w: 200, h: 200 },
            { id: 2, x: 300, y: 300, w: 10, h: 10 },
        ];
        const result = computeAlignment(varied, 'center-h');
        // Group center = (0 + 310) / 2 = 155
        expect(result.find(r => r.id === 1)!.x).toBe(155 - 100);  // 55
        expect(result.find(r => r.id === 2)!.x).toBe(155 - 5);    // 150
    });
});
