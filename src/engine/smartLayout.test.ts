// ─────────────────────────────────────────────────
// smartLayout — Unit Tests
// ─────────────────────────────────────────────────
// Tests for the aspect-ratio-aware layout engine.
// ★ Updated for industry-standard layout rules:
//   Ultra-wide: headline LEFT, CTA RIGHT
//   Portrait: headline TOP, CTA BOTTOM

import { describe, it, expect } from 'vitest';
import { computeSmartConstraints, isOutOfBounds, getSmartFontSize } from './smartLayout';
import { resolveConstraints } from '@/schema/constraints.types';
import type { LayoutRole } from '@/schema/layoutRoles';

// ── computeSmartConstraints ──────────────────────

describe('computeSmartConstraints — Ultra-Wide Layout', () => {
    // 728x90 ultra-wide: logo LEFT, headline LEFT, CTA RIGHT

    it('background stretches to fill full canvas', () => {
        const c = computeSmartConstraints({ role: 'background', canvasW: 728, canvasH: 90 });
        expect(c.horizontal.anchor).toBe('stretch');
        expect(c.size.widthMode).toBe('relative');
        expect(c.size.width).toBe(1);
    });

    it('headline is left-anchored (industry standard for wide banners)', () => {
        const c = computeSmartConstraints({ role: 'headline', canvasW: 728, canvasH: 90, fontSize: 24 });
        expect(c.horizontal.anchor).toBe('left');
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
    // 160x600 portrait: headline TOP, CTA BOTTOM

    it('CTA is bottom-anchored in portrait', () => {
        const c = computeSmartConstraints({ role: 'cta', canvasW: 160, canvasH: 600, fontSize: 14 });
        expect(c.vertical.anchor).toBe('bottom');
    });

    it('headline is top-anchored in portrait (industry standard)', () => {
        const c = computeSmartConstraints({ role: 'headline', canvasW: 160, canvasH: 600, fontSize: 24 });
        expect(c.horizontal.anchor).toBe('center');
        expect(c.vertical.anchor).toBe('top');
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
// ★ New scaling: continuous proportional curve (√(minDim/300))
// 300x250: minDim=250, scale=√(250/300)=0.913 → headline ~22px

describe('getSmartFontSize', () => {
    it('headline scales proportionally at 300x250 (minDim=250)', () => {
        const fs = getSmartFontSize('headline', 300, 250);
        // √(250/300) = 0.913 → 24 * 0.913 = 21.9 → 22
        expect(fs).toBe(22);
    });

    it('scales down for tiny canvas (728x90 → minDim=90)', () => {
        const fs = getSmartFontSize('headline', 728, 90);
        // √(90/300) = 0.548 → 24 * 0.548 = 13.1 → 13
        expect(fs).toBe(13);
    });

    it('tnc at 300x250 scales proportionally', () => {
        const fs = getSmartFontSize('tnc', 300, 250);
        // √(250/300) = 0.913 → 9 * 0.913 = 8.2 → 8
        expect(fs).toBe(8);
    });

    it('cta at 300x250 scales proportionally', () => {
        const fs = getSmartFontSize('cta', 300, 250);
        // √(250/300) = 0.913 → 14 * 0.913 = 12.8 → 13
        expect(fs).toBe(13);
    });

    it('unknown role falls back to scaled 14', () => {
        const fs = getSmartFontSize('decoration' as LayoutRole, 300, 250);
        // √(250/300) = 0.913 → 14 * 0.913 = 12.8 → 13
        expect(fs).toBe(13);
    });

    it('large canvas preserves base sizes', () => {
        const fs = getSmartFontSize('headline', 1080, 1080);
        // √(1080/300) = 1.897 → clamped to 1.5 → 24 * 1.5 = 36
        expect(fs).toBe(36);
    });
});
