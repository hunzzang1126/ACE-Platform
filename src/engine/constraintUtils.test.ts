// ─────────────────────────────────────────────────
// constraintUtils.test.ts — Constraint conversion + color utilities
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/useAnimationPresets', () => ({
    useAnimPresetStore: {
        getState: () => ({
            presets: {
                'el-1': { anim: 'fade', animDuration: 0.5, startTime: 0 },
                'el-2': { anim: 'none', animDuration: 0, startTime: 0 },
            },
        }),
    },
}));

import {
    absoluteToConstraints,
    constraintsToAbsolute,
    rgbFloatToHex,
    hexToRgbFloat,
    resolveFontWeight,
    nodeTypeToShapeType,
    getAnimationForElement,
    cacheGradientData,
    getGradientCache,
    clearGradientCache,
} from './constraintUtils';

describe('constraintUtils', () => {
    // ── Constraint Roundtrip ──
    describe('absoluteToConstraints + constraintsToAbsolute', () => {
        it('should roundtrip left-top aligned element', () => {
            const c = absoluteToConstraints(10, 20, 100, 50, 300, 250);
            const abs = constraintsToAbsolute(c, 300, 250);
            expect(abs.x).toBe(10);
            expect(abs.y).toBe(20);
            expect(abs.w).toBe(100);
            expect(abs.h).toBe(50);
        });

        it('should roundtrip center-aligned element', () => {
            const c = absoluteToConstraints(100, 100, 100, 50, 300, 250);
            const abs = constraintsToAbsolute(c, 300, 250);
            expect(abs.x).toBe(100);
            expect(abs.y).toBe(100);
        });

        it('should roundtrip right-bottom element', () => {
            const c = absoluteToConstraints(190, 190, 100, 50, 300, 250);
            const abs = constraintsToAbsolute(c, 300, 250);
            expect(abs.x).toBe(190);
            expect(abs.y).toBe(190);
        });

        it('should roundtrip full-canvas element', () => {
            const c = absoluteToConstraints(0, 0, 300, 250, 300, 250);
            const abs = constraintsToAbsolute(c, 300, 250);
            expect(abs.x).toBe(0);
            expect(abs.y).toBe(0);
            expect(abs.w).toBe(300);
            expect(abs.h).toBe(250);
        });

        it('should preserve rotation angle', () => {
            const c = absoluteToConstraints(10, 10, 50, 50, 300, 250, 45);
            expect(c.rotation).toBe(45);
        });

        it('should store _absOrigin cache', () => {
            const c = absoluteToConstraints(10, 20, 100, 50, 300, 250);
            expect(c._absOrigin).toBeDefined();
            expect(c._absOrigin!.cw).toBe(300);
        });
    });

    describe('constraintsToAbsolute', () => {
        it('should resolve left anchor', () => {
            const abs = constraintsToAbsolute(
                { horizontal: { anchor: 'left', offset: 15 }, vertical: { anchor: 'top', offset: 20 },
                  size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 }, rotation: 0 },
                300, 250,
            );
            expect(abs.x).toBe(15);
            expect(abs.y).toBe(20);
        });

        it('should resolve center anchor', () => {
            const abs = constraintsToAbsolute(
                { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'center', offset: 0 },
                  size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 }, rotation: 0 },
                300, 250,
            );
            expect(abs.x).toBe(100);
            expect(abs.y).toBe(100);
        });

        it('should resolve right anchor', () => {
            const abs = constraintsToAbsolute(
                { horizontal: { anchor: 'right', offset: 10 }, vertical: { anchor: 'bottom', offset: 15 },
                  size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 }, rotation: 0 },
                300, 250,
            );
            expect(abs.x).toBe(190);
            expect(abs.y).toBe(185);
        });

        it('should resolve relative size', () => {
            const abs = constraintsToAbsolute(
                { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 },
                  size: { widthMode: 'relative', heightMode: 'relative', width: 1, height: 1 }, rotation: 0 },
                300, 250,
            );
            expect(abs.w).toBe(300);
            expect(abs.h).toBe(250);
        });
    });

    // ── Color Converters ──
    describe('rgbFloatToHex', () => {
        it('should convert 0,0,0 to black', () => {
            expect(rgbFloatToHex(0, 0, 0)).toBe('#000000');
        });

        it('should convert 1,1,1 to white', () => {
            expect(rgbFloatToHex(1, 1, 1)).toBe('#ffffff');
        });

        it('should convert 1,0,0 to red', () => {
            expect(rgbFloatToHex(1, 0, 0)).toBe('#ff0000');
        });

        it('should clamp values > 1', () => {
            expect(rgbFloatToHex(1.5, 0, 0)).toBe('#ff0000');
        });
    });

    describe('hexToRgbFloat', () => {
        it('should parse hex to float', () => {
            const [r, g, b, a] = hexToRgbFloat('#ff0000');
            expect(r).toBeCloseTo(1, 2);
            expect(g).toBeCloseTo(0, 2);
            expect(b).toBeCloseTo(0, 2);
            expect(a).toBe(1);
        });

        it('should parse white', () => {
            const [r, g, b] = hexToRgbFloat('#ffffff');
            expect(r).toBeCloseTo(1, 2);
            expect(g).toBeCloseTo(1, 2);
            expect(b).toBeCloseTo(1, 2);
        });

        it('should parse rgba string', () => {
            const [r, g, b, a] = hexToRgbFloat('rgba(255, 0, 0, 0.5)');
            expect(r).toBeCloseTo(1, 2);
            expect(a).toBeCloseTo(0.5, 2);
        });

        it('should handle invalid input', () => {
            const [r, g, b, a] = hexToRgbFloat('not-a-color');
            expect(r).toBe(0);
            expect(g).toBe(0);
            expect(b).toBe(0);
            expect(a).toBe(1);
        });
    });

    // ── Font Weight ──
    describe('resolveFontWeight', () => {
        it('should return 400 for null/undefined', () => {
            expect(resolveFontWeight(null)).toBe(400);
            expect(resolveFontWeight(undefined)).toBe(400);
        });

        it('should return number directly', () => {
            expect(resolveFontWeight(700)).toBe(700);
        });

        it('should parse numeric string', () => {
            expect(resolveFontWeight('600')).toBe(600);
        });

        it('should resolve keyword "bold"', () => {
            expect(resolveFontWeight('bold')).toBe(700);
        });

        it('should resolve keyword "thin"', () => {
            expect(resolveFontWeight('thin')).toBe(100);
        });

        it('should resolve keyword "black"', () => {
            expect(resolveFontWeight('black')).toBe(900);
        });

        it('should default to 400 for unknown', () => {
            expect(resolveFontWeight('unknown')).toBe(400);
        });
    });

    // ── Shape Type ──
    describe('nodeTypeToShapeType', () => {
        it('should return ellipse for ellipse', () => {
            expect(nodeTypeToShapeType('ellipse')).toBe('ellipse');
        });

        it('should return rectangle for any other type', () => {
            expect(nodeTypeToShapeType('rectangle')).toBe('rectangle');
            expect(nodeTypeToShapeType('polygon')).toBe('rectangle');
        });
    });

    // ── Gradient Cache ──
    describe('gradient cache', () => {
        beforeEach(() => clearGradientCache());

        it('should cache and retrieve gradient data', () => {
            cacheGradientData('bg', '#ff0000', '#0000ff', 135);
            const cached = getGradientCache('bg');
            expect(cached).toEqual({ startHex: '#ff0000', endHex: '#0000ff', angle: 135 });
        });

        it('should return undefined for uncached key', () => {
            expect(getGradientCache('missing')).toBeUndefined();
        });

        it('should clear all cache', () => {
            cacheGradientData('a', '#fff', '#000', 0);
            clearGradientCache();
            expect(getGradientCache('a')).toBeUndefined();
        });
    });

    // ── Animation ──
    describe('getAnimationForElement', () => {
        it('should return animation config for element with preset', () => {
            const anim = getAnimationForElement('el-1');
            expect(anim).toEqual({ preset: 'fade', duration: 0.5, startTime: 0 });
        });

        it('should return undefined for "none" preset', () => {
            expect(getAnimationForElement('el-2')).toBeUndefined();
        });

        it('should return undefined for unknown element', () => {
            expect(getAnimationForElement('nonexistent')).toBeUndefined();
        });
    });
});
