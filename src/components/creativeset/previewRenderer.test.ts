// ─────────────────────────────────────────────────
// previewRenderer.test.ts — Canvas2D rendering utilities
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/engine/elementConverters', () => ({
    constraintsToAbsolute: () => ({ x: 0, y: 0, w: 100, h: 50 }),
}));
vi.mock('@/stores/videoStorage', () => ({
    loadVideoBlob: async () => null,
}));

import { getTextEffectCSS } from './previewRenderer';
import type { TextEffectConfig } from '@/schema/elements.types';

const fx = (type: string, intensity = 50, color = '#ffffff'): TextEffectConfig =>
    ({ type, intensity, color } as TextEffectConfig);

describe('getTextEffectCSS', () => {
    it('returns empty for undefined', () => {
        expect(getTextEffectCSS(undefined)).toEqual({});
    });

    it('returns empty for none', () => {
        expect(getTextEffectCSS(fx('none'))).toEqual({});
    });

    it('drop: textShadow', () => {
        expect(getTextEffectCSS(fx('drop')).textShadow).toContain('px');
    });

    it('glow: textShadow', () => {
        expect(getTextEffectCSS(fx('glow')).textShadow).toContain('0 0');
    });

    it('echo: textShadow', () => {
        expect(getTextEffectCSS(fx('echo')).textShadow).toBeDefined();
    });

    it('outline: WebkitTextStroke', () => {
        const css = getTextEffectCSS(fx('outline')) as any;
        expect(css.WebkitTextStroke).toBeDefined();
    });

    it('splice: WebkitTextStroke', () => {
        expect((getTextEffectCSS(fx('splice')) as any).WebkitTextStroke).toBeDefined();
    });

    it('neon: multiple shadow layers', () => {
        expect(getTextEffectCSS(fx('neon')).textShadow).toContain(',');
    });

    it('glitch: red/cyan', () => {
        const s = getTextEffectCSS(fx('glitch')).textShadow!;
        expect(s).toContain('#ff0000');
        expect(s).toContain('#00ffff');
    });

    it('curve: subtle shadow', () => {
        expect(getTextEffectCSS(fx('curve')).textShadow).toBeDefined();
    });

    it('70s: stroke + shadow', () => {
        const css = getTextEffectCSS(fx('70s')) as any;
        expect(css.WebkitTextStroke).toBeDefined();
        expect(css.textShadow).toContain('#ff8c00');
    });

    it('unknown: empty', () => {
        expect(getTextEffectCSS(fx('unknown'))).toEqual({});
    });

    it('intensity scaling changes output', () => {
        const lo = getTextEffectCSS(fx('drop', 10));
        const hi = getTextEffectCSS(fx('drop', 100));
        expect(lo.textShadow).not.toBe(hi.textShadow);
    });

    it('custom color used', () => {
        expect(getTextEffectCSS(fx('glow', 50, '#ff0000')).textShadow).toContain('#ff0000');
    });
});
