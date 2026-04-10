// ─────────────────────────────────────────────────
// AiPanelCards.test.ts — Model dropdown options
// ─────────────────────────────────────────────────
// Covers: Haiku removal, Sonnet 4 availability for all plans,
// MODEL_OPTIONS structure
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AiPanelCards.tsx'), 'utf-8');

describe('AiPanelCards — MODEL_OPTIONS', () => {
    it('★ REGRESSION: does NOT include Haiku in model options', () => {
        // Extract MODEL_OPTIONS block
        const optStart = src.indexOf('const MODEL_OPTIONS');
        const optEnd = src.indexOf('];', optStart);
        const optBlock = src.slice(optStart, optEnd + 2);
        expect(optBlock).not.toContain('Haiku');
        expect(optBlock).not.toContain('executor');
    });

    it('includes Sonnet 4 as an available option', () => {
        const optStart = src.indexOf('const MODEL_OPTIONS');
        const optEnd = src.indexOf('];', optStart);
        const optBlock = src.slice(optStart, optEnd + 2);
        expect(optBlock).toContain('Claude Sonnet 4');
    });

    it('Sonnet 4 is available to starter plan (minPlan: starter)', () => {
        const optStart = src.indexOf('const MODEL_OPTIONS');
        const optEnd = src.indexOf('];', optStart);
        const optBlock = src.slice(optStart, optEnd + 2);
        expect(optBlock).toContain("minPlan: 'starter'");
    });

    it('★ REGRESSION: Sonnet 4 is NOT locked behind creator plan', () => {
        const optStart = src.indexOf('const MODEL_OPTIONS');
        const optEnd = src.indexOf('];', optStart);
        const optBlock = src.slice(optStart, optEnd + 2);
        // Should NOT have minPlan: 'creator' for Sonnet
        expect(optBlock).not.toContain("minPlan: 'creator'");
    });
});

describe('AiPanelCards — component exports', () => {
    it('exports ActionCardInline', () => {
        expect(src).toContain('export function ActionCardInline');
    });

    it('exports ThinkingCard', () => {
        expect(src).toContain('export function ThinkingCard');
    });

    it('exports ModelDropdown', () => {
        expect(src).toContain('export function ModelDropdown');
    });

    it('exports ImageGalleryCard', () => {
        expect(src).toContain('export function ImageGalleryCard');
    });
});
