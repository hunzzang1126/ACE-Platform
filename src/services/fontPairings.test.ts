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
