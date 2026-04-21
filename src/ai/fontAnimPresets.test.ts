// ─────────────────────────────────────────────────
// fontAnimPresets.test.ts + fontAnimGenerator.test.ts
// ─────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { FONT_ANIM_PRESETS, getAnimPreset, getActivePresets } from './fontAnimPresets';

describe('FONT_ANIM_PRESETS', () => {
    it('has "none" as first preset', () => {
        expect(FONT_ANIM_PRESETS[0].id).toBe('none');
    });

    it('has at least 5 total presets', () => {
        expect(FONT_ANIM_PRESETS.length).toBeGreaterThanOrEqual(5);
    });

    it('all presets have required fields', () => {
        for (const p of FONT_ANIM_PRESETS) {
            expect(p.id).toBeTruthy();
            expect(p.label).toBeTruthy();
            expect(typeof p.duration).toBe('number');
            expect(['wght', 'wdth', 'slnt']).toContain(p.axis);
            expect(['alternate', 'normal']).toContain(p.direction);
        }
    });

    it('all preset IDs are unique', () => {
        const ids = FONT_ANIM_PRESETS.map(p => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('"none" preset has duration 0', () => {
        const none = FONT_ANIM_PRESETS[0];
        expect(none.duration).toBe(0);
    });

    it('"breathing" preset exists with reasonable values', () => {
        const breathing = FONT_ANIM_PRESETS.find(p => p.id === 'breathing');
        expect(breathing).toBeDefined();
        expect(breathing!.axis).toBe('wght');
        expect(breathing!.from).toBeLessThan(breathing!.to);
        expect(breathing!.duration).toBeGreaterThan(0);
    });
});

describe('getAnimPreset', () => {
    it('returns preset by ID', () => {
        expect(getAnimPreset('breathing').id).toBe('breathing');
    });

    it('returns "none" for unknown ID', () => {
        expect(getAnimPreset('nonexistent').id).toBe('none');
    });
});

describe('getActivePresets', () => {
    it('excludes "none"', () => {
        const active = getActivePresets();
        expect(active.every(p => p.id !== 'none')).toBe(true);
    });

    it('has at least 4 active presets', () => {
        expect(getActivePresets().length).toBeGreaterThanOrEqual(4);
    });
});
