// ─────────────────────────────────────────────────
// smartCheckScaling.test.ts — Element scaling + clipping tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/engine/elementConverters', () => ({
    constraintsToAbsolute: vi.fn((c: any, _cw: number, _ch: number) => ({
        x: c?.horizontal?.offset ?? 0,
        y: c?.vertical?.offset ?? 0,
        w: c?.size?.width ?? 100,
        h: c?.size?.height ?? 50,
    })),
}));

import { scaleElementToTarget, clipOutOfBounds } from './smartCheckScaling';

function makeElement(overrides: Record<string, unknown> = {}) {
    return {
        id: 'el-1',
        name: 'Test',
        type: 'text' as const,
        fontSize: 24,
        constraints: {
            horizontal: { anchor: 'left', offset: 20 },
            vertical: { anchor: 'top', offset: 30 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 40 },
            rotation: 0,
        },
        ...overrides,
    } as any;
}

describe('smartCheckScaling', () => {
    describe('scaleElementToTarget', () => {
        it('should scale offset proportionally', () => {
            const patch = scaleElementToTarget(makeElement(), 300, 250, 600, 500);
            const c = (patch as any).constraints;
            expect(c.horizontal.offset).toBe(40); // 20 * 2
            expect(c.vertical.offset).toBe(60);   // 30 * 2
        });

        it('should scale fixed dimensions', () => {
            const patch = scaleElementToTarget(makeElement(), 300, 250, 600, 500);
            const c = (patch as any).constraints;
            expect(c.size.width).toBe(400);  // 200 * 2
            expect(c.size.height).toBe(80);  // 40 * 2
        });

        it('should scale down', () => {
            const patch = scaleElementToTarget(makeElement(), 300, 250, 150, 125);
            const c = (patch as any).constraints;
            expect(c.horizontal.offset).toBe(10); // 20 * 0.5
            expect(c.size.width).toBe(100);        // 200 * 0.5
        });

        it('should scale font size for text elements', () => {
            const patch = scaleElementToTarget(makeElement(), 300, 250, 600, 500);
            expect((patch as any).fontSize).toBe(48); // 24 * 2
        });

        it('should enforce minimum font size of 8', () => {
            const patch = scaleElementToTarget(makeElement({ fontSize: 10 }), 300, 250, 30, 25);
            expect((patch as any).fontSize).toBe(8);
        });

        it('should not scale font for shape elements', () => {
            const shape = makeElement({ type: 'shape', fill: '#000' });
            delete shape.fontSize;
            const patch = scaleElementToTarget(shape, 300, 250, 600, 500);
            expect((patch as any).fontSize).toBeUndefined();
        });

        it('should handle stretch anchors', () => {
            const el = makeElement({
                constraints: {
                    horizontal: { anchor: 'stretch', marginLeft: 10, marginRight: 10 },
                    vertical: { anchor: 'top', offset: 20 },
                    size: { widthMode: 'fixed', heightMode: 'fixed', width: 280, height: 40 },
                    rotation: 0,
                },
            });
            const patch = scaleElementToTarget(el, 300, 250, 600, 500);
            const c = (patch as any).constraints;
            expect(c.horizontal.marginLeft).toBe(20);
            expect(c.horizontal.marginRight).toBe(20);
        });

        it('should keep relative size unchanged', () => {
            const el = makeElement({
                constraints: {
                    horizontal: { anchor: 'center', offset: 0 },
                    vertical: { anchor: 'top', offset: 0 },
                    size: { widthMode: 'relative', heightMode: 'relative', width: 1, height: 1 },
                    rotation: 0,
                },
            });
            const patch = scaleElementToTarget(el, 300, 250, 600, 500);
            const c = (patch as any).constraints;
            expect(c.size.width).toBe(1);
            expect(c.size.height).toBe(1);
        });
    });

    describe('clipOutOfBounds', () => {
        it('should return null for visible element', () => {
            const el = makeElement();
            const result = clipOutOfBounds(el, 300, 250);
            expect(result).toBeNull();
        });

        it('should clip element completely off right', () => {
            const el = makeElement({
                constraints: {
                    horizontal: { anchor: 'left', offset: 500 },
                    vertical: { anchor: 'top', offset: 50 },
                    size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
                    rotation: 0,
                },
            });
            const result = clipOutOfBounds(el, 300, 250);
            expect(result).not.toBeNull();
            expect(result!.elementId).toBe('el-1');
        });

        it('should clip element completely off top', () => {
            const el = makeElement({
                constraints: {
                    horizontal: { anchor: 'left', offset: 10 },
                    vertical: { anchor: 'top', offset: -200 },
                    size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
                    rotation: 0,
                },
            });
            const result = clipOutOfBounds(el, 300, 250);
            expect(result).not.toBeNull();
        });
    });
});
