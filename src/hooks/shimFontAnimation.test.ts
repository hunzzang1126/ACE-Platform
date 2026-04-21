// ─────────────────────────────────────────────────
// shimFontAnimation.test.ts — Font animation RAF tests
// ─────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock RAF
let rafCallback: ((time: number) => void) | null = null;
vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    rafCallback = cb;
    return 1;
});
vi.stubGlobal('cancelAnimationFrame', vi.fn());
vi.stubGlobal('performance', { now: () => 0 });

describe('shimFontAnimation', () => {
    beforeEach(() => {
        vi.resetModules();
        rafCallback = null;
    });

    it('exports createFontAnimMethods', async () => {
        const mod = await import('./shimFontAnimation');
        expect(typeof mod.createFontAnimMethods).toBe('function');
    });

    it('exports start/stop helpers', async () => {
        const mod = await import('./shimFontAnimation');
        expect(typeof mod.startFontAnimation).toBe('function');
        expect(typeof mod.stopFontAnimation).toBe('function');
        expect(typeof mod.stopAllFontAnimations).toBe('function');
        expect(typeof mod.isFontAnimating).toBe('function');
    });

    it('stopFontAnimation does not throw for unknown id', async () => {
        const mod = await import('./shimFontAnimation');
        expect(() => mod.stopFontAnimation(999)).not.toThrow();
    });

    it('isFontAnimating returns false for non-animating id', async () => {
        const mod = await import('./shimFontAnimation');
        expect(mod.isFontAnimating(999)).toBe(false);
    });

    it('createFontAnimMethods returns object with methods', async () => {
        const mod = await import('./shimFontAnimation');
        const mockCanvas = { renderAll: vi.fn() } as any;
        const findById = vi.fn();
        const methods = mod.createFontAnimMethods(mockCanvas, findById);
        expect(typeof methods.set_font_animation).toBe('function');
        expect(typeof methods.stop_font_animation).toBe('function');
        expect(typeof methods.stop_all_font_animations).toBe('function');
    });

    it('set_font_animation("none") stops animation', async () => {
        const mod = await import('./shimFontAnimation');
        const mockCanvas = { renderAll: vi.fn() } as any;
        const mockObj = { fontFamily: 'Inter', set: vi.fn(), setCoords: vi.fn() };
        const findById = vi.fn().mockReturnValue(mockObj);
        const methods = mod.createFontAnimMethods(mockCanvas, findById);
        
        methods.set_font_animation(1, 'none');
        expect(mod.isFontAnimating(1)).toBe(false);
    });
});
