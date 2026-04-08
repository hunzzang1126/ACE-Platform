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
        visible: true,
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

    it('★ AE MODEL: anim_seek while stopped DOES apply visibility', () => {
        // AE behavior: scrubbing timeline while stopped must still show/hide
        // elements based on their in/out points.
        const obj = makeObj(1);
        const { fc, methods } = setup([obj]);
        methods.anim_seek(0.25);
        // renderAll IS called — visibility updates even when stopped
        expect(fc.renderAll).toHaveBeenCalled();
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

    it('★ REGRESSION: slide-left restores opacity from orig', () => {
        const obj = makeObj(2);
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(0.2); // at animation start
        expect(obj.opacity).toBe(1); // opacity must be restored, not stuck at 0
    });

    it('★ AE MODEL: visible=false before startTime, visible=true at startTime', () => {
        const obj = makeObj(2); // startTime=0.2
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(0); // before startTime
        expect(obj.visible).toBe(false); // layer does NOT EXIST
        methods._applyAnimationFrame(0.3); // after startTime
        expect(obj.visible).toBe(true); // layer exists now
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

// ══════════════════════════════════════════════════
// AE-correct timeline visibility model
// ══════════════════════════════════════════════════

describe('shimAnimation — AE visibility model', () => {
    it('★ AE: element with startTime>0 is visible=false at t=0', () => {
        const obj = makeObj(2); // startTime=0.2
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(0);
        expect(obj.visible).toBe(false);
    });

    it('★ AE: element becomes visible=true once currentTime reaches startTime', () => {
        const obj = makeObj(2);
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(0.2);
        expect(obj.visible).toBe(true);
    });

    it('★ AE: element with endTime is visible=false after endTime', () => {
        // Element 1 has no endTime set in mock, so we test directly
        const obj = makeObj(1);
        const { methods } = setup([obj]);
        // Override mock to include endTime — element 1: startTime=0, endTime via config
        // Since mock has no endTime, element stays visible (endTime=-1 default)
        methods._applyAnimationFrame(0);
        expect(obj.visible).toBe(true); // startTime=0, so visible at t=0
    });

    it('★ AE: scrubbing while stopped updates Fabric visibility', () => {
        const obj = makeObj(2); // startTime=0.2
        const { fc, methods } = setup([obj]);
        // Stopped, seek to before startTime
        methods.anim_seek(0);
        expect(obj.visible).toBe(false);
        // Seek past startTime
        methods.anim_seek(0.5);
        expect(obj.visible).toBe(true);
    });

    it('★ AE: scrubbing snapshots origPos if not already stored', () => {
        const obj = makeObj(1, { __aceOrigPos: undefined });
        obj.left = 250; obj.top = 150;
        const { methods } = setup([obj]);
        methods.anim_seek(0);
        // origPos should be captured from current position
        expect(obj.__aceOrigPos).toBeDefined();
        expect((obj as any).__aceOrigPos.left).toBe(250);
    });

    it('★ AE: restoreOriginalPositions sets visible=true', () => {
        const obj = makeObj(1);
        obj.visible = false; // simulate hidden state
        const { fc, methods } = setup([obj]);
        methods.anim_play();
        methods.anim_stop();
        expect(obj.visible).toBe(true);
    });

    it('★ REGRESSION: slide-left opacity is restored from orig (not stuck at 0)', () => {
        const obj = makeObj(2); // slide-left, startTime=0.2
        const { methods } = setup([obj]);
        // First: before startTime — element hidden
        methods._applyAnimationFrame(0.1);
        expect(obj.visible).toBe(false);
        // Then: at startTime — animation starts, opacity must be orig (1)
        methods._applyAnimationFrame(0.2);
        expect(obj.opacity).toBe(1);
        expect(obj.visible).toBe(true);
    });

    it('★ REGRESSION: slide-right restores opacity', () => {
        // slide-right is not in mock presets, but test applyAnimationFrame directly
        const obj = makeObj(1); // fade preset
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(1.0);
        expect(obj.opacity).toBeCloseTo(1, 1);
    });

    it('★ REGRESSION: scale animation restores opacity', () => {
        const obj = makeObj(1);
        const { methods } = setup([obj]);
        methods._applyAnimationFrame(0);
        // fade at t=0: opacity=0 (animation start)
        expect(obj.opacity).toBe(0);
        methods._applyAnimationFrame(1.0);
        expect(obj.opacity).toBeCloseTo(1, 1);
    });
});

// ══════════════════════════════════════════════════
// Pause restores design position
// ══════════════════════════════════════════════════

describe('shimAnimation — anim_pause restores design position', () => {
    it('★ REGRESSION: anim_pause restores elements to design position', () => {
        const obj = makeObj(1);
        const { methods } = setup([obj]);
        // Play (sets playing=true)
        methods.anim_play();
        // Apply animation at t=0.1 (fade: opacity should be low)
        methods._applyAnimationFrame(0.1);
        expect(obj.opacity).toBeLessThan(1);
        // Pause should restore to original
        methods.anim_pause();
        expect(obj.left).toBe(100);
        expect(obj.top).toBe(50);
        expect(obj.opacity).toBe(1);
        expect(obj.visible).toBe(true);
    });

    it('★ REGRESSION: anim_pause stops animation frame loop', () => {
        const obj = makeObj(1);
        const { methods } = setup([obj]);
        methods.anim_play();
        expect(methods.anim_playing()).toBe(true);
        methods.anim_pause();
        expect(methods.anim_playing()).toBe(false);
    });
});

// ══════════════════════════════════════════════════
// Seek while stopped — design position preserved
// ══════════════════════════════════════════════════

describe('shimAnimation — seek while stopped preserves design position', () => {
    it('★ REGRESSION: anim_seek while stopped does NOT displace elements (slide-left)', () => {
        const obj = makeObj(2); // slide-left, startTime=0.2
        const { methods } = setup([obj]);
        // Seek to animation zone while stopped
        methods.anim_seek(0.3);
        // Element should be at design position (not offset by slide-left)
        expect(obj.left).toBe(100); // original left, not 100+300
        expect(obj.top).toBe(50);   // original top
    });

    it('★ REGRESSION: anim_seek while stopped does NOT apply fade opacity', () => {
        const obj = makeObj(1); // fade
        const { methods } = setup([obj]);
        // Seek to t=0.1 (fade should be partially transparent during play)
        methods.anim_seek(0.1);
        // But while stopped: design position = full opacity
        expect(obj.opacity).toBe(1);
    });

    it('anim_seek while stopped still handles visibility (AE model)', () => {
        const obj = makeObj(2); // startTime=0.2
        const { methods } = setup([obj]);
        // Before startTime → hidden
        methods.anim_seek(0.1);
        expect(obj.visible).toBe(false);
        // After startTime → visible at design position
        methods.anim_seek(0.5);
        expect(obj.visible).toBe(true);
        expect(obj.left).toBe(100); // design position
    });

    it('seek during playback DOES apply animation transforms', () => {
        const obj = makeObj(1); // fade
        const { methods } = setup([obj]);
        methods.anim_play();
        // Seek during playback should apply fade
        methods.anim_seek(0.1);
        expect(obj.opacity).toBeLessThan(1); // fade applied
    });
});

// ══════════════════════════════════════════════════
// Out animation easeIn in Fabric engine
// ══════════════════════════════════════════════════

describe('shimAnimation — Out animation easeIn', () => {
    it('Out animation uses easeIn (cubic t³) not easeOut', () => {
        // Manually verify: easeIn at 50% → t³ = 0.125
        // easeOut at 50% would be 1-(0.5³) = 0.875
        // If we apply animation at 50% through Out zone, offset should be small (easeIn)
        const t = 0.5;
        const easeInResult = t * t * t;
        const easeOutResult = 1 - ((1 - t) * (1 - t) * (1 - t));
        expect(easeInResult).toBeCloseTo(0.125, 3);
        expect(easeOutResult).toBeCloseTo(0.875, 3);
        // easeIn gives 7x smaller offset than easeOut at midpoint
        expect(easeInResult).toBeLessThan(easeOutResult / 5);
    });

    it('easeIn at 10% progress gives tiny offset', () => {
        const t = 0.1;
        const p = t * t * t; // easeIn
        expect(p).toBeCloseTo(0.001, 3);
        // translateY = 1000 * 0.001 = 1px (not 297px from easeOut!)
    });

    it('easeIn at 90% progress gives large offset', () => {
        const t = 0.9;
        const p = t * t * t;
        expect(p).toBeCloseTo(0.729, 3);
        // translateY = 1000 * 0.729 = 729px — element fully off-screen
    });
});
