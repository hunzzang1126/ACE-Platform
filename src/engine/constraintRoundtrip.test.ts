// ★ Roundtrip test: absoluteToConstraints → constraintsToAbsolute
// Must produce the SAME (x, y, w, h) for any element position.
import { describe, it, expect } from 'vitest';
import { absoluteToConstraints, constraintsToAbsolute } from '@/engine/constraintUtils';

function roundtrip(x: number, y: number, w: number, h: number, canvasW: number, canvasH: number) {
    const constraints = absoluteToConstraints(x, y, w, h, canvasW, canvasH);
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
