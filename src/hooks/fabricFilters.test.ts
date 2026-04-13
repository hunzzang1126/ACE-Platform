// ─────────────────────────────────────────────────
// fabricFilters.test.ts — Filter & blend mode helpers
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import {
    getFilterState,
    getBlendMode,
    applyBlendMode,
    setBrightness,
    setContrast,
    setSaturation,
    setHueRotate,
    filterStateToSchema,
    restoreFiltersFromSchema,
    restoreBlendMode,
} from './fabricFilters';

// Mock Fabric object
function mockObj(overrides: Record<string, any> = {}): any {
    return {
        type: 'image',
        set: vi.fn(),
        filters: [],
        applyFilters: vi.fn(),
        ...overrides,
    };
}

// Mock Canvas
function mockCanvas(): any {
    return { renderAll: vi.fn() };
}

describe('getFilterState', () => {
    it('returns defaults for fresh object', () => {
        const obj = mockObj();
        const state = getFilterState(obj);
        expect(state.brightness).toBe(1);
        expect(state.contrast).toBe(1);
        expect(state.saturation).toBe(0);
        expect(state.hueRotation).toBe(0);
    });

    it('returns stored state if present', () => {
        const obj = mockObj({ __glidFilters: { brightness: 1.5, contrast: 0.8, saturation: 0.3, hueRotation: 90 } });
        const state = getFilterState(obj);
        expect(state.brightness).toBe(1.5);
        expect(state.hueRotation).toBe(90);
    });
});

describe('getBlendMode', () => {
    it('returns normal by default', () => {
        expect(getBlendMode(mockObj())).toBe('normal');
    });

    it('returns stored blend mode', () => {
        expect(getBlendMode(mockObj({ __glidBlendMode: 'multiply' }))).toBe('multiply');
    });
});

describe('applyBlendMode', () => {
    it('sets globalCompositeOperation on object', () => {
        const obj = mockObj();
        const canvas = mockCanvas();
        applyBlendMode(obj, 'multiply', canvas);
        expect(obj.set).toHaveBeenCalledWith({ globalCompositeOperation: 'multiply' });
        expect(canvas.renderAll).toHaveBeenCalled();
    });

    it('maps color_dodge to color-dodge', () => {
        const obj = mockObj();
        applyBlendMode(obj, 'color_dodge', null);
        expect(obj.set).toHaveBeenCalledWith({ globalCompositeOperation: 'color-dodge' });
    });

    it('defaults to source-over for unknown mode', () => {
        const obj = mockObj();
        applyBlendMode(obj, 'unknown_mode', null);
        expect(obj.set).toHaveBeenCalledWith({ globalCompositeOperation: 'source-over' });
    });

    it('stores mode as custom prop', () => {
        const obj = mockObj();
        applyBlendMode(obj, 'screen', null);
        expect(obj.__glidBlendMode).toBe('screen');
    });
});

describe('setBrightness', () => {
    it('stores brightness value and applies filters', () => {
        const obj = mockObj();
        const canvas = mockCanvas();
        setBrightness(obj, 1.5, canvas);
        const state = getFilterState(obj);
        expect(state.brightness).toBe(1.5);
    });
});

describe('setContrast', () => {
    it('stores contrast value', () => {
        const obj = mockObj();
        setContrast(obj, 0.8, null);
        expect(getFilterState(obj).contrast).toBe(0.8);
    });
});

describe('setSaturation', () => {
    it('converts 0~2 range to -1~1 internal range', () => {
        const obj = mockObj();
        setSaturation(obj, 1.5, null); // 1.5 → 0.5 internal
        expect(getFilterState(obj).saturation).toBe(0.5);
    });

    it('handles desaturation', () => {
        const obj = mockObj();
        setSaturation(obj, 0.5, null); // 0.5 → -0.5 internal
        expect(getFilterState(obj).saturation).toBe(-0.5);
    });
});

describe('setHueRotate', () => {
    it('stores hue rotation in degrees', () => {
        const obj = mockObj();
        setHueRotate(obj, 180, null);
        expect(getFilterState(obj).hueRotation).toBe(180);
    });
});

describe('filterStateToSchema', () => {
    it('returns empty array for default state', () => {
        expect(filterStateToSchema(mockObj())).toEqual([]);
    });

    it('serializes non-default values', () => {
        const obj = mockObj();
        setBrightness(obj, 1.3, null);
        setContrast(obj, 0.7, null);
        const schema = filterStateToSchema(obj);
        expect(schema).toHaveLength(2);
        expect(schema.find(f => f.type === 'brightness')?.value).toBe(1.3);
        expect(schema.find(f => f.type === 'contrast')?.value).toBe(0.7);
    });

    it('includes hueRotate with correct type', () => {
        const obj = mockObj();
        setHueRotate(obj, 90, null);
        expect(filterStateToSchema(obj).find(f => f.type === 'hueRotate')?.value).toBe(90);
    });
});

describe('restoreFiltersFromSchema', () => {
    it('does nothing for undefined filters', () => {
        const obj = mockObj();
        restoreFiltersFromSchema(obj, undefined, null);
        expect(getFilterState(obj).brightness).toBe(1);
    });

    it('restores brightness and contrast', () => {
        const obj = mockObj();
        restoreFiltersFromSchema(obj, [
            { type: 'brightness', value: 1.4 },
            { type: 'contrast', value: 0.6 },
        ], null);
        const state = getFilterState(obj);
        expect(state.brightness).toBe(1.4);
        expect(state.contrast).toBe(0.6);
    });
});

describe('restoreBlendMode', () => {
    it('does nothing for normal mode', () => {
        const obj = mockObj();
        restoreBlendMode(obj, 'normal', null);
        expect(obj.set).not.toHaveBeenCalled();
    });

    it('applies non-normal blend mode', () => {
        const obj = mockObj();
        const canvas = mockCanvas();
        restoreBlendMode(obj, 'overlay', canvas);
        expect(obj.set).toHaveBeenCalledWith({ globalCompositeOperation: 'overlay' });
    });
});
