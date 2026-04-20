// ─────────────────────────────────────────────────
// contrastHelpers.test.ts — Luminance + contrast tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { hexLuminance, averageLuminance, hasMinContrast, contrastingTextColor } from './contrastHelpers';

describe('hexLuminance', () => {
    it('returns 0 for pure black', () => {
        expect(hexLuminance('#000000')).toBeCloseTo(0, 3);
    });

    it('returns 1 for pure white', () => {
        expect(hexLuminance('#FFFFFF')).toBeCloseTo(1, 3);
    });

    it('returns ~0.2126 for pure red', () => {
        expect(hexLuminance('#FF0000')).toBeCloseTo(0.2126, 3);
    });

    it('handles lowercase hex', () => {
        expect(hexLuminance('#ffffff')).toBeCloseTo(1, 3);
    });

    it('handles hex without #', () => {
        expect(hexLuminance('000000')).toBeCloseTo(0, 3);
    });

    it('returns 0.5 for malformed hex (safety)', () => {
        expect(hexLuminance('#FFF')).toBe(0.5);
    });

    it('mid-gray is between 0 and 1', () => {
        const lum = hexLuminance('#808080');
        expect(lum).toBeGreaterThan(0.1);
        expect(lum).toBeLessThan(0.5);
    });
});

describe('averageLuminance', () => {
    it('average of black and white is 0.5', () => {
        expect(averageLuminance('#000000', '#FFFFFF')).toBeCloseTo(0.5, 3);
    });

    it('average of same color is that luminance', () => {
        const lum = hexLuminance('#FF0000');
        expect(averageLuminance('#FF0000', '#FF0000')).toBeCloseTo(lum, 3);
    });
});

describe('hasMinContrast', () => {
    it('white on black has sufficient contrast', () => {
        expect(hasMinContrast('#FFFFFF', '#000000')).toBe(true);
    });

    it('white on white does NOT have sufficient contrast', () => {
        expect(hasMinContrast('#FFFFFF', '#F0F0F0')).toBe(false);
    });

    it('custom threshold works', () => {
        // White vs mid-gray — contrast ~0.78, threshold 0.7 → true
        expect(hasMinContrast('#FFFFFF', '#333333', 0.7)).toBe(true);
    });
});

describe('contrastingTextColor', () => {
    it('returns dark text for light backgrounds', () => {
        expect(contrastingTextColor(0.8)).toBe('#1A1A2E');
    });

    it('returns white text for dark backgrounds', () => {
        expect(contrastingTextColor(0.2)).toBe('#FFFFFF');
    });

    it('returns dark text at boundary (0.5 = light)', () => {
        expect(contrastingTextColor(0.51)).toBe('#1A1A2E');
    });

    it('returns white text just below boundary', () => {
        expect(contrastingTextColor(0.49)).toBe('#FFFFFF');
    });
});

describe('★ REGRESSION: contrast safety', () => {
    it('★ REGRESSION: white text on white bg is detected as low contrast', () => {
        expect(hasMinContrast('#FFFFFF', '#FFFFFF')).toBe(false);
    });

    it('★ REGRESSION: dark text on dark bg is detected as low contrast', () => {
        expect(hasMinContrast('#1A1A2E', '#0B0F1A')).toBe(false);
    });
});
