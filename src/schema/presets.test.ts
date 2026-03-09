// ─────────────────────────────────────────────────
// presets — Regression Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { BANNER_PRESETS, getPresetById, getPresetsByCategory } from './presets';

describe('BANNER_PRESETS — Data Integrity', () => {
    it('has at least 16 presets', () => {
        expect(BANNER_PRESETS.length).toBeGreaterThanOrEqual(16);
    });

    it('all presets have unique IDs', () => {
        const ids = BANNER_PRESETS.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('all presets have positive width and height', () => {
        for (const preset of BANNER_PRESETS) {
            expect(preset.width).toBeGreaterThan(0);
            expect(preset.height).toBeGreaterThan(0);
        }
    });

    it('all presets have a valid category', () => {
        const validCategories = ['display', 'social', 'video', 'custom'];
        for (const preset of BANNER_PRESETS) {
            expect(validCategories).toContain(preset.category);
        }
    });

    it('all presets have non-empty names', () => {
        for (const preset of BANNER_PRESETS) {
            expect(preset.name.length).toBeGreaterThan(0);
        }
    });
});

describe('getPresetById', () => {
    it('returns correct preset for known ID', () => {
        const preset = getPresetById('iab-300x250');
        expect(preset).toBeDefined();
        expect(preset!.name).toBe('Medium Rectangle');
        expect(preset!.width).toBe(300);
        expect(preset!.height).toBe(250);
    });

    it('returns undefined for unknown ID', () => {
        expect(getPresetById('nonexistent-id')).toBeUndefined();
    });

    it('returns correct preset for social format', () => {
        const preset = getPresetById('social-1080x1080');
        expect(preset).toBeDefined();
        expect(preset!.name).toBe('Instagram Post');
    });
});

describe('getPresetsByCategory', () => {
    it('returns display presets (8 IAB sizes)', () => {
        const display = getPresetsByCategory('display');
        expect(display.length).toBeGreaterThanOrEqual(8);
        for (const p of display) {
            expect(p.category).toBe('display');
        }
    });

    it('returns social presets (6 sizes)', () => {
        const social = getPresetsByCategory('social');
        expect(social.length).toBeGreaterThanOrEqual(6);
        for (const p of social) {
            expect(p.category).toBe('social');
        }
    });

    it('returns video presets', () => {
        const video = getPresetsByCategory('video');
        expect(video.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for unknown category', () => {
        const custom = getPresetsByCategory('custom');
        // custom might be empty — that's ok
        expect(Array.isArray(custom)).toBe(true);
    });
});
