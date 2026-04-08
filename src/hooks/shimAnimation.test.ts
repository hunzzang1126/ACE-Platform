// ─────────────────────────────────────────────────
// shimAnimation.test.ts — Animation state machine tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fabric', () => ({
    Canvas: class { getObjects() { return []; } renderAll() {} },
    FabricObject: class {},
}));

vi.mock('./fabricHelpers', () => ({
    isArtboard: (obj: any) => obj.__glidArtboard === true,
}));

vi.mock('./useAnimationPresets', () => ({
    useAnimPresetStore: {
        getState: () => ({
            presets: {
                '1': { anim: 'fade', animDuration: 0.5, startTime: 0 },
                '2': { anim: 'slide-left', animDuration: 0.3, startTime: 0.2 },
                '3': { anim: 'none', animDuration: 0, startTime: 0 },
            },
        }),
    },
}));

// Mock requestAnimationFrame / cancelAnimationFrame
vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());
vi.stubGlobal('performance', { now: vi.fn().mockReturnValue(0) });

import { createAnimationMethods } from './shimAnimation';

function makeObj(id: number, ov: Record<string, any> = {}) {
    return {
        __glidId: id,
        __glidArtboard: false,
        left: 100, top: 50, opacity: 1, scaleX: 1, scaleY: 1,
        __aceOrigPos: { left: 100, top: 50, opacity: 1, scaleX: 1, scaleY: 1 },
        set(props: any) { Object.assign(this, props); },
        ...ov,
    };
}

function setup(objects: any[] = []) {
    const artboard = { __glidArtboard: true, set() {} };
    const allObjects = [artboard, ...objects];
    const fc = {
        getObjects: () => allObjects,
        renderAll: vi.fn(),
    } as any;
    const userObjects = () => objects;
    const methods = createAnimationMethods(fc, userObjects);
    return { fc, methods, objects };
}

// ══════════════════════════════════════════════════
// State management
// ══════════════════════════════════════════════════

describe('shimAnimation — state', () => {
    it('starts not playing', () => {
        const { methods } = setup();
        expect(methods.anim_playing()).toBe(false);
        expect(methods.anim_time()).toBe(0);
    });

    it('default duration is 5.0', () => {
        const { methods } = setup();
        expect(methods.anim_duration()).toBe(5.0);
    });

    it('set_duration changes duration', () => {
        const { methods } = setup();
        methods.set_duration(3.0);
        expect(methods.anim_duration()).toBe(3.0);
    });

    it('set_looping changes looping', () => {
        const { methods } = setup();
        expect(methods.anim_looping()).toBe(false);
        methods.set_looping(true);
        expect(methods.anim_looping()).toBe(true);
    });

    it('anim_set_speed changes speed', () => {
        const { methods } = setup();
        methods.anim_set_speed(2.0);
        expect(methods._animState.speed).toBe(2.0);
    });
});

// ══════════════════════════════════════════════════
// Play / Pause / Stop
// ══════════════════════════════════════════════════

describe('shimAnimation — play/pause/stop', () => {
    it('anim_play sets playing=true', () => {
        const { methods } = setup([makeObj(1)]);
        methods.anim_play();
        expect(methods.anim_playing()).toBe(true);
    });

    it('anim_pause sets playing=false', () => {
        const { methods } = setup([makeObj(1)]);
        methods.anim_play();
        methods.anim_pause();
        expect(methods.anim_playing()).toBe(false);
        expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('anim_stop resets time to 0 and restores positions', () => {
        const obj = makeObj(1);
        const { fc, methods } = setup([obj]);
        methods.anim_play();
        methods._animState.time = 2.0;
        methods.anim_stop();
        expect(methods.anim_playing()).toBe(false);
        expect(methods.anim_time()).toBe(0);
        expect(fc.renderAll).toHaveBeenCalled();
    });

    it('anim_play stores origPos', () => {
        const obj = makeObj(1, { __aceOrigPos: undefined });
        obj.left = 200; obj.top = 100; obj.opacity = 0.8;
        const { methods } = setup([obj]);
        methods.anim_play();
        expect(obj.__aceOrigPos).toEqual({
            left: 200, top: 100, opacity: 0.8, scaleX: 1, scaleY: 1,
        });
    });
});

// ══════════════════════════════════════════════════
// Seek
// ══════════════════════════════════════════════════

describe('shimAnimation — seek', () => {
    it('anim_seek clamps to [0, duration]', () => {
        const { methods } = setup();
        methods.set_duration(5);
        methods.anim_seek(10);
        expect(methods.anim_time()).toBe(5);
        methods.anim_seek(-1);
        expect(methods.anim_time()).toBe(0);
    });

    it('★ REGRESSION: anim_seek while stopped does NOT apply animation offsets', () => {
        // This was the root cause of the "element disappears after applying animation" bug.
        // When stopped, seeking should NOT move elements off-screen.
        const obj = makeObj(1);
        const { fc, methods } = setup([obj]);
        methods.anim_seek(0.25);
        // renderAll should NOT be called — element stays at design position
        expect(fc.renderAll).not.toHaveBeenCalled();
    });

    it('anim_seek while playing applies animation frame', () => {
        const obj = makeObj(1);
        const { fc, methods } = setup([obj]);
        methods.anim_play();
        fc.renderAll.mockClear();
        methods.anim_seek(0.25);
        expect(fc.renderAll).toHaveBeenCalled();
    });
});

// ══════════════════════════════════════════════════
// applyAnimationFrame — preset logic
// ══════════════════════════════════════════════════

describe('shimAnimation — applyAnimationFrame', () => {
    it('fade: opacity=0 at t=0, opacity=1 at t=end', () => {
        const obj = makeObj(1);
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(0);
        expect(obj.opacity).toBe(0);
        methods._applyAnimationFrame(1.0); // well past animDuration(0.5)
        expect(obj.opacity).toBeCloseTo(1, 1);
    });

    it('slide-left: offset from right at start, at position at end', () => {
        const obj = makeObj(2);
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(0.2); // at startTime
        expect(obj.left).toBe(100 + 300); // orig.left + 300*(1-0)
        methods._applyAnimationFrame(1.0); // past end
        expect(obj.left).toBe(100); // restored to orig
    });

    it('none preset: restores original position', () => {
        const obj = makeObj(3);
        obj.left = 999;
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(0.5);
        expect(obj.left).toBe(100); // restored from __aceOrigPos
    });
});

// ══════════════════════════════════════════════════
// Toggle
// ══════════════════════════════════════════════════

describe('shimAnimation — toggle', () => {
    it('toggle plays when stopped', () => {
        const { methods } = setup([makeObj(1)]);
        methods.anim_toggle();
        expect(methods.anim_playing()).toBe(true);
    });

    it('toggle pauses when playing', () => {
        const { methods } = setup([makeObj(1)]);
        methods.anim_play();
        methods.anim_toggle();
        expect(methods.anim_playing()).toBe(false);
    });
});
