import { describe, it, expect } from 'vitest';
import { stripCoveringRects, styleTextForImage, recolorCtaShapes } from './agentImageOverlay';
import type { HarmonyPalette } from '@/services/colorHarmony';

const makeHarmony = (overrides?: Partial<HarmonyPalette>): HarmonyPalette => ({
    headline: '#F1F5F9',
    subheadline: 'rgba(241,245,249,0.78)',
    body: 'rgba(241,245,249,0.62)',
    accent: '#2DD4BF',
    accentForeground: '#1A1A2E',
    tag: '#2DD4BF',
    tagBg: '#0F2926',
    method: 'test',
    needsShadow: false,
    ...overrides,
});

describe('stripCoveringRects', () => {
    it('strips rects covering >50% of canvas area', () => {
        const elements = [
            { type: 'rect', name: 'Rectangle #21', w: 1026, h: 1026 },
            { type: 'text', name: 'Headline', content: 'Test' },
            { type: 'rect', name: 'small_accent', w: 200, h: 13 },
        ];
        const result = stripCoveringRects(elements, 1080, 1080);
        expect(result).toHaveLength(2);
        expect(result.find(e => e.name === 'Rectangle #21')).toBeUndefined();
        expect(result.find(e => e.name === 'Headline')).toBeDefined();
        expect(result.find(e => e.name === 'small_accent')).toBeDefined();
    });

    it('preserves CTA/button rects even if large', () => {
        const elements = [
            { type: 'rect', name: 'cta_button', w: 600, h: 600 },
            { type: 'text', name: 'Headline', content: 'Test' },
        ];
        const result = stripCoveringRects(elements, 1080, 1080);
        expect(result).toHaveLength(2);
    });

    it('preserves all text elements', () => {
        const elements = [
            { type: 'text', name: 'headline', content: 'Big Title' },
            { type: 'text', name: 'body', content: 'Body text' },
            { type: 'rect', name: 'bg', w: 1080, h: 1080 },
        ];
        const result = stripCoveringRects(elements, 1080, 1080);
        const textCount = result.filter(e => e.type === 'text').length;
        expect(textCount).toBe(2);
    });

    it('keeps small decorative rects', () => {
        const elements = [
            { type: 'rect', name: 'accent_bar', w: 200, h: 5 },
            { type: 'rect', name: 'divider', w: 300, h: 2 },
        ];
        const result = stripCoveringRects(elements, 1080, 1080);
        expect(result).toHaveLength(2);
    });
});

describe('styleTextForImage', () => {
    it('★ uses harmony.headline color (not hardcoded white)', () => {
        const harmony = makeHarmony({ headline: '#E8D5B5' });
        const elements = [
            { type: 'text', name: 'Headline', font_size: 60 },
        ];
        styleTextForImage(elements, harmony, {});
        expect(elements[0].color_hex).toBe('#E8D5B5');
    });

    it('applies strong shadow (blur=24, opacity=0.9)', () => {
        const harmony = makeHarmony();
        const elements = [
            { type: 'text', name: 'Headline', font_size: 60 },
        ];
        styleTextForImage(elements, harmony, {});
        expect(elements[0].shadow_blur).toBe(24);
        expect(elements[0].shadow_opacity).toBe(0.9);
    });

    it('uses harmony.subheadline for body text', () => {
        const harmony = makeHarmony({ subheadline: 'rgba(200,200,200,0.8)' });
        const elements = [
            { type: 'text', name: 'Body', font_size: 16 },
        ];
        styleTextForImage(elements, harmony, {});
        expect(elements[0].color_hex).toBe('rgba(200,200,200,0.8)');
    });

    it('skips non-text elements', () => {
        const harmony = makeHarmony();
        const elements = [
            { type: 'rect', name: 'bg', w: 100, h: 100 },
        ];
        styleTextForImage(elements, harmony, {});
        expect((elements[0] as any).color_hex).toBeUndefined();
    });
});

describe('recolorCtaShapes', () => {
    it('recolors CTA shapes with harmony accent', () => {
        const harmony = makeHarmony({ accent: '#FF6600' });
        const elements = [
            { type: 'rect', name: 'cta_button', r: 0, g: 0, b: 0 },
        ];
        recolorCtaShapes(elements, harmony);
        expect(elements[0].r).toBeCloseTo(1.0);
        expect(elements[0].g).toBeCloseTo(0.4);
        expect(elements[0].b).toBe(0);
    });

    it('does not touch non-CTA rects', () => {
        const harmony = makeHarmony({ accent: '#FF0000' });
        const elements = [
            { type: 'rect', name: 'accent_bar', r: 0.5, g: 0.5, b: 0.5 },
        ];
        recolorCtaShapes(elements, harmony);
        expect(elements[0].r).toBe(0.5);
    });
});
