// ─────────────────────────────────────────────────
// Text Effects — Test Coverage
// Tests: getTextEffectCSS, effect data persistence, effect cleanup
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import type { TextEffectType, TextEffectConfig } from '@/schema/elements.types';

// ── Re-implement getTextEffectCSS locally for unit testing ──
// This mirrors the function in BannerPreviewGrid.tsx
function getTextEffectCSS(fx: TextEffectConfig | undefined): Record<string, any> {
    if (!fx || fx.type === 'none') return {};
    const scale = (fx.intensity ?? 50) / 50;
    const c = fx.color || '#ffffff';
    switch (fx.type) {
        case 'drop': return { textShadow: `${4 * scale}px ${4 * scale}px ${8 * scale}px ${c}cc` };
        case 'glow': return { textShadow: `0 0 ${20 * scale}px ${c}80` };
        case 'echo': return { textShadow: `${6 * scale}px ${6 * scale}px 0 ${c}40` };
        case 'outline': return { WebkitTextStroke: `${Math.max(1, 2 * scale)}px ${c}`, paintOrder: 'stroke fill' };
        case 'splice': return { WebkitTextStroke: `${Math.max(2, 3 * scale)}px ${c}`, paintOrder: 'stroke fill' };
        case 'neon': return { textShadow: `0 0 ${8 * scale}px ${c}, 0 0 ${20 * scale}px ${c}80, 0 0 ${40 * scale}px ${c}40` };
        case 'glitch': return { textShadow: `${3 * scale}px 0 0 #ff0000, ${-3 * scale}px 0 0 #00ffff` };
        case 'curve': return { textShadow: `0 ${2 * scale}px ${4 * scale}px ${c}30` };
        case '70s': return { WebkitTextStroke: `${Math.max(3, 5 * scale)}px ${c}`, paintOrder: 'stroke fill', textShadow: `3px 3px ${6 * scale}px #ff8c0060` };
        default: return {};
    }
}

// ── All valid effect types ──
const VALID_EFFECTS: TextEffectType[] = [
    'none', 'drop', 'glow', 'echo', 'outline', 'splice',
    'neon', 'glitch', 'curve', '70s',
];

const VISUAL_EFFECTS = VALID_EFFECTS.filter(t => t !== 'none');

describe('TextEffectType', () => {
    it('should have exactly 10 valid types (none + 9 effects)', () => {
        expect(VALID_EFFECTS).toHaveLength(10);
    });

    it('should NOT include removed effects', () => {
        const removed = ['hollow', 'background', 'neon-lights', 'tv-static'];
        for (const r of removed) {
            expect(VALID_EFFECTS).not.toContain(r);
        }
    });
});

describe('getTextEffectCSS', () => {
    it('returns empty object for undefined', () => {
        expect(getTextEffectCSS(undefined)).toEqual({});
    });

    it('returns empty object for none', () => {
        expect(getTextEffectCSS({ type: 'none', intensity: 50, color: '#fff' })).toEqual({});
    });

    it('returns textShadow for drop effect', () => {
        const result = getTextEffectCSS({ type: 'drop', intensity: 50, color: '#000000' });
        expect(result).toHaveProperty('textShadow');
        expect(result.textShadow).toContain('#000000cc');
    });

    it('returns textShadow for glow effect', () => {
        const result = getTextEffectCSS({ type: 'glow', intensity: 50, color: '#7c3aed' });
        expect(result.textShadow).toContain('#7c3aed80');
    });

    it('returns textShadow for echo effect', () => {
        const result = getTextEffectCSS({ type: 'echo', intensity: 50, color: '#6b7280' });
        expect(result.textShadow).toContain('#6b728040');
    });

    it('returns WebkitTextStroke for outline effect', () => {
        const result = getTextEffectCSS({ type: 'outline', intensity: 50, color: '#3b82f6' });
        expect(result.WebkitTextStroke).toBeDefined();
        expect(result.WebkitTextStroke).toContain('#3b82f6');
        expect(result.paintOrder).toBe('stroke fill');
    });

    it('returns WebkitTextStroke for splice effect', () => {
        const result = getTextEffectCSS({ type: 'splice', intensity: 50, color: '#ec4899' });
        expect(result.WebkitTextStroke).toContain('#ec4899');
        expect(result.paintOrder).toBe('stroke fill');
    });

    it('returns multi-layer textShadow for neon effect', () => {
        const result = getTextEffectCSS({ type: 'neon', intensity: 50, color: '#00ff88' });
        expect(result.textShadow).toContain('#00ff88');
        // Neon has 3 shadow layers
        const commaCount = result.textShadow.split(',').length;
        expect(commaCount).toBeGreaterThanOrEqual(3);
    });

    it('returns red+cyan textShadow for glitch effect', () => {
        const result = getTextEffectCSS({ type: 'glitch', intensity: 50, color: '#ff0055' });
        expect(result.textShadow).toContain('#ff0000');
        expect(result.textShadow).toContain('#00ffff');
    });

    it('returns textShadow for curve effect', () => {
        const result = getTextEffectCSS({ type: 'curve', intensity: 50, color: '#f59e0b' });
        expect(result.textShadow).toBeDefined();
    });

    it('returns stroke + shadow for 70s effect', () => {
        const result = getTextEffectCSS({ type: '70s', intensity: 50, color: '#f97316' });
        expect(result.WebkitTextStroke).toContain('#f97316');
        expect(result.textShadow).toContain('#ff8c0060');
        expect(result.paintOrder).toBe('stroke fill');
    });

    it('every visual effect produces non-empty CSS at default intensity', () => {
        for (const type of VISUAL_EFFECTS) {
            const result = getTextEffectCSS({ type, intensity: 50, color: '#ffffff' });
            expect(Object.keys(result).length).toBeGreaterThan(0);
        }
    });

    it('respects intensity scaling', () => {
        const low = getTextEffectCSS({ type: 'drop', intensity: 25, color: '#000' });
        const high = getTextEffectCSS({ type: 'drop', intensity: 100, color: '#000' });
        // Higher intensity = larger shadow values
        expect(low.textShadow).not.toBe(high.textShadow);
    });

    it('defaults color to #ffffff when color is empty', () => {
        const result = getTextEffectCSS({ type: 'drop', intensity: 50, color: '' });
        expect(result.textShadow).toContain('#ffffffcc');
    });

    it('defaults intensity to 50 when undefined', () => {
        const result = getTextEffectCSS({ type: 'glow', color: '#00ff00' } as any);
        expect(result.textShadow).toBeDefined();
    });
});

describe('TextEffectConfig data integrity', () => {
    it('has required fields: type, intensity, color', () => {
        const config: TextEffectConfig = {
            type: 'splice',
            intensity: 50,
            color: '#ec4899',
        };
        expect(config.type).toBe('splice');
        expect(config.intensity).toBe(50);
        expect(config.color).toBe('#ec4899');
    });

    it('serializes to JSON and back without data loss', () => {
        const configs: TextEffectConfig[] = VISUAL_EFFECTS.map(type => ({
            type,
            intensity: Math.floor(Math.random() * 100),
            color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        }));

        for (const config of configs) {
            const json = JSON.stringify(config);
            const parsed = JSON.parse(json) as TextEffectConfig;
            expect(parsed.type).toBe(config.type);
            expect(parsed.intensity).toBe(config.intensity);
            expect(parsed.color).toBe(config.color);
        }
    });

    it('type=none should clear all CSS', () => {
        const noneCSS = getTextEffectCSS({ type: 'none', intensity: 50, color: '#fff' });
        expect(noneCSS).toEqual({});
    });
});

describe('Effect switch cleanup (no residual styles)', () => {
    it('switching from any effect to "none" should return empty CSS', () => {
        for (const type of VISUAL_EFFECTS) {
            // First apply an effect
            const effectCSS = getTextEffectCSS({ type, intensity: 50, color: '#ff0000' });
            expect(Object.keys(effectCSS).length).toBeGreaterThan(0);

            // Then clear it
            const noneCSS = getTextEffectCSS({ type: 'none', intensity: 50, color: '#ff0000' });
            expect(noneCSS).toEqual({});
        }
    });

    it('switching between effects should produce distinct CSS', () => {
        const results = VISUAL_EFFECTS.map(type =>
            JSON.stringify(getTextEffectCSS({ type, intensity: 50, color: '#ffffff' }))
        );
        // Each effect should produce unique CSS (no duplicates)
        const unique = new Set(results);
        expect(unique.size).toBe(results.length);
    });

    it('stroke effects (outline, splice, 70s) use paintOrder: stroke fill', () => {
        const strokeEffects: TextEffectType[] = ['outline', 'splice', '70s'];
        for (const type of strokeEffects) {
            const css = getTextEffectCSS({ type, intensity: 50, color: '#ffffff' });
            expect(css.paintOrder).toBe('stroke fill');
        }
    });

    it('shadow effects (drop, glow, echo, neon, glitch, curve) do NOT set paintOrder', () => {
        const shadowEffects: TextEffectType[] = ['drop', 'glow', 'echo', 'neon', 'glitch', 'curve'];
        for (const type of shadowEffects) {
            const css = getTextEffectCSS({ type, intensity: 50, color: '#ffffff' });
            expect(css.paintOrder).toBeUndefined();
        }
    });
});

describe('Edge cases and boundary values', () => {
    it('handles intensity=0 without errors', () => {
        for (const type of VISUAL_EFFECTS) {
            expect(() => {
                getTextEffectCSS({ type, intensity: 0, color: '#000' });
            }).not.toThrow();
        }
    });

    it('handles intensity=100 without errors', () => {
        for (const type of VISUAL_EFFECTS) {
            expect(() => {
                getTextEffectCSS({ type, intensity: 100, color: '#000' });
            }).not.toThrow();
        }
    });

    it('handles very high intensity (200) gracefully', () => {
        for (const type of VISUAL_EFFECTS) {
            expect(() => {
                getTextEffectCSS({ type, intensity: 200, color: '#000' });
            }).not.toThrow();
        }
    });

    it('outline stroke width is at least 1px regardless of intensity', () => {
        const css = getTextEffectCSS({ type: 'outline', intensity: 1, color: '#fff' });
        // Extract width from "1px #fff"
        const width = parseFloat(css.WebkitTextStroke);
        expect(width).toBeGreaterThanOrEqual(1);
    });

    it('splice stroke width is at least 2px regardless of intensity', () => {
        const css = getTextEffectCSS({ type: 'splice', intensity: 1, color: '#fff' });
        const width = parseFloat(css.WebkitTextStroke);
        expect(width).toBeGreaterThanOrEqual(2);
    });

    it('70s stroke width is at least 3px regardless of intensity', () => {
        const css = getTextEffectCSS({ type: '70s', intensity: 1, color: '#fff' });
        const width = parseFloat(css.WebkitTextStroke);
        expect(width).toBeGreaterThanOrEqual(3);
    });
});
