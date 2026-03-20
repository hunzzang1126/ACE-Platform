// ─────────────────────────────────────────────────
// smartLayout — Unit Tests
// ─────────────────────────────────────────────────
// Tests for the aspect-ratio-aware layout engine.
// The core differentiator: semantic roles + canvas size → optimal constraints.

import { describe, it, expect } from 'vitest';
import { computeSmartConstraints, isOutOfBounds, getSmartFontSize } from './smartLayout';
import { resolveConstraints } from '@/schema/constraints.types';
import type { LayoutRole } from '@/schema/layoutRoles';

// ── computeSmartConstraints ──────────────────────

describe('computeSmartConstraints — Ultra-Wide Layout', () => {
    // 728x90 ultra-wide: logo LEFT, headline CENTER, CTA RIGHT

    it('background stretches to fill full canvas', () => {
        const c = computeSmartConstraints({ role: 'background', canvasW: 728, canvasH: 90 });
        expect(c.horizontal.anchor).toBe('stretch');
        expect(c.size.widthMode).toBe('relative');
        expect(c.size.width).toBe(1);
    });

    it('headline is center-anchored', () => {
        const c = computeSmartConstraints({ role: 'headline', canvasW: 728, canvasH: 90, fontSize: 24 });
        expect(c.horizontal.anchor).toBe('center');
    });

    it('CTA is right-anchored', () => {
        const c = computeSmartConstraints({ role: 'cta', canvasW: 728, canvasH: 90, fontSize: 14 });
        expect(c.horizontal.anchor).toBe('right');
    });

    it('logo is left-anchored', () => {
        const c = computeSmartConstraints({ role: 'logo', canvasW: 728, canvasH: 90, elWidth: 50, elHeight: 30 });
        expect(c.horizontal.anchor).toBe('left');
    });
});

describe('computeSmartConstraints — Portrait Layout', () => {
    // 160x600 portrait: vertical stack

    it('CTA is bottom-anchored in portrait', () => {
        const c = computeSmartConstraints({ role: 'cta', canvasW: 160, canvasH: 600, fontSize: 14 });
        expect(c.vertical.anchor).toBe('bottom');
    });

    it('headline is center-anchored vertically in portrait', () => {
        const c = computeSmartConstraints({ role: 'headline', canvasW: 160, canvasH: 600, fontSize: 24 });
        expect(c.horizontal.anchor).toBe('center');
        expect(c.vertical.anchor).toBe('center');
    });

    it('logo is top-anchored in portrait', () => {
        const c = computeSmartConstraints({ role: 'logo', canvasW: 160, canvasH: 600, elWidth: 50, elHeight: 30 });
        expect(c.vertical.anchor).toBe('top');
    });
});

describe('computeSmartConstraints — Square Layout', () => {
    it('CTA is bottom-anchored in square', () => {
        const c = computeSmartConstraints({ role: 'cta', canvasW: 300, canvasH: 250, fontSize: 14 });
        expect(c.vertical.anchor).toBe('bottom');
    });

    it('headline width uses ~85% of canvas', () => {
        const c = computeSmartConstraints({ role: 'headline', canvasW: 300, canvasH: 250, fontSize: 24 });
        const resolved = resolveConstraints(c, 300, 250);
        expect(resolved.width).toBeGreaterThan(200); // 85% of 300 = 255
    });
});

describe('computeSmartConstraints — Fallback', () => {
    it('unknown role falls back to center positioning', () => {
        const c = computeSmartConstraints({ role: 'decoration' as LayoutRole, canvasW: 300, canvasH: 250 });
        expect(c.horizontal.anchor).toBe('center');
        expect(c.vertical.anchor).toBe('center');
    });

    it('fallback uses provided elWidth/elHeight', () => {
        const c = computeSmartConstraints({ role: 'decoration' as LayoutRole, canvasW: 300, canvasH: 250, elWidth: 80, elHeight: 40 });
        expect(c.size.width).toBe(80);
        expect(c.size.height).toBe(40);
    });
});

describe('computeSmartConstraints — produces valid constraints', () => {
    const roles: LayoutRole[] = ['background', 'headline', 'subline', 'cta', 'logo', 'hero', 'tnc', 'detail', 'badge', 'accent'];
    const sizes: [number, number][] = [[728, 90], [300, 250], [160, 600], [1080, 1080], [1200, 628]];

    for (const role of roles) {
        for (const [w, h] of sizes) {
            it(`${role} @ ${w}x${h} → valid constraints`, () => {
                const c = computeSmartConstraints({ role, canvasW: w, canvasH: h, fontSize: 16, elWidth: 50, elHeight: 30 });
                expect(c.horizontal).toBeDefined();
                expect(c.vertical).toBeDefined();
                expect(c.size).toBeDefined();
                expect(c.size.width).toBeGreaterThan(0);
                expect(c.size.height).toBeGreaterThan(0);
            });
        }
    }
});

// ── isOutOfBounds ─────────────────────────────────

describe('isOutOfBounds', () => {
    it('element inside canvas → false', () => {
        const c = { horizontal: { anchor: 'left' as const, offset: 10 }, vertical: { anchor: 'top' as const, offset: 10 }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: 100, height: 50 }, rotation: 0 };
        expect(isOutOfBounds(c, 300, 250)).toBe(false);
    });

    it('element completely off-screen → true', () => {
        const c = { horizontal: { anchor: 'left' as const, offset: -200 }, vertical: { anchor: 'top' as const, offset: -200 }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: 50, height: 50 }, rotation: 0 };
        expect(isOutOfBounds(c, 300, 250)).toBe(true);
    });

    it('element past right edge → true', () => {
        const c = { horizontal: { anchor: 'left' as const, offset: 500 }, vertical: { anchor: 'top' as const, offset: 10 }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: 50, height: 50 }, rotation: 0 };
        expect(isOutOfBounds(c, 300, 250)).toBe(true);
    });
});

// ── getSmartFontSize ──────────────────────────────

describe('getSmartFontSize', () => {
    it('headline base size is 24', () => {
        const fs = getSmartFontSize('headline', 300, 250);
        expect(fs).toBe(24);
    });

    it('scales down for tiny canvas (728x90 → minDim=90)', () => {
        const fs = getSmartFontSize('headline', 728, 90);
        // minDim=90 < 100 → max(8, 24 * 0.5) = 12
        expect(fs).toBe(12);
    });

    it('tnc base size is 9', () => {
        const fs = getSmartFontSize('tnc', 300, 250);
        expect(fs).toBe(9);
    });

    it('cta base size is 14', () => {
        const fs = getSmartFontSize('cta', 300, 250);
        expect(fs).toBe(14);
    });

    it('unknown role falls back to 14', () => {
        const fs = getSmartFontSize('decoration' as LayoutRole, 300, 250);
        expect(fs).toBe(14);
    });
});
