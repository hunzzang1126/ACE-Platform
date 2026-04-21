// ─────────────────────────────────────────────────
// fontAnimGenerator.test.ts — CSS generation tests
// ─────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { generateFontAnimCSS, generateFontAnimStyle } from '@/services/fontAnimGenerator';
import { getAnimPreset } from '@/ai/fontAnimPresets';

describe('generateFontAnimCSS', () => {
    it('returns empty for "none" preset', () => {
        const none = getAnimPreset('none');
        expect(generateFontAnimCSS('el-1', none)).toBe('');
    });

    it('generates @keyframes for breathing preset', () => {
        const preset = getAnimPreset('breathing');
        const css = generateFontAnimCSS('headline', preset);
        expect(css).toContain('@keyframes fa-headline');
        expect(css).toContain("'wght'");
        expect(css).toContain(String(preset.from));
        expect(css).toContain(String(preset.to));
    });

    it('generates matching class name', () => {
        const preset = getAnimPreset('pulse');
        const css = generateFontAnimCSS('el-2', preset);
        expect(css).toContain('.fa-el-2');
        expect(css).toContain('animation:');
    });

    it('includes duration and easing', () => {
        const preset = getAnimPreset('breathing');
        const css = generateFontAnimCSS('el-1', preset);
        expect(css).toContain(`${preset.duration}s`);
        expect(css).toContain(preset.easing);
    });

    it('includes iteration count', () => {
        const preset = getAnimPreset('breathing');
        const css = generateFontAnimCSS('el-1', preset);
        expect(css).toContain('infinite');
    });

    it('sanitizes element ID with special chars', () => {
        const preset = getAnimPreset('breathing');
        const css = generateFontAnimCSS('el/with.special!chars', preset);
        expect(css).not.toContain('/');
        expect(css).not.toContain('!');
    });
});

describe('generateFontAnimStyle', () => {
    it('returns null for "none" preset', () => {
        expect(generateFontAnimStyle('el-1', getAnimPreset('none'))).toBeNull();
    });

    it('returns animation properties for active preset', () => {
        const style = generateFontAnimStyle('el-1', getAnimPreset('breathing'));
        expect(style).toBeDefined();
        expect(style!.animationDuration).toContain('s');
        expect(style!.animationTimingFunction).toBe('ease-in-out');
        expect(style!.animationDirection).toBe('alternate');
    });
});
