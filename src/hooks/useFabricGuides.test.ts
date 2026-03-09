// ─────────────────────────────────────────────────
// useFabricGuides.test — Smart guides & snapping tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { snapToGuides } from './useFabricGuides';

describe('snapToGuides', () => {
    const canvasW = 300;
    const canvasH = 250;

    it('snaps to canvas center X', () => {
        // Element center at 152 (within 4px of 150)
        const result = snapToGuides(
            { x: 102, y: 50, w: 100, h: 50 },
            [], canvasW, canvasH,
        );
        expect(result.x).toBe(100); // snaps x so center = 150
        expect(result.guides.some(g => g.type === 'canvas-center' && g.axis === 'vertical')).toBe(true);
    });

    it('snaps to canvas center Y', () => {
        // Element center at 127 (within 4px of 125)
        const result = snapToGuides(
            { x: 50, y: 102, w: 50, h: 50 },
            [], canvasW, canvasH,
        );
        expect(result.y).toBe(100); // snaps y so center = 125
    });

    it('snaps to canvas left edge', () => {
        const result = snapToGuides(
            { x: 2, y: 50, w: 100, h: 50 },
            [], canvasW, canvasH,
        );
        expect(result.x).toBe(0);
    });

    it('snaps to canvas top edge', () => {
        const result = snapToGuides(
            { x: 50, y: 3, w: 100, h: 50 },
            [], canvasW, canvasH,
        );
        expect(result.y).toBe(0);
    });

    it('snaps to other element edge', () => {
        const result = snapToGuides(
            { x: 102, y: 50, w: 80, h: 40 },
            [{ x: 100, y: 20, w: 60, h: 30 }],
            canvasW, canvasH,
        );
        expect(result.x).toBe(100); // snaps to other.x = 100
    });

    it('returns null when no snap target is close', () => {
        const result = snapToGuides(
            { x: 50, y: 50, w: 80, h: 40 },
            [{ x: 200, y: 200, w: 60, h: 30 }],
            canvasW, canvasH,
        );
        expect(result.x).toBeNull();
        expect(result.y).toBeNull();
    });

    it('respects custom threshold', () => {
        // 8px threshold — wider snap zone
        // Element at x=207, other at x=200: distance=7, within threshold=8
        // (center=247, far from canvas center 150)
        const result = snapToGuides(
            { x: 207, y: 50, w: 80, h: 40 },
            [{ x: 200, y: 20, w: 60, h: 30 }],
            canvasW, canvasH, 8,
        );
        expect(result.x).toBe(200);
    });

    it('returns guide lines for rendering', () => {
        const result = snapToGuides(
            { x: 2, y: 50, w: 100, h: 50 },
            [], canvasW, canvasH,
        );
        expect(result.guides.length).toBeGreaterThan(0);
        expect(result.guides[0]!.axis).toBe('vertical');
    });
});
