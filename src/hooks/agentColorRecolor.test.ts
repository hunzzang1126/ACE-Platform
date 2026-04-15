// ─────────────────────────────────────────────────
// agentColorRecolor.test.ts — Color recoloring unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { recolorTemplateElements } from './agentColorRecolor';
import type { RenderElement } from '@/services/autoDesignTypes';

const mockGuide = {
    colors: {
        gradientStart: '#1a1a2e',
        gradientEnd: '#16213e',
        accent: '#e94560',
        foreground: '#ffffff',
        accentForeground: '#ffffff',
        secondary: '#cccccc',
        tertiary: '#888888',
        background: '#0f3460',
    },
};

describe('recolorTemplateElements', () => {
    it('should recolor background gradient to guide palette', () => {
        const els: RenderElement[] = [{
            type: 'rect', x: 0, y: 0, w: 300, h: 250, name: 'background',
            gradient_start_hex: '#ff0000', gradient_end_hex: '#00ff00',
        }];
        const result = recolorTemplateElements(els, mockGuide);
        expect(result[0]!.gradient_start_hex).toBe('#1a1a2e');
        expect(result[0]!.gradient_end_hex).toBe('#16213e');
    });

    it('should convert solid background to gradient', () => {
        const els: RenderElement[] = [{
            type: 'rect', x: 0, y: 0, w: 300, h: 250, name: 'background',
            r: 0.5, g: 0.5, b: 0.5,
        }];
        const result = recolorTemplateElements(els, mockGuide);
        expect(result[0]!.gradient_start_hex).toBe('#1a1a2e');
        expect(result[0]!.gradient_end_hex).toBe('#16213e');
        expect(result[0]!.r).toBeUndefined();
    });

    it('should recolor headline text to foreground color', () => {
        const els: RenderElement[] = [{
            type: 'text', x: 10, y: 30, w: 200, h: 40, name: 'headline',
            color_hex: '#333333',
        }];
        const result = recolorTemplateElements(els, mockGuide);
        expect(result[0]!.color_hex).toBe('#ffffff');
    });

    it('should recolor subheadline to secondary color', () => {
        const els: RenderElement[] = [{
            type: 'text', x: 10, y: 80, w: 200, h: 20, name: 'subheadline',
            color_hex: '#333333',
        }];
        const result = recolorTemplateElements(els, mockGuide);
        expect(result[0]!.color_hex).toBe('#cccccc');
    });

    it('should recolor CTA button to accent color', () => {
        const els: RenderElement[] = [{
            type: 'rounded_rect', x: 50, y: 200, w: 200, h: 40, name: 'cta_button',
            r: 0.1, g: 0.1, b: 0.1,
        }];
        const result = recolorTemplateElements(els, mockGuide);
        // #e94560 → r=233, g=69, b=96
        expect(result[0]!.r).toBeCloseTo(233 / 255, 2);
        expect(result[0]!.g).toBeCloseTo(69 / 255, 2);
        expect(result[0]!.b).toBeCloseTo(96 / 255, 2);
    });

    it('should recolor CTA label to accentForeground', () => {
        const els: RenderElement[] = [{
            type: 'text', x: 50, y: 210, w: 200, h: 20, name: 'cta_label',
            color_hex: '#000000',
        }];
        const result = recolorTemplateElements(els, mockGuide);
        expect(result[0]!.color_hex).toBe('#ffffff');
    });

    it('should recolor accent shapes to accent color', () => {
        const els: RenderElement[] = [{
            type: 'rect', x: 0, y: 100, w: 300, h: 4, name: 'accent_line',
            r: 0.5, g: 0.5, b: 0.5,
        }];
        const result = recolorTemplateElements(els, mockGuide);
        expect(result[0]!.r).toBeCloseTo(233 / 255, 2);
    });

    it('should not mutate original elements', () => {
        const els: RenderElement[] = [{
            type: 'text', x: 10, y: 30, w: 200, h: 40, name: 'headline',
            color_hex: '#333333',
        }];
        const original = els[0]!.color_hex;
        recolorTemplateElements(els, mockGuide);
        expect(els[0]!.color_hex).toBe(original); // original unchanged
    });

    it('should handle empty elements array', () => {
        const result = recolorTemplateElements([], mockGuide);
        expect(result).toHaveLength(0);
    });

    it('should preserve non-color properties', () => {
        const els: RenderElement[] = [{
            type: 'text', x: 42, y: 99, w: 180, h: 30, name: 'headline',
            content: 'Test', font_size: 36, font_weight: '800',
            color_hex: '#333333', text_align: 'center',
        }];
        const result = recolorTemplateElements(els, mockGuide);
        expect(result[0]!.x).toBe(42);
        expect(result[0]!.y).toBe(99);
        expect(result[0]!.font_size).toBe(36);
        expect(result[0]!.content).toBe('Test');
        expect(result[0]!.text_align).toBe('center');
    });
});
