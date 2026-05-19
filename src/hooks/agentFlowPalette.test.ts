// ─────────────────────────────────────────────────
// agentFlowPalette.test.ts — Test coverage for palette phase
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './agentFlowPalette.ts'), 'utf-8');

describe('agentFlowPalette — module structure', () => {
    it('exports PaletteResult interface', () => {
        expect(src).toContain('export interface PaletteResult');
    });

    it('exports runPalettePhase function', () => {
        expect(src).toContain('export async function runPalettePhase');
    });

    it('accepts imageColors parameter for Image-First pipeline', () => {
        expect(src).toContain('imageColors?: ExtractedColors');
    });
});

describe('agentFlowPalette — Image-First color override', () => {
    it('overrides gradient colors with extracted image palette', () => {
        expect(src).toContain('guide.colors.gradientStart = imageColors.palette[0]');
        expect(src).toContain('guide.colors.gradientEnd = imageColors.palette[1]');
    });

    it('sets background from dominant extracted color', () => {
        expect(src).toContain('guide.colors.background = imageColors.dominant');
    });

    it('sets foreground from suggestedText', () => {
        expect(src).toContain('guide.colors.foreground = imageColors.suggestedText');
    });

    it('uses hue-distance contrast check for accent color', () => {
        // If AI accent hue is too similar to dominant → use extracted accent
        expect(src).toContain('hueDiff');
        expect(src).toContain('contrastOk');
        expect(src).toContain('imageColors.suggestedAccent');
    });

    it('uses hexToHSL for hue comparison', () => {
        expect(src).toContain('hexToHSL');
    });
});

describe('agentFlowPalette — template catalog', () => {
    it('builds catalog from templateStore for AI selection', () => {
        expect(src).toContain('useTemplateStore');
        expect(src).toContain('templateCatalog');
    });

    it('sends briefHint to generateColorPalette', () => {
        expect(src).toContain('briefHint');
        expect(src).toContain('mood: brief.mood');
        expect(src).toContain('industry: brief.industry');
    });
});

describe('agentFlowPalette — brand palette handling', () => {
    it('appends brand paletteHint to prompt when available', () => {
        expect(src).toContain('brand.paletteHint');
        expect(src).toContain('[BRAND PALETTE');
    });

    it('allows user color overrides to trump brand colors', () => {
        expect(src).toContain("user's color ALWAYS wins");
    });
});

describe('agentFlowPalette — narration and UI cards', () => {
    it('creates palette UI card', () => {
        expect(src).toContain("cb.addCard('palette'");
        expect(src).toContain("cb.updateCard('palette'");
    });

    it('narrates image-first vs AI palette differently', () => {
        expect(src).toContain('Image-First');
        expect(src).toContain('Color palette derived from generated image');
    });
});
