// ★ Roundtrip test: absoluteToConstraints → constraintsToAbsolute
// Must produce the SAME (x, y, w, h) for any element position.
import { describe, it, expect } from 'vitest';
import { absoluteToConstraints, constraintsToAbsolute } from '@/engine/constraintUtils';

function roundtrip(x: number, y: number, w: number, h: number, canvasW: number, canvasH: number, angle = 0) {
    const constraints = absoluteToConstraints(x, y, w, h, canvasW, canvasH, angle);
    const result = constraintsToAbsolute(constraints, canvasW, canvasH);
    return { input: { x, y, w, h }, constraints, output: result };
}

describe('Constraint roundtrip fidelity', () => {
    const sizes = [
        { cw: 1000, ch: 1800, label: '1000x1800' },
        { cw: 300, ch: 600, label: '300x600' },
        { cw: 160, ch: 600, label: '160x600' },
        { cw: 300, ch: 250, label: '300x250' },
        { cw: 728, ch: 90, label: '728x90' },
    ];

    // Elements at various positions
    const elements = [
        { label: 'Full BG', x: 0, y: 0, relW: 1.0, relH: 1.0 },
        { label: 'Center headline', x: 0.1, y: 0.15, relW: 0.8, relH: 0.15 },
        { label: 'Top-left logo', x: 0.02, y: 0.02, relW: 0.15, relH: 0.05 },
        { label: 'Bottom CTA', x: 0.25, y: 0.7, relW: 0.5, relH: 0.08 },
        { label: 'Right-side image', x: 0.6, y: 0.1, relW: 0.35, relH: 0.8 },
        { label: 'Subheadline', x: 0.05, y: 0.35, relW: 0.9, relH: 0.1 },
        { label: 'Left edge text', x: 0, y: 0.5, relW: 0.4, relH: 0.06 },
        { label: 'Bottom-right badge', x: 0.75, y: 0.85, relW: 0.2, relH: 0.08 },
    ];

    for (const size of sizes) {
        describe(`Canvas ${size.label}`, () => {
            for (const el of elements) {
                it(`${el.label} roundtrips exactly`, () => {
                    const x = Math.round(el.x * size.cw);
                    const y = Math.round(el.y * size.ch);
                    const w = Math.round(el.relW * size.cw);
                    const h = Math.round(el.relH * size.ch);
                    const { output } = roundtrip(x, y, w, h, size.cw, size.ch);
                    expect(output.x).toBe(x);
                    expect(output.y).toBe(y);
                    expect(output.w).toBe(w);
                    expect(output.h).toBe(h);
                });
            }
        });
    }
});

// ── Rotation persistence tests ──────────────────

describe('Rotation roundtrip', () => {
    const angles = [0, 15, 30, 45, 90, 135, 180, 270, 359, -45, 12.5];

    it('rotation is stored in constraints', () => {
        const constraints = absoluteToConstraints(50, 50, 100, 100, 300, 250, 45);
        expect(constraints.rotation).toBe(45);
    });

    it('rotation: 0 is default when angle not provided', () => {
        const constraints = absoluteToConstraints(50, 50, 100, 100, 300, 250);
        expect(constraints.rotation).toBe(0);
    });

    for (const angle of angles) {
        it(`angle ${angle} survives roundtrip`, () => {
            const constraints = absoluteToConstraints(50, 100, 200, 80, 1000, 1800, angle);
            expect(constraints.rotation).toBe(angle);
            // Position should still roundtrip perfectly
            const result = constraintsToAbsolute(constraints, 1000, 1800);
            expect(result.x).toBe(50);
            expect(result.y).toBe(100);
        });
    }

    it('rotation preserved across multiple canvas sizes', () => {
        const sizes = [
            { cw: 300, ch: 250 },
            { cw: 728, ch: 90 },
            { cw: 160, ch: 600 },
            { cw: 1080, ch: 1080 },
        ];
        for (const { cw, ch } of sizes) {
            const c = absoluteToConstraints(10, 10, 80, 40, cw, ch, 33);
            expect(c.rotation).toBe(33);
        }
    });
});
