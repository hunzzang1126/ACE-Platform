// ─────────────────────────────────────────────────
// localeAutoShrink.test.ts — Auto-shrink font size tests
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeAll } from 'vitest';
import { estimateTextHeight, calcAutoShrinkFontSize } from './localeAutoShrink';

describe('estimateTextHeight', () => {
    it('returns single line height for short text', () => {
        // "Hi" at 32px, lineHeight 1.2, in a 200px box
        const h = estimateTextHeight('Hi', 32, 1.2, 200);
        expect(h).toBeCloseTo(32 * 1.2, 0); // 1 line
    });

    it('wraps long Latin text', () => {
        // Long text that should wrap
        const h = estimateTextHeight('This is a long headline text', 32, 1.2, 200);
        expect(h).toBeGreaterThan(32 * 1.2); // more than 1 line
    });

    it('handles CJK characters (wider)', () => {
        // Korean: each char ≈ 1em wide at 32px
        // "디자인은" = 4 chars × 32px = 128px → fits in 200px = 1 line
        const h1 = estimateTextHeight('디자인은', 32, 1.2, 200);
        expect(h1).toBeCloseTo(32 * 1.2, 0);

        // "디자인은 어렵지 않습니다" = 11 chars (no space counts)
        // 11 × 32 = 352px → wraps in 200px box → 2 lines
        const h2 = estimateTextHeight('디자인은 어렵지 않습니다', 32, 1.2, 200);
        expect(h2).toBeGreaterThan(32 * 1.2); // wraps
    });

    it('handles explicit line breaks', () => {
        const h = estimateTextHeight('Line 1\nLine 2\nLine 3', 16, 1.2, 200);
        expect(h).toBeCloseTo(3 * 16 * 1.2, 0);
    });

    it('edge case: zero width returns single line', () => {
        const h = estimateTextHeight('Hello', 32, 1.2, 0);
        expect(h).toBe(32 * 1.2);
    });

    it('edge case: empty string', () => {
        const h = estimateTextHeight('', 32, 1.2, 200);
        expect(h).toBeCloseTo(32 * 1.2, 0);
    });
});

describe('calcAutoShrinkFontSize', () => {
    it('returns original fontSize when text fits', () => {
        // Short text in large box → no shrink needed
        const size = calcAutoShrinkFontSize('Hello', 32, 1.2, 200, 200);
        expect(size).toBe(32);
    });

    it('shrinks fontSize when text overflows', () => {
        // Very long text in small box
        const size = calcAutoShrinkFontSize(
            '디자인은 어렵지 않습니다 차세대 크리에이티브',
            48, 1.2, 200, 60
        );
        expect(size).toBeLessThan(48);
        expect(size).toBeGreaterThan(8); // doesn't go below minFontSize
    });

    it('respects minimum font size', () => {
        // Impossibly long text in tiny box
        const size = calcAutoShrinkFontSize(
            '디자인은 어렵지 않습니다 차세대 크리에이티브 플랫폼을 경험해보세요',
            48, 1.2, 50, 20, 10
        );
        expect(size).toBeGreaterThanOrEqual(10); // minFontSize = 10
    });

    it('uses default minFontSize of 8', () => {
        const size = calcAutoShrinkFontSize(
            '디자인은 어렵지 않습니다 차세대 크리에이티브 플랫폼을 경험해보세요 지금 바로 시작하세요',
            48, 1.2, 30, 10
        );
        expect(size).toBeGreaterThanOrEqual(8);
    });

    it('handles empty text gracefully', () => {
        const size = calcAutoShrinkFontSize('', 32, 1.2, 200, 200);
        expect(size).toBe(32);
    });

    it('handles zero box dimensions', () => {
        const size = calcAutoShrinkFontSize('Hello', 32, 1.2, 0, 0);
        expect(size).toBe(32); // no crash
    });
});

describe('calcAutoShrinkFontSize — locale scenarios', () => {
    it('English → Korean: shrinks headline that overflows', () => {
        // Simulate: "Design Is not Hard" (fits at 48px)
        const enSize = calcAutoShrinkFontSize('Design Is not Hard', 48, 1.2, 250, 120);
        expect(enSize).toBe(48); // English fits

        // "디자인은 어렵지 않습니다" (Korean, wider chars)
        const koSize = calcAutoShrinkFontSize('디자인은 어렵지 않습니다', 48, 1.2, 250, 120);
        // Korean needs more lines → should shrink
        expect(koSize).toBeLessThan(48);
    });

    it('English → German: shrinks longer German text', () => {
        // German tends to be 30% longer than English
        const enSize = calcAutoShrinkFontSize('Shop Now', 24, 1.2, 160, 30);
        const deSize = calcAutoShrinkFontSize('Jetzt einkaufen', 24, 1.2, 160, 30);
        expect(enSize).toBe(24);
        expect(deSize).toBeLessThanOrEqual(24);
    });

    it('returns original size when switching back to original locale', () => {
        // Simulates restoring original fontSize
        const origSize = calcAutoShrinkFontSize('Design Is not Hard', 48, 1.2, 250, 120);
        expect(origSize).toBe(48);
    });
});

describe('computeLocaleFontSizes', () => {
    // Must import separately
    let computeLocaleFontSizes: typeof import('./localeAutoShrink').computeLocaleFontSizes;

    beforeAll(async () => {
        const mod = await import('./localeAutoShrink');
        computeLocaleFontSizes = mod.computeLocaleFontSizes;
    });

    const makeElements = (fontSize = 48) => [
        {
            name: 'Headline', type: 'text', fontSize,
            lineHeight: 1.2, constraints: { size: { width: 250, height: 60 } },
        },
        {
            name: 'Sub', type: 'text', fontSize: 16,
            lineHeight: 1.4, constraints: { size: { width: 200, height: 30 } },
        },
        {
            name: 'BG', type: 'shape',
            constraints: { size: { width: 300, height: 250 } },
        },
    ];

    it('returns original fontSizes for original locale', () => {
        const result = computeLocaleFontSizes(
            makeElements() as any,
            { Headline: 'Hello', Sub: 'World' },
            { Headline: 48, Sub: 16 },
            true, // isOriginal
        );
        expect(result.Headline).toBe(48);
        expect(result.Sub).toBe(16);
    });

    it('shrinks for non-original locale with long text', () => {
        const result = computeLocaleFontSizes(
            makeElements() as any,
            { Headline: 'DES BAGUES WSOP SERONT REMPORTÉES', Sub: 'Texte' },
            { Headline: 48, Sub: 16 },
            false, // not original
        );
        expect(result.Headline).toBeLessThan(48); // FR headline is long
        expect(result.Sub).toBeLessThanOrEqual(16); // Sub may or may not shrink
    });

    it('ignores non-text elements', () => {
        const result = computeLocaleFontSizes(
            makeElements() as any,
            { BG: 'ignored' },
            { Headline: 48 },
            false,
        );
        expect(result.BG).toBeUndefined(); // shape not in result
    });

    it('uses element fontSize when originalFontSizes is empty', () => {
        const result = computeLocaleFontSizes(
            makeElements(32) as any,
            { Headline: 'Hi' },
            {}, // empty originalFontSizes
            true,
        );
        expect(result.Headline).toBe(32); // falls back to element.fontSize
    });

    it('only processes elements present in targetMap', () => {
        const result = computeLocaleFontSizes(
            makeElements() as any,
            { Headline: 'Hello' }, // Sub not in targetMap
            { Headline: 48, Sub: 16 },
            true,
        );
        expect(result.Headline).toBe(48);
        expect(result.Sub).toBeUndefined(); // Sub not in targetMap
    });

    it('per-locale independence: EN vs KO vs FR produce different sizes', () => {
        const els = makeElements() as any;
        const origSizes = { Headline: 48 };

        const en = computeLocaleFontSizes(els, { Headline: 'WSOP RINGS' }, origSizes, true);
        const ko = computeLocaleFontSizes(els, { Headline: 'WSOP 반지가 수여될 것입니다' }, origSizes, false);
        const fr = computeLocaleFontSizes(els, { Headline: 'DES BAGUES WSOP SERONT REMPORTÉES' }, origSizes, false);

        expect(en.Headline).toBe(48); // original
        expect(ko.Headline).toBeLessThanOrEqual(48);
        expect(fr.Headline).toBeLessThanOrEqual(ko.Headline); // FR longest → smallest or equal font
    });
});

describe('isLegacyFlatFontSizes', () => {
    let isLegacyFlatFontSizes: typeof import('./localeAutoShrink').isLegacyFlatFontSizes;

    beforeAll(async () => {
        const mod = await import('./localeAutoShrink');
        isLegacyFlatFontSizes = mod.isLegacyFlatFontSizes;
    });

    it('detects flat map { Headline: 48 } as legacy', () => {
        expect(isLegacyFlatFontSizes({ Headline: 48, Sub: 16 })).toBe(true);
    });

    it('detects nested map { variantId: { Headline: 48 } } as NOT legacy', () => {
        expect(isLegacyFlatFontSizes({ 'v-123': { Headline: 48 } })).toBe(false);
    });

    it('returns false for empty object', () => {
        expect(isLegacyFlatFontSizes({})).toBe(false);
    });
});

describe('migrateLegacyFontSizes', () => {
    let migrateLegacyFontSizes: typeof import('./localeAutoShrink').migrateLegacyFontSizes;

    beforeAll(async () => {
        const mod = await import('./localeAutoShrink');
        migrateLegacyFontSizes = mod.migrateLegacyFontSizes;
    });

    const variants = [
        { id: 'master', preset: { width: 300, height: 250 } },
        { id: 'big', preset: { width: 1080, height: 1080 } },
        { id: 'tall', preset: { width: 300, height: 600 } },
    ];

    it('preserves master fontSize exactly', () => {
        const result = migrateLegacyFontSizes({ Headline: 112 }, variants, 'master');
        expect(result['master']!.Headline).toBe(112);
    });

    it('★ REGRESSION: scales non-master by uniformScale ratio', () => {
        const result = migrateLegacyFontSizes({ Headline: 112 }, variants, 'master');
        // big: min(1080/300, 1080/250) = min(3.6, 4.32) = 3.6
        expect(result['big']!.Headline).toBe(Math.round(112 * 3.6)); // 403
    });

    it('handles tall variant (different aspect ratio)', () => {
        const result = migrateLegacyFontSizes({ Headline: 112 }, variants, 'master');
        // tall: min(300/300, 600/250) = min(1, 2.4) = 1
        expect(result['tall']!.Headline).toBe(112); // same as master (1:1 width)
    });

    it('respects minimum fontSize of 8', () => {
        const tinyVariants = [
            { id: 'master', preset: { width: 300, height: 250 } },
            { id: 'micro', preset: { width: 30, height: 25 } },
        ];
        const result = migrateLegacyFontSizes({ Sub: 12 }, tinyVariants, 'master');
        // micro: min(30/300, 25/250) = 0.1 → 12*0.1=1.2 → clamped to 8
        expect(result['micro']!.Sub).toBe(8);
    });

    it('handles multiple elements', () => {
        const result = migrateLegacyFontSizes(
            { Headline: 112, Sub: 32, CTA: 14 },
            variants, 'master',
        );
        expect(Object.keys(result['master']!)).toHaveLength(3);
        expect(Object.keys(result['big']!)).toHaveLength(3);
        expect(result['big']!.Sub).toBe(Math.round(32 * 3.6)); // 115
        expect(result['big']!.CTA).toBe(Math.round(14 * 3.6)); // 50
    });
});
