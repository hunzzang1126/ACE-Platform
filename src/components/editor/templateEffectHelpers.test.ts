// ─────────────────────────────────────────────────
// templateEffectHelpers.test — Unit tests for textEffect → CSS conversion
// ─────────────────────────────────────────────────
// Covers: all 10 effect types, intensity scaling, color passthrough,
// edge cases, and parity with shimTextEffects.ts Fabric logic.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { textEffectToCSS, parseShadowColorForEngine } from './templateEffectHelpers';

// ═══════════════════════════════════════════════════
// textEffectToCSS — all effect types
// ═══════════════════════════════════════════════════

describe('textEffectToCSS', () => {
    it('returns undefined for "none" effect', () => {
        expect(textEffectToCSS('none', 50, '#ffffff')).toBeUndefined();
    });

    it('returns undefined for unknown effect type', () => {
        expect(textEffectToCSS('banana', 50, '#ff0000')).toBeUndefined();
    });

    // ── glow ──
    describe('glow', () => {
        it('produces centered blur shadow at default intensity', () => {
            const css = textEffectToCSS('glow', 50, '#ffffff');
            expect(css).toBe('0 0 20px #ffffff80');
        });

        it('scales blur with intensity', () => {
            const css = textEffectToCSS('glow', 100, '#ff0000');
            // scale = 100/50 = 2, blur = 20*2 = 40
            expect(css).toBe('0 0 40px #ff000080');
        });

        it('produces minimal blur at low intensity', () => {
            const css = textEffectToCSS('glow', 10, '#00ff00');
            // scale = 10/50 = 0.2, blur = round(20*0.2) = round(4) = 4
            expect(css).toBe('0 0 4px #00ff0080');
        });

        it('preserves hex color in output', () => {
            const css = textEffectToCSS('glow', 50, '#e74c3c');
            expect(css).toContain('#e74c3c');
        });
    });

    // ── drop ──
    describe('drop', () => {
        it('produces offset shadow at default intensity', () => {
            const css = textEffectToCSS('drop', 50, '#000000');
            expect(css).toBe('4px 4px 8px #000000cc');
        });

        it('scales offset and blur with intensity', () => {
            const css = textEffectToCSS('drop', 100, '#000000');
            // scale=2: offset=8, blur=16
            expect(css).toBe('8px 8px 16px #000000cc');
        });
    });

    // ── echo ──
    describe('echo', () => {
        it('produces hard-edge offset shadow', () => {
            const css = textEffectToCSS('echo', 50, '#ffffff');
            expect(css).toBe('6px 6px 0 #ffffff40');
        });
    });

    // ── neon ──
    describe('neon', () => {
        it('produces multi-layer glow (3 layers)', () => {
            const css = textEffectToCSS('neon', 50, '#ff00ff');
            expect(css).toBeDefined();
            // Should have 3 comma-separated text-shadow layers
            const layers = css!.split(',');
            expect(layers.length).toBe(3);
        });

        it('first layer uses full color, others use alpha', () => {
            const css = textEffectToCSS('neon', 50, '#ff00ff')!;
            expect(css).toContain('#ff00ff,');   // first layer: full color
            expect(css).toContain('#ff00ff80');   // second layer: 50% alpha
            expect(css).toContain('#ff00ff40');   // third layer: 25% alpha
        });
    });

    // ── glitch ──
    describe('glitch', () => {
        it('produces cyan + red offset layers', () => {
            const css = textEffectToCSS('glitch', 50, '#ffffff');
            expect(css).toContain('#00ffff');
            expect(css).toContain('#ff0000');
        });

        it('has opposing horizontal offsets', () => {
            const css = textEffectToCSS('glitch', 50, '#ffffff')!;
            // At scale=1: -3px and 3px
            expect(css).toContain('-3px');
            expect(css).toContain('3px');
        });
    });

    // ── outline ── (outline uses WebkitTextStroke, not text-shadow — returns undefined)
    describe('outline', () => {
        it('returns undefined (outline is CSS stroke, not text-shadow)', () => {
            expect(textEffectToCSS('outline', 50, '#ff0000')).toBeUndefined();
        });
    });

    // ── splice ── (same as outline — stroke-based)
    describe('splice', () => {
        it('returns undefined (splice is CSS stroke, not text-shadow)', () => {
            expect(textEffectToCSS('splice', 50, '#ff0000')).toBeUndefined();
        });
    });

    // ── curve ──
    describe('curve', () => {
        it('produces subtle downward blur', () => {
            const css = textEffectToCSS('curve', 50, '#333333');
            // scale=1: offset=(0, 2), blur=4
            expect(css).toBe('0 2px 4px #33333330');
        });
    });

    // ── 70s ──
    describe('70s', () => {
        it('produces retro orange offset shadow', () => {
            const css = textEffectToCSS('70s', 50, '#ffffff');
            expect(css).toBe('4px 4px 0 #ff8c0060');
        });

        it('ignores color param (always uses retro orange)', () => {
            const css = textEffectToCSS('70s', 50, '#0000ff');
            // 70s effect always uses #ff8c0060 regardless of color input
            expect(css).toContain('#ff8c00');
        });
    });
});

// ═══════════════════════════════════════════════════
// textEffectToCSS — intensity edge cases
// ═══════════════════════════════════════════════════

describe('textEffectToCSS — intensity edge cases', () => {
    it('handles intensity=0 (scale=0, all px values become 0)', () => {
        const css = textEffectToCSS('glow', 0, '#ffffff');
        expect(css).toBe('0 0 0px #ffffff80');
    });

    it('handles very high intensity (200)', () => {
        const css = textEffectToCSS('glow', 200, '#ffffff');
        // scale=4, blur=80
        expect(css).toBe('0 0 80px #ffffff80');
    });

    it('handles fractional intensity', () => {
        const css = textEffectToCSS('drop', 25, '#000000');
        // scale=0.5: offset=round(2)=2, blur=round(4)=4
        expect(css).toBe('2px 2px 4px #000000cc');
    });
});

// ═══════════════════════════════════════════════════
// parseShadowColorForEngine
// ═══════════════════════════════════════════════════

describe('parseShadowColorForEngine', () => {
    it('parses rgba() with alpha', () => {
        const [r, g, b, a] = parseShadowColorForEngine('rgba(255, 128, 0, 0.5)');
        expect(r).toBeCloseTo(1.0, 2);
        expect(g).toBeCloseTo(128 / 255, 2);
        expect(b).toBeCloseTo(0, 2);
        expect(a).toBeCloseTo(0.5, 2);
    });

    it('parses rgb() without alpha (defaults to 1.0)', () => {
        const [r, g, b, a] = parseShadowColorForEngine('rgb(100, 200, 50)');
        expect(r).toBeCloseTo(100 / 255, 2);
        expect(g).toBeCloseTo(200 / 255, 2);
        expect(b).toBeCloseTo(50 / 255, 2);
        expect(a).toBe(1.0);
    });

    it('parses 6-char hex', () => {
        const [r, g, b, a] = parseShadowColorForEngine('#ff8000');
        expect(r).toBeCloseTo(1.0, 2);
        expect(g).toBeCloseTo(128 / 255, 2);
        expect(b).toBe(0);
        expect(a).toBe(1.0);
    });

    it('parses hex without # prefix', () => {
        const [r, g, b, a] = parseShadowColorForEngine('ff0000');
        expect(r).toBeCloseTo(1.0, 2);
        expect(g).toBe(0);
        expect(b).toBe(0);
        expect(a).toBe(1.0);
    });

    it('returns dark default for empty string', () => {
        const [r, g, b, a] = parseShadowColorForEngine('');
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(0);
        expect(a).toBe(0.5);
    });

    it('returns dark default for short invalid color', () => {
        // Short strings (< 6 chars after # strip) hit the default branch
        const [r, g, b, a] = parseShadowColorForEngine('bad');
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(0);
        expect(a).toBe(0.5);
    });

    it('handles rgba with alpha=0', () => {
        const [, , , a] = parseShadowColorForEngine('rgba(0, 0, 0, 0)');
        expect(a).toBe(0);
    });

    it('handles rgba with alpha=1', () => {
        const [, , , a] = parseShadowColorForEngine('rgba(0, 0, 0, 1)');
        expect(a).toBe(1);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION: shimTextEffects parity
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: textEffectToCSS must match shimTextEffects logic', () => {
    it('★ REGRESSION: glow blur formula must be 20*scale (same as Fabric Shadow blur)', () => {
        // shimTextEffects.ts line 61: blur: 20 * scale
        const css = textEffectToCSS('glow', 50, '#fff')!;
        expect(css).toMatch(/0 0 20px/);
    });

    it('★ REGRESSION: drop offset formula must be 4*scale (same as Fabric Shadow offset)', () => {
        // shimTextEffects.ts line 50-51: offsetX: 4*scale, offsetY: 4*scale
        const css = textEffectToCSS('drop', 50, '#000')!;
        expect(css).toMatch(/^4px 4px/);
    });

    it('★ REGRESSION: neon must produce exactly 3 shadow layers', () => {
        // shimTextEffects.ts line 100-103: 3 layers
        const css = textEffectToCSS('neon', 50, '#f0f')!;
        expect(css.split(',').length).toBe(3);
    });
});
