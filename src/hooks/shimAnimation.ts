// ─────────────────────────────────────────────────
// shimAnimation — Fabric engine animation state machine
// ─────────────────────────────────────────────────
// Manages play/pause/stop/seek and per-object animation
// using preset-based keyframe interpolation.
// ─────────────────────────────────────────────────

import type { Canvas, FabricObject } from 'fabric';
import { isArtboard } from './fabricHelpers';
import { useAnimPresetStore } from './useAnimationPresets';

interface AnimState {
    playing: boolean;
    time: number;
    duration: number;
    looping: boolean;
    speed: number;
    startTs: number;
    startOffset: number;
    rafId: number;
}

/** Create animation methods for the Fabric engine shim */
export function createAnimationMethods(
    fc: Canvas,
    userObjects: () => FabricObject[],
) {
    const state: AnimState = {
        playing: false,
        time: 0,
        duration: 5.0,
        looping: false,
        speed: 1.0,
        startTs: 0,
        startOffset: 0,
        rafId: 0,
    };

    function applyAnimationFrame(currentTime: number) {
        const presets = useAnimPresetStore.getState().presets;
        const objs = fc.getObjects().filter(o => !isArtboard(o));
        let needsRender = false;

        for (const obj of objs) {
            const aceId = (obj as any).__glidId;
            if (!aceId) continue;
            const config = presets[String(aceId)];
            const orig = (obj as any).__aceOrigPos;
            if (!orig) continue;

            const st = config?.startTime ?? 0;
            const et = config?.endTime ?? -1;

            // ★ Element visibility: hidden before startTime, hidden after endTime
            if (currentTime < st) {
                obj.set({ opacity: 0 });
                needsRender = true;
                continue;
            }
            if (et > 0 && currentTime > et) {
                obj.set({ opacity: 0 });
                needsRender = true;
                continue;
            }

            // No animation — just restore original position (visible)
            if (!config || config.anim === 'none') {
                obj.set({ left: orig.left, top: orig.top, opacity: orig.opacity, scaleX: orig.scaleX, scaleY: orig.scaleY });
                needsRender = true;
                continue;
            }

            const animStart = config.startTime ?? 0;
            const animEnd = animStart + (config.animDuration ?? 0.3);
            let progress: number;
            if (currentTime <= animStart) progress = 0;
            else if (currentTime >= animEnd) progress = 1;
            else progress = (currentTime - animStart) / (animEnd - animStart);

            const inv = 1 - progress;
            const t = 1 - inv * inv * inv;

            switch (config.anim) {
                case 'fade':
                    obj.set({ opacity: t * orig.opacity });
                    break;
                case 'slide-left':
                    // "Slide to Left" = enters from right → slides leftward to position
                    obj.set({ left: orig.left + (300 * (1 - t)) });
                    break;
                case 'slide-right':
                    // "Slide to Right" = enters from left → slides rightward to position
                    obj.set({ left: orig.left + (-300 * (1 - t)) });
                    break;
                case 'slide-up':
                    // "Slide to Top" = enters from below → slides upward to position
                    obj.set({ top: orig.top + (300 * (1 - t)) });
                    break;
                case 'slide-down':
                    // "Slide to Bottom" = enters from above → slides downward to position
                    obj.set({ top: orig.top + (-300 * (1 - t)) });
                    break;
                case 'scale':
                    obj.set({ scaleX: orig.scaleX * t, scaleY: orig.scaleY * t });
                    break;
                case 'ascend':
                    obj.set({ top: orig.top + (200 * (1 - t)), opacity: t * orig.opacity });
                    break;
                case 'descend':
                    obj.set({ top: orig.top + (-200 * (1 - t)), opacity: t * orig.opacity });
                    break;
            }
            needsRender = true;
        }
        if (needsRender) fc.renderAll();
    }

    function restoreOriginalPositions() {
        const objs = fc.getObjects().filter(o => !isArtboard(o));
        for (const obj of objs) {
            const orig = (obj as any).__aceOrigPos;
            if (orig) {
                obj.set({
                    left: orig.left,
                    top: orig.top,
                    opacity: orig.opacity,
                    scaleX: orig.scaleX,
                    scaleY: orig.scaleY,
                });
                delete (obj as any).__aceOrigPos;
            }
        }
        fc.renderAll();
    }

    const methods = {
        _animState: state,

        anim_play() {
            if (state.playing) return;
            state.playing = true;
            state.startTs = performance.now();
            state.startOffset = state.time;

            const objs = fc.getObjects().filter(o => !isArtboard(o));
            for (const obj of objs) {
                if (!(obj as any).__aceOrigPos) {
                    (obj as any).__aceOrigPos = {
                        left: obj.left ?? 0,
                        top: obj.top ?? 0,
                        opacity: obj.opacity ?? 1,
                        scaleX: obj.scaleX ?? 1,
                        scaleY: obj.scaleY ?? 1,
                    };
                }
            }

            const tick = () => {
                if (!state.playing) return;
                const elapsed = (performance.now() - state.startTs) / 1000 * state.speed;
                state.time = state.startOffset + elapsed;
                if (state.time >= state.duration) {
                    if (state.looping) {
                        state.time = state.time % state.duration;
                        state.startTs = performance.now();
                        state.startOffset = state.time;
                    } else {
                        state.time = state.duration;
                        state.playing = false;
                        restoreOriginalPositions();
                        return;
                    }
                }
                applyAnimationFrame(state.time);
                state.rafId = requestAnimationFrame(tick);
            };
            state.rafId = requestAnimationFrame(tick);
        },

        _applyAnimationFrame: applyAnimationFrame,
        _restoreOriginalPositions: restoreOriginalPositions,

        anim_pause() {
            state.playing = false;
            cancelAnimationFrame(state.rafId);
        },
        anim_stop() {
            state.playing = false;
            state.time = 0;
            cancelAnimationFrame(state.rafId);
            restoreOriginalPositions();
        },
        anim_seek(t: number) {
            state.time = Math.max(0, Math.min(t, state.duration));
            if (state.playing) {
                state.startTs = performance.now();
                state.startOffset = state.time;
            }
            applyAnimationFrame(state.time);
        },
        anim_time(): number { return state.time; },
        anim_playing(): boolean { return state.playing; },
        anim_duration(): number { return state.duration; },
        anim_looping(): boolean { return state.looping; },
        set_duration(d: number) { state.duration = d; },
        set_looping(v: boolean) { state.looping = v; },
        anim_set_speed(s: number) { state.speed = s; },
        anim_toggle() {
            if (state.playing) methods.anim_pause();
            else methods.anim_play();
        },
    };

    return methods;
}
