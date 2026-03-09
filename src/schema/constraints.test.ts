// ─────────────────────────────────────────────────
// constraints — Regression Tests
// ─────────────────────────────────────────────────
// resolveConstraints is the CORE layout engine — must never break.
import { describe, it, expect } from 'vitest';
import { resolveConstraints } from './constraints.types';
import { createDefaultConstraints } from './elements.types';
import type { ElementConstraints } from './constraints.types';

function makeConstraints(overrides: Partial<ElementConstraints> & Pick<ElementConstraints, 'horizontal' | 'vertical' | 'size'>): ElementConstraints {
    return { rotation: 0, ...overrides };
}

describe('resolveConstraints — Horizontal Anchors', () => {
    it('left anchor: x = offset', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 20 },
            vertical: { anchor: 'top', offset: 0 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.x).toBe(20);
        expect(r.width).toBe(100);
    });

    it('right anchor: x = parentWidth - width - offset', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'right', offset: 10 },
            vertical: { anchor: 'top', offset: 0 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.x).toBe(190); // 300 - 100 - 10
    });

    it('center anchor: x = (parentWidth - width) / 2 + offset', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'center', offset: 0 },
            vertical: { anchor: 'top', offset: 0 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.x).toBe(100); // (300 - 100) / 2
    });

    it('stretch anchor: fills parent minus margins', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'stretch', offset: 0, marginLeft: 20, marginRight: 20 },
            vertical: { anchor: 'top', offset: 0 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.x).toBe(20);
        expect(r.width).toBe(260); // 300 - 20 - 20
    });
});

describe('resolveConstraints — Vertical Anchors', () => {
    it('top anchor: y = offset', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 0 },
            vertical: { anchor: 'top', offset: 30 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.y).toBe(30);
    });

    it('bottom anchor: y = parentHeight - height - offset', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 0 },
            vertical: { anchor: 'bottom', offset: 10 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.y).toBe(190); // 250 - 50 - 10
    });

    it('center anchor: y = (parentHeight - height) / 2', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 0 },
            vertical: { anchor: 'center', offset: 0 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.y).toBe(100); // (250 - 50) / 2
    });

    it('stretch anchor: fills parent minus margins', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 0 },
            vertical: { anchor: 'stretch', offset: 0, marginTop: 10, marginBottom: 10 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.y).toBe(10);
        expect(r.height).toBe(230); // 250 - 10 - 10
    });
});

describe('resolveConstraints — Size Modes', () => {
    it('relative width: width = parentWidth * ratio', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 0 },
            vertical: { anchor: 'top', offset: 0 },
            size: { widthMode: 'relative', heightMode: 'fixed', width: 0.5, height: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.width).toBe(150); // 300 * 0.5
    });

    it('relative height: height = parentHeight * ratio', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 0 },
            vertical: { anchor: 'top', offset: 0 },
            size: { widthMode: 'fixed', heightMode: 'relative', width: 100, height: 0.4 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.height).toBe(100); // 250 * 0.4
    });

    it('minWidth clamps small widths', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 0 },
            vertical: { anchor: 'top', offset: 0 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 10, height: 50, minWidth: 50 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.width).toBe(50);
    });

    it('maxWidth clamps large widths', () => {
        const c = makeConstraints({
            horizontal: { anchor: 'left', offset: 0 },
            vertical: { anchor: 'top', offset: 0 },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: 500, height: 50, maxWidth: 200 },
        });
        const r = resolveConstraints(c, 300, 250);
        expect(r.width).toBe(200);
    });
});

describe('resolveConstraints — createDefaultConstraints', () => {
    it('creates left/top anchor with 100x100 size', () => {
        const c = createDefaultConstraints();
        expect(c.horizontal.anchor).toBe('left');
        expect(c.vertical.anchor).toBe('top');
        expect(c.size.width).toBe(100);
        expect(c.size.height).toBe(100);
        expect(c.rotation).toBe(0);
    });
});
