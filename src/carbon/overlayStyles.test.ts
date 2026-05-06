// ─────────────────────────────────────────────────
// overlayStyles.test.ts — Premium overlay system tests (v713)
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildOverlayResult } from './overlayStyles';
import type { OverlayApproach } from './designStrategy';

describe('overlayStyles v713', () => {
    const canvasW = 1080, canvasH = 1080;
    const bgColor = '#0a0a0a';
    const accentColor = '#ff6600';

    const ALL_APPROACHES: OverlayApproach[] = [
        'gradient-scrim', 'text-shadow-only', 'color-tint',
        'full-dim', 'none',
    ];

    describe('buildOverlayResult', () => {
        it('should return a valid result for every overlay approach', () => {
            for (const approach of ALL_APPROACHES) {
                const result = buildOverlayResult(approach, canvasW, canvasH, bgColor, accentColor, -0.15, 0);
                expect(result).toHaveProperty('overlayElements');
                expect(result).toHaveProperty('textModifiers');
                expect(result).toHaveProperty('imageFilters');
            }
        });

        it('gradient-scrim: should produce 1 overlay element using bg color (NOT black)', () => {
            const result = buildOverlayResult('gradient-scrim', canvasW, canvasH, bgColor, accentColor, -0.15, 0);
            expect(result.overlayElements).toHaveLength(1);
            expect(result.overlayElements[0]!.name).toBe('text_overlay');
            // ★ Must NOT be pure black rect — regression guard
            expect(result.overlayElements[0]!.gradient_end_hex).toBe(bgColor);
        });

        it('gradient-scrim: should include text shadow modifiers', () => {
            const result = buildOverlayResult('gradient-scrim', canvasW, canvasH, bgColor, accentColor, -0.15, 0);
            expect(result.textModifiers.shadowBlur).toBeGreaterThan(0);
        });

        it('gradient-scrim: should include image brightness filter', () => {
            const result = buildOverlayResult('gradient-scrim', canvasW, canvasH, bgColor, accentColor, -0.15, 0);
            expect(result.imageFilters.brightness).toBeLessThan(0);
        });

        it('text-shadow-only: should produce NO overlay elements', () => {
            const result = buildOverlayResult('text-shadow-only', canvasW, canvasH, bgColor, accentColor, -0.1, 0);
            expect(result.overlayElements).toHaveLength(0);
        });

        it('text-shadow-only: should have strong text shadows', () => {
            const result = buildOverlayResult('text-shadow-only', canvasW, canvasH, bgColor, accentColor, -0.1, 0);
            expect(result.textModifiers.shadowBlur).toBeGreaterThanOrEqual(6);
            expect(result.textModifiers.shadowOpacity).toBeGreaterThanOrEqual(0.4);
        });

        it('color-tint: should use accent color in overlay (not black)', () => {
            const result = buildOverlayResult('color-tint', canvasW, canvasH, bgColor, accentColor, -0.15, 0);
            expect(result.overlayElements).toHaveLength(1);
            // Accent is #ff6600 → R component (scaled) should be > 0
            expect(result.overlayElements[0]!.r).toBeGreaterThan(0);
        });

        it('full-dim: should cover entire canvas', () => {
            const result = buildOverlayResult('full-dim', canvasW, canvasH, bgColor, accentColor, -0.2, 0);
            expect(result.overlayElements).toHaveLength(1);
            expect(result.overlayElements[0]!.w).toBe(canvasW);
            expect(result.overlayElements[0]!.h).toBe(canvasH);
        });

        it('none: should return empty elements and no shadows', () => {
            const result = buildOverlayResult('none', canvasW, canvasH, bgColor, accentColor, 0, 0);
            expect(result.overlayElements).toHaveLength(0);
            expect(result.textModifiers.shadowBlur).toBe(0);
            expect(result.imageFilters.brightness).toBe(0);
        });

        it('should convert AI blur (0-3) to Fabric range (0-1)', () => {
            const result = buildOverlayResult('gradient-scrim', canvasW, canvasH, bgColor, accentColor, -0.1, 2);
            // 2 * 0.25 = 0.5
            expect(result.imageFilters.blur).toBe(0.5);
        });

        it('should cap Fabric blur at 1.0', () => {
            const result = buildOverlayResult('gradient-scrim', canvasW, canvasH, bgColor, accentColor, -0.1, 5);
            // 5 * 0.25 = 1.25 → capped at 1.0
            expect(result.imageFilters.blur).toBeLessThanOrEqual(1.0);
        });
    });

    // ── Source code guards ──
    describe('★ REGRESSION: premium overlay source guards (v713)', () => {
        const fs = require('fs');
        const path = require('path');
        const composerSrc = fs.readFileSync(path.resolve(__dirname, '../carbon/layoutComposer.ts'), 'utf-8');
        const overlaySrc = fs.readFileSync(path.resolve(__dirname, './overlayStyles.ts'), 'utf-8');

        it('layoutComposer must use buildOverlayResult (v713 system)', () => {
            expect(composerSrc).toContain('buildOverlayResult');
        });

        it('overlayStyles must define premium approaches (not old black-rect types)', () => {
            expect(overlaySrc).toContain('gradient-scrim');
            expect(overlaySrc).toContain('text-shadow-only');
            expect(overlaySrc).toContain('color-tint');
        });

        it('layoutComposer must NOT have hardcoded a: 0.35 black overlay', () => {
            expect(composerSrc).not.toMatch(/r:\s*0,\s*g:\s*0,\s*b:\s*0,\s*a:\s*0\.35/);
        });

        it('layoutComposer must apply text shadows from overlay result', () => {
            expect(composerSrc).toContain('shadow_blur');
            expect(composerSrc).toContain('textModifiers');
        });

        it('layoutComposer must pass designStrategy to overlay system', () => {
            expect(composerSrc).toContain('overlayApproach');
            expect(composerSrc).toContain('designStrategy');
        });
    });

    // ── Design strategy tests ──
    describe('designStrategy types', () => {
        it('parseDesignStrategy should handle missing/invalid data', async () => {
            const { parseDesignStrategy } = await import('./designStrategy');
            const result = parseDesignStrategy(null);
            expect(result.overlayApproach).toBe('gradient-scrim');
            expect(result.ctaStyle).toBe('pill');
        });

        it('parseDesignStrategy should validate overlay approach values', async () => {
            const { parseDesignStrategy } = await import('./designStrategy');
            const result = parseDesignStrategy({ overlayApproach: 'invalid-thing' });
            expect(result.overlayApproach).toBe('gradient-scrim'); // falls back to default
        });

        it('parseDesignStrategy should clamp brightness to valid range', async () => {
            const { parseDesignStrategy } = await import('./designStrategy');
            const result = parseDesignStrategy({ imageFilters: { brightness: -0.9, blur: 10 } });
            expect(result.imageFilters.brightness).toBeGreaterThanOrEqual(-0.4);
            expect(result.imageFilters.blur).toBeLessThanOrEqual(5);
        });

        it('parseDesignStrategy should accept valid values', async () => {
            const { parseDesignStrategy } = await import('./designStrategy');
            const result = parseDesignStrategy({
                overlayApproach: 'text-shadow-only',
                ctaStyle: 'outlined',
                imageFilters: { brightness: -0.2, blur: 1.5 },
                textHierarchy: { headlineOpacity: 1.0, subheadlineOpacity: 0.7, tagIsAccent: true },
            });
            expect(result.overlayApproach).toBe('text-shadow-only');
            expect(result.ctaStyle).toBe('outlined');
            expect(result.imageFilters.brightness).toBe(-0.2);
            expect(result.textHierarchy.subheadlineOpacity).toBe(0.7);
        });
    });
});
