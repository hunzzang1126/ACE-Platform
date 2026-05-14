// ─────────────────────────────────────────────────
// fontPairings.test.ts — Deterministic font selection
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { selectFontPair } from './fontPairings';

describe('fontPairings — selectFontPair', () => {
    it('returns mood-based pair for known mood', () => {
        const pair = selectFontPair('elegant', 'general');
        expect(pair.primary).toBe('Playfair Display');
        expect(pair.secondary).toBe('DM Sans');
    });

    it('falls back to industry when mood is general', () => {
        const pair = selectFontPair('general', 'tech');
        expect(pair.primary).toBe('Space Grotesk');
        expect(pair.secondary).toBe('Inter');
    });

    it('uses default for unknown mood + industry', () => {
        const pair = selectFontPair('unknown-mood', 'unknown-industry');
        expect(pair.primary).toBe('Montserrat');
        expect(pair.secondary).toBe('DM Sans');
    });

    it('accepts AI hint for primary if valid Google Font', () => {
        const pair = selectFontPair('general', 'general', { primary: 'Bebas Neue', secondary: 'Inter' });
        expect(pair.primary).toBe('Bebas Neue');
    });

    it('rejects system font hints (Arial)', () => {
        const pair = selectFontPair('bold', 'general', { primary: 'Arial', secondary: 'Helvetica' });
        // Should use mood-based, not AI hint
        expect(pair.primary).toBe('Bebas Neue');
    });

    it('enforces diversity — primary ≠ secondary', () => {
        const pair = selectFontPair('general', 'general', { primary: 'Inter', secondary: 'Inter' });
        expect(pair.primary).not.toBe(pair.secondary);
    });

    it('maps bold mood correctly', () => {
        const pair = selectFontPair('bold', 'general');
        expect(pair.primary).toBe('Bebas Neue');
        expect(pair.secondary).toBe('Inter');
    });

    it('maps minimal mood correctly', () => {
        const pair = selectFontPair('minimal', 'general');
        expect(pair.primary).toBe('Space Grotesk');
        expect(pair.secondary).toBe('DM Sans');
    });

    it('maps warm mood correctly', () => {
        const pair = selectFontPair('warm', 'general');
        expect(pair.primary).toBe('Lora');
        expect(pair.secondary).toBe('DM Sans');
    });

    it('maps fashion industry correctly', () => {
        const pair = selectFontPair('general', 'fashion');
        expect(pair.primary).toBe('Playfair Display');
    });

    it('maps fitness industry correctly', () => {
        const pair = selectFontPair('general', 'fitness');
        expect(pair.primary).toBe('Oswald');
    });

    it('maps food industry correctly', () => {
        const pair = selectFontPair('general', 'food');
        expect(pair.primary).toBe('Fraunces');
    });
});

describe('fontPairings — CJK font selection', () => {
    it('detects Korean text and returns Korean font pair', () => {
        const pair = selectFontPair('general', 'general', undefined, '아이폰 17 광고');
        expect(pair.primary).toBe('Noto Sans KR');
    });

    it('uses elegant Korean pair for elegant mood', () => {
        const pair = selectFontPair('elegant', 'general', undefined, '럭셔리 브랜드');
        expect(pair.primary).toBe('Noto Serif KR');
        expect(pair.secondary).toBe('Noto Sans KR');
    });

    it('uses bold Korean pair for bold mood', () => {
        const pair = selectFontPair('bold', 'general', undefined, '세일 50%');
        expect(pair.primary).toBe('Black Han Sans');
        expect(pair.secondary).toBe('Noto Sans KR');
    });

    it('uses fun Korean pair for fun mood', () => {
        const pair = selectFontPair('fun', 'general', undefined, '맛있는 음식');
        expect(pair.primary).toBe('Jua');
    });

    it('does NOT use Korean fonts for English text', () => {
        const pair = selectFontPair('elegant', 'general', undefined, 'Luxury Brand Sale');
        expect(pair.primary).toBe('Playfair Display');
        expect(pair.primary).not.toContain('KR');
    });

    it('detects Chinese characters as CJK', () => {
        const pair = selectFontPair('general', 'general', undefined, '新品上市');
        expect(pair.primary).toContain('KR'); // Uses Korean font for all CJK
    });

    it('ignores contentHint if undefined', () => {
        const pair = selectFontPair('general', 'general');
        expect(pair.primary).toBe('Montserrat'); // default, not Korean
    });
});
