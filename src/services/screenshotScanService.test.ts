// ─────────────────────────────────────────────────
// screenshotScanService.test.ts — Font matcher tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

// Mock anthropicClient (scanDesignScreenshot needs it)
vi.mock('@/services/anthropicClient', () => ({
    callAnthropicApi: vi.fn(),
    DEFAULT_CLAUDE_MODEL: 'claude-3-haiku',
}));

import { matchFont } from './screenshotScanService';

describe('matchFont', () => {
    it('maps display → Anton', () => {
        expect(matchFont('display')).toBe('Anton');
        expect(matchFont('Display Bold')).toBe('Anton');
    });

    it('maps impact → Anton', () => {
        expect(matchFont('impact')).toBe('Anton');
    });

    it('maps condensed → Oswald', () => {
        expect(matchFont('condensed')).toBe('Oswald');
    });

    it('maps sans-serif → Plus Jakarta Sans', () => {
        expect(matchFont('sans-serif')).toBe('Plus Jakarta Sans');
        expect(matchFont('sans')).toBe('Plus Jakarta Sans');
    });

    it('maps geometric → Jost', () => {
        expect(matchFont('geometric')).toBe('Jost');
    });

    it('maps serif → Playfair Display', () => {
        expect(matchFont('serif')).toBe('Playfair Display');
    });

    it('maps monospace → JetBrains Mono', () => {
        expect(matchFont('mono')).toBe('JetBrains Mono');
        expect(matchFont('monospace')).toBe('JetBrains Mono');
    });

    it('returns Inter for unknown', () => {
        expect(matchFont('handwritten')).toBe('Inter');
        expect(matchFont('')).toBe('Inter');
    });

    it('is case-insensitive', () => {
        expect(matchFont('DISPLAY BOLD')).toBe('Anton');
        expect(matchFont('Sans-Serif')).toBe('Plus Jakarta Sans');
    });
});
