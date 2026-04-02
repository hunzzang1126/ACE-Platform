// ─────────────────────────────────────────────────
// lottieExporter.test.ts — Lottie JSON export tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { exportToLottie } from './lottieExporter';
import type { LottieExportOptions } from './lottieExporter';

const defaultOptions: LottieExportOptions = {
    width: 300,
    height: 250,
    fps: 30,
    name: 'Test Export',
};

const shapes = [
    {
        nodeId: 1, type: 'rect' as const,
        x: 0, y: 0, width: 300, height: 250,
        color: [0, 0, 0, 1] as [number, number, number, number],
        borderRadius: 0, opacity: 1,
    },
    {
        nodeId: 2, type: 'rect' as const,
        x: 20, y: 30, width: 260, height: 40,
        color: [1, 1, 1, 1] as [number, number, number, number],
        borderRadius: 8, opacity: 1,
    },
    {
        nodeId: 3, type: 'ellipse' as const,
        x: 120, y: 100, width: 60, height: 60,
        color: [1, 0, 0, 1] as [number, number, number, number],
        opacity: 0.8,
    },
];

describe('lottieExporter', () => {
    describe('exportToLottie', () => {
        it('should produce valid Lottie structure', () => {
            const lottie = exportToLottie(shapes, [], 5, defaultOptions) as any;
            expect(lottie.v).toBe('5.7.0');
            expect(lottie.fr).toBe(30);
            expect(lottie.w).toBe(300);
            expect(lottie.h).toBe(250);
            expect(lottie.nm).toBe('Test Export');
        });

        it('should calculate total frames from duration + fps', () => {
            const lottie = exportToLottie(shapes, [], 3, defaultOptions) as any;
            expect(lottie.op).toBe(90); // 3s * 30fps
        });

        it('should create a layer per shape', () => {
            const lottie = exportToLottie(shapes, [], 5, defaultOptions) as any;
            expect(lottie.layers).toHaveLength(3);
        });

        it('should reverse layer order (Lottie convention)', () => {
            const lottie = exportToLottie(shapes, [], 5, defaultOptions) as any;
            // First shape (bg) should be last in Lottie layer array
            expect(lottie.layers[2].nm).toBe('Layer 1');
            expect(lottie.layers[0].nm).toBe('Layer 3');
        });

        it('should set layer type to 4 (shape layer)', () => {
            const lottie = exportToLottie(shapes, [], 5, defaultOptions) as any;
            for (const layer of lottie.layers) {
                expect(layer.ty).toBe(4);
            }
        });

        it('should build rect content for rect shapes', () => {
            const lottie = exportToLottie([shapes[1]], [], 5, defaultOptions) as any;
            const shapeContent = lottie.layers[0].shapes[0];
            expect(shapeContent.ty).toBe('gr');
            const rect = shapeContent.it.find((i: any) => i.ty === 'rc');
            expect(rect).toBeDefined();
        });

        it('should build ellipse content for ellipse shapes', () => {
            const lottie = exportToLottie([shapes[2]], [], 5, defaultOptions) as any;
            const shapeContent = lottie.layers[0].shapes[0];
            const ellipse = shapeContent.it.find((i: any) => i.ty === 'el');
            expect(ellipse).toBeDefined();
        });

        it('should include border radius for rect', () => {
            const lottie = exportToLottie([shapes[1]], [], 5, defaultOptions) as any;
            const rect = lottie.layers[0].shapes[0].it.find((i: any) => i.ty === 'rc');
            expect(rect.r.k).toBe(8);
        });

        it('should include fill color', () => {
            const lottie = exportToLottie([shapes[0]], [], 5, defaultOptions) as any;
            const fill = lottie.layers[0].shapes[0].it.find((i: any) => i.ty === 'fl');
            expect(fill.c.k).toEqual([0, 0, 0, 1]);
        });

        it('should set opacity from shape', () => {
            const lottie = exportToLottie([shapes[2]], [], 5, defaultOptions) as any;
            // Opacity should be in shape's ks.o property (percentage)
            expect(lottie.layers[0].ks.o.k).toBe(80); // 0.8 * 100
        });

        it('should set center-based position', () => {
            const lottie = exportToLottie([shapes[1]], [], 5, defaultOptions) as any;
            // Rect at (20,30) with w=260 h=40 → center = (150, 50)
            expect(lottie.layers[0].ks.p.k).toEqual([150, 50, 0]);
        });
    });

    describe('with keyframes', () => {
        it('should animate position', () => {
            const kfs = [
                { nodeId: 2, property: 'x', time: 0, value: -100, easing: 'ease_out' },
                { nodeId: 2, property: 'x', time: 0.5, value: 0, easing: 'ease_out' },
            ];
            const lottie = exportToLottie([shapes[1]], kfs, 5, defaultOptions) as any;
            // Position should be animated (a=1)
            const pos = lottie.layers[0].ks.p;
            expect(pos.a).toBe(1);
            expect(pos.k.length).toBeGreaterThan(0);
        });

        it('should animate opacity', () => {
            const kfs = [
                { nodeId: 2, property: 'opacity', time: 0, value: 0, easing: 'ease_out' },
                { nodeId: 2, property: 'opacity', time: 0.5, value: 1, easing: 'ease_out' },
            ];
            const lottie = exportToLottie([shapes[1]], kfs, 5, defaultOptions) as any;
            const opacity = lottie.layers[0].ks.o;
            expect(opacity.a).toBe(1);
        });
    });

    describe('edge cases', () => {
        it('should handle empty shapes', () => {
            const lottie = exportToLottie([], [], 5, defaultOptions) as any;
            expect(lottie.layers).toHaveLength(0);
        });

        it('should handle zero duration', () => {
            const lottie = exportToLottie(shapes, [], 0, defaultOptions) as any;
            expect(lottie.op).toBe(0);
        });

        it('should use default name when not provided', () => {
            const lottie = exportToLottie(shapes, [], 5, { width: 300, height: 250, fps: 30 }) as any;
            expect(lottie.nm).toBe('Glid Export');
        });
    });
});
