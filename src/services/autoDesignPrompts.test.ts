// ─────────────────────────────────────────────────
// autoDesignPrompts.test.ts — Prompt builder tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

// Mock smartSizing to avoid pulling in engine deps
vi.mock('@/engine/smartSizing', () => ({
    classifyRatio: vi.fn().mockReturnValue('landscape'),
    LAYOUT_ZONES: {
        'landscape': { headline: { x: 0.08, y: 0.12, w: 0.84, h: 0.3 }, cta: { x: 0.3, y: 0.75, w: 0.4, h: 0.15 } },
        'square': { headline: { x: 0.08, y: 0.12, w: 0.84, h: 0.3 }, cta: { x: 0.25, y: 0.75, w: 0.5, h: 0.15 } },
        'portrait': { headline: { x: 0.08, y: 0.12, w: 0.84, h: 0.3 }, cta: { x: 0.2, y: 0.8, w: 0.6, h: 0.1 } },
        'wide': { headline: { x: 0.08, y: 0.12, w: 0.84, h: 0.3 }, cta: { x: 0.6, y: 0.3, w: 0.3, h: 0.4 } },
        'ultra-wide': { headline: { x: 0.04, y: 0.1, w: 0.5, h: 0.6 }, cta: { x: 0.7, y: 0.3, w: 0.25, h: 0.4 } },
        'ultra-tall': { headline: { x: 0.08, y: 0.1, w: 0.84, h: 0.2 }, cta: { x: 0.15, y: 0.8, w: 0.7, h: 0.1 } },
    },
    classifyMasterGroup: vi.fn().mockReturnValue('standard'),
    getMasterGroupDescriptions: vi.fn().mockReturnValue({ standard: 'Standard display formats.' }),
}));

vi.mock('@/services/designStyleGuides', () => ({
    selectStyleGuide: vi.fn().mockReturnValue({
        id: 'bold-dark',
        spacing: { safe: 12 },
        typography: {
            primaryFont: 'Inter', secondaryFont: 'Inter',
            scale: { hero: 0.12, headline: 0.08, title: 0.06, body: 0.04, caption: 0.03 },
            weights: { bold: '800', semibold: '600', normal: '400' },
            letterSpacing: { tight: -0.5 },
        },
        colors: {
            foreground: '#ffffff', secondary: '#aaa', tertiary: '#666',
            accent: '#ff6b00', accentForeground: '#fff',
            gradientStart: '#0a0e1a', gradientEnd: '#1a2e4a',
            gradientAngle: 135, surface: '#1a1a2e', muted: '#888',
        },
        radius: 8,
    }),
    buildStylePromptForAI: vi.fn().mockReturnValue('STYLE: Bold Dark'),
}));

vi.mock('@/services/goldenExamples', () => ({
    buildGoldenExamplePrompt: vi.fn().mockReturnValue('EXAMPLE: ...'),
}));

import { buildFromScratchPrompt, buildAssetContextPrompt } from './autoDesignPrompts';

describe('buildFromScratchPrompt', () => {
    it('should include canvas dimensions', () => {
        const result = buildFromScratchPrompt(300, 250, 'luxury car ad');
        expect(result).toContain('300x250');
    });

    it('should include user prompt', () => {
        const result = buildFromScratchPrompt(300, 250, 'summer sale');
        expect(result).toContain('summer sale');
    });

    it('should include composition rules', () => {
        const result = buildFromScratchPrompt(728, 90, 'digital banner');
        expect(result).toContain('LAYER 1');
        expect(result).toContain('LAYER 2');
        expect(result).toContain('LAYER 3');
        expect(result).toContain('LAYER 4');
    });

    it('should include absolute rules', () => {
        const result = buildFromScratchPrompt(300, 250, 'test');
        expect(result).toContain('NO TEXT OVERLAP');
        expect(result).toContain('canvas bounds');
    });

    it('should include style prompt', () => {
        const result = buildFromScratchPrompt(300, 250, 'test');
        expect(result).toContain('STYLE: Bold Dark');
    });

    it('should reference font sizes', () => {
        const result = buildFromScratchPrompt(300, 250, 'test');
        expect(result).toContain('px');
        expect(result).toContain('font');
    });

    it('should include CTA zone coordinates', () => {
        const result = buildFromScratchPrompt(300, 250, 'test');
        expect(result).toContain('cta_button');
        expect(result).toContain('cta_label');
    });

    it('should include render_banner instruction', () => {
        const result = buildFromScratchPrompt(300, 250, 'test');
        expect(result).toContain('render_banner');
    });
});

describe('buildAssetContextPrompt', () => {
    const elements = [
        { id: 1, name: 'bg', type: 'shape' as const, x: 0, y: 0, w: 300, h: 250 },
        { id: 2, name: 'photo', type: 'image' as const, x: 10, y: 10, w: 100, h: 100 },
    ];

    it('should include canvas dimensions', () => {
        const result = buildAssetContextPrompt(300, 250, elements, 'car ad');
        expect(result).toContain('300x250');
    });

    it('should include user prompt', () => {
        const result = buildAssetContextPrompt(300, 250, elements, 'summer sale');
        expect(result).toContain('summer sale');
    });

    it('should list existing elements', () => {
        const result = buildAssetContextPrompt(300, 250, elements, 'test');
        expect(result).toContain('"bg"');
        expect(result).toContain('"photo"');
    });

    it('should include image repositioning when hasImages=true', () => {
        const result = buildAssetContextPrompt(300, 250, elements, 'test', true);
        expect(result).toContain('Move image');
    });

    it('should include background addition instruction', () => {
        const result = buildAssetContextPrompt(300, 250, elements, 'test');
        expect(result).toContain('BACKGROUND');
        expect(result).toContain('background');
    });

    it('should include headline and CTA sections', () => {
        const result = buildAssetContextPrompt(300, 250, elements, 'test');
        expect(result).toContain('HEADLINE');
        expect(result).toContain('CTA BUTTON');
        expect(result).toContain('CTA LABEL');
    });

    it('should include padding constraint', () => {
        const result = buildAssetContextPrompt(300, 250, [], 'test');
        expect(result).toContain('padding');
    });

    it('should include rearrange_banner instruction', () => {
        const result = buildAssetContextPrompt(300, 250, [], 'test');
        expect(result).toContain('rearrange_banner');
    });

    it('should handle landscape vs portrait image placement', () => {
        // Wide canvas = landscape
        const wide = buildAssetContextPrompt(728, 90, elements, 'test', true);
        expect(wide).toContain('Move image');

        // Tall canvas = portrait
        const tall = buildAssetContextPrompt(160, 600, elements, 'test', true);
        expect(tall).toContain('Move image');
    });
});
