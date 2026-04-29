// ─────────────────────────────────────────────────
// overlayStyles.test.ts — Overlay style diversity tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { pickOverlayStyle, buildOverlayElements } from './overlayStyles';
import type { LayoutVariant } from './layoutRules';

describe('overlayStyles', () => {
    const ALL_VARIANTS: LayoutVariant[] = [
        'centered', 'left-hero', 'offset-right', 'top-heavy', 'bottom-stack',
        'split-left', 'minimal-center', 'bold-statement', 'editorial', 'compact-bar',
    ];

    describe('pickOverlayStyle', () => {
        it('should return a valid overlay style for every variant', () => {
            const validStyles = ['scrim', 'gradient-bottom', 'gradient-top', 'full-dim', 'color-wash', 'side-panel', 'none'];
            for (const variant of ALL_VARIANTS) {
                const style = pickOverlayStyle(variant);
                expect(validStyles).toContain(style);
            }
        });

        it('★ DESIGN DIVERSITY: should NOT map all variants to the same style', () => {
            const styles = new Set(ALL_VARIANTS.map(v => pickOverlayStyle(v)));
            // At least 4 distinct styles across 10 variants
            expect(styles.size).toBeGreaterThanOrEqual(4);
        });

        it('★ REGRESSION: should never return only "scrim" — that was the old monotonous behavior', () => {
            const nonScrimVariants = ALL_VARIANTS.filter(v => pickOverlayStyle(v) !== 'scrim');
            expect(nonScrimVariants.length).toBeGreaterThanOrEqual(5);
        });

        it('minimal-center should use "none" (no overlay)', () => {
            expect(pickOverlayStyle('minimal-center')).toBe('none');
        });

        it('bottom-stack should use gradient-bottom', () => {
            expect(pickOverlayStyle('bottom-stack')).toBe('gradient-bottom');
        });

        it('editorial should use color-wash', () => {
            expect(pickOverlayStyle('editorial')).toBe('color-wash');
        });
    });

    describe('buildOverlayElements', () => {
        const canvasW = 1080, canvasH = 1080, canvasMin = 1080;
        const oX = 100, oY = 200, oW = 800, oH = 600;

        it('scrim: should produce 1 rect with black + 0.35 alpha', () => {
            const els = buildOverlayElements('scrim', oX, oY, oW, oH, canvasW, canvasH, canvasMin, '#ff6600');
            expect(els).toHaveLength(1);
            expect(els[0]!.name).toBe('text_overlay');
            expect(els[0]!.a).toBe(0.35);
        });

        it('gradient-bottom: should span full canvas width', () => {
            const els = buildOverlayElements('gradient-bottom', oX, oY, oW, oH, canvasW, canvasH, canvasMin, '#ff6600');
            expect(els).toHaveLength(1);
            expect(els[0]!.w).toBe(canvasW);
        });

        it('gradient-top: should start at y=0', () => {
            const els = buildOverlayElements('gradient-top', oX, oY, oW, oH, canvasW, canvasH, canvasMin, '#ff6600');
            expect(els).toHaveLength(1);
            expect(els[0]!.y).toBe(0);
        });

        it('full-dim: should cover entire canvas', () => {
            const els = buildOverlayElements('full-dim', oX, oY, oW, oH, canvasW, canvasH, canvasMin, '#ff6600');
            expect(els).toHaveLength(1);
            expect(els[0]!.w).toBe(canvasW);
            expect(els[0]!.h).toBe(canvasH);
        });

        it('color-wash: should use accent color in overlay', () => {
            const els = buildOverlayElements('color-wash', oX, oY, oW, oH, canvasW, canvasH, canvasMin, '#ff6600');
            expect(els).toHaveLength(1);
            // Red channel should be non-zero (accent is #ff6600 = red-heavy)
            expect(els[0]!.r).toBeGreaterThan(0);
        });

        it('side-panel: should be slightly wider than content bounds', () => {
            const els = buildOverlayElements('side-panel', oX, oY, oW, oH, canvasW, canvasH, canvasMin, '#ff6600');
            expect(els).toHaveLength(1);
            expect(els[0]!.w).toBeGreaterThan(oW);
        });

        it('none: should return empty array', () => {
            const els = buildOverlayElements('none', oX, oY, oW, oH, canvasW, canvasH, canvasMin, '#ff6600');
            expect(els).toHaveLength(0);
        });
    });

    // ── Source code guard ──
    describe('★ REGRESSION: overlay system source guards (v710)', () => {
        const fs = require('fs');
        const path = require('path');
        const composerSrc = fs.readFileSync(path.resolve(__dirname, '../carbon/layoutComposer.ts'), 'utf-8');
        const overlaySrc = fs.readFileSync(path.resolve(__dirname, './overlayStyles.ts'), 'utf-8');

        it('layoutComposer must use pickOverlayStyle (not hardcoded black scrim)', () => {
            expect(composerSrc).toContain('pickOverlayStyle');
            expect(composerSrc).toContain('buildOverlayElements');
        });

        it('overlayStyles must define at least 6 overlay types', () => {
            const types = overlaySrc.match(/\| '([a-z-]+)'/g);
            expect(types!.length).toBeGreaterThanOrEqual(6);
        });

        it('layoutComposer must NOT have hardcoded a: 0.35 black overlay', () => {
            // The old pattern was: r: 0, g: 0, b: 0, a: 0.35
            // It should now be delegated to overlayStyles
            expect(composerSrc).not.toMatch(/r:\s*0,\s*g:\s*0,\s*b:\s*0,\s*a:\s*0\.35/);
        });
    });
});
