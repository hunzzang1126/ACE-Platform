// ─────────────────────────────────────────────────
// smartCheckScaling.test.ts — Element scaling + clipping
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/engine/elementConverters', () => ({
    constraintsToAbsolute: (c: any, w: number, h: number) => ({
        x: c.horizontal?.offset ?? 0,
        y: c.vertical?.offset ?? 0,
        w: c.size?.width ?? 100,
        h: c.size?.height ?? 50,
    }),
}));

import { scaleElementToTarget, clipOutOfBounds } from './smartCheckScaling';
import type { DesignElement } from '@/schema/elements.types';

const makeElement = (overrides: Partial<DesignElement> = {}): DesignElement => ({
    id: 'e1',
    name: 'Test',
    type: 'shape',
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    constraints: {
        horizontal: { anchor: 'left', offset: 10 },
        vertical: { anchor: 'top', offset: 20 },
        size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
    },
    ...overrides,
} as DesignElement);

describe('scaleElementToTarget', () => {
    it('scales offset proportionally', () => {
        const el = makeElement();
        const patch = scaleElementToTarget(el, 300, 250, 600, 500);
        const c = patch.constraints as any;
        expect(c.horizontal.offset).toBe(20); // 10 * 2
        expect(c.vertical.offset).toBe(40);   // 20 * 2
    });

    it('scales fixed dimensions proportionally', () => {
        const el = makeElement();
        const patch = scaleElementToTarget(el, 300, 250, 600, 500);
        const c = patch.constraints as any;
        expect(c.size.width).toBe(200);  // 100 * 2
        expect(c.size.height).toBe(100); // 50 * 2
    });

    it('scales font size for text elements', () => {
        const el = makeElement({ type: 'text', fontSize: 24 } as any);
        const patch = scaleElementToTarget(el, 300, 250, 600, 500);
        expect((patch as any).fontSize).toBe(48); // 24 * min(2, 2)
    });

    it('enforces minimum font size of 8', () => {
        const el = makeElement({ type: 'text', fontSize: 24 } as any);
        const patch = scaleElementToTarget(el, 300, 250, 30, 25);
        expect((patch as any).fontSize).toBeGreaterThanOrEqual(8);
    });

    it('enforces minimum dimension of 1', () => {
        const el = makeElement();
        const patch = scaleElementToTarget(el, 300, 250, 1, 1);
        const c = patch.constraints as any;
        expect(c.size.width).toBeGreaterThanOrEqual(1);
        expect(c.size.height).toBeGreaterThanOrEqual(1);
    });
});

describe('clipOutOfBounds', () => {
    it('returns null for in-bounds element', () => {
        const el = makeElement();
        expect(clipOutOfBounds(el, 300, 250)).toBeNull();
    });

    it('clips element completely off-screen right', () => {
        const el = makeElement({
            constraints: {
                horizontal: { anchor: 'left', offset: 500 },
                vertical: { anchor: 'top', offset: 20 },
                size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
            },
        } as any);
        const result = clipOutOfBounds(el, 300, 250);
        expect(result).not.toBeNull();
        expect(result!.elementId).toBe('e1');
    });
});
