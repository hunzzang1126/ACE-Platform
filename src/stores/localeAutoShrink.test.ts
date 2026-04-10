// ─────────────────────────────────────────────────
// localeAutoShrink.test.ts — Auto-shrink font size tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
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
