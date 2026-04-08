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

/** IN: apply preset at progress t (0=hidden, 1=visible) to Fabric object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFabricPreset(obj: any, preset: string, t: number, orig: any) {
    switch (preset) {
        case 'fade':
            obj.set({ opacity: t * orig.opacity });
            break;
        case 'slide-left':
            obj.set({ left: orig.left + (300 * (1 - t)), opacity: orig.opacity });
            break;
        case 'slide-right':
            obj.set({ left: orig.left + (-300 * (1 - t)), opacity: orig.opacity });
            break;
        case 'slide-up':
            obj.set({ top: orig.top + (300 * (1 - t)), opacity: orig.opacity });
            break;
        case 'slide-down':
            obj.set({ top: orig.top + (-300 * (1 - t)), opacity: orig.opacity });
            break;
        case 'scale':
            obj.set({ scaleX: orig.scaleX * t, scaleY: orig.scaleY * t, opacity: orig.opacity });
            break;
        case 'ascend':
            obj.set({ top: orig.top + (200 * (1 - t)), opacity: t * orig.opacity });
            break;
        case 'descend':
            obj.set({ top: orig.top + (-200 * (1 - t)), opacity: t * orig.opacity });
            break;
        default:
            obj.set({ left: orig.left, top: orig.top, opacity: orig.opacity, scaleX: orig.scaleX, scaleY: orig.scaleY });
    }
}

/** OUT: apply preset at progress p (0=at position, 1=fully exited).
 *  "Slide to Bottom" = exit DOWNWARD = top goes from orig → orig+300 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFabricOutPreset(obj: any, preset: string, p: number, orig: any) {
    switch (preset) {
        case 'fade':
            obj.set({ opacity: (1 - p) * orig.opacity });
            break;
        case 'slide-left':
            obj.set({ left: orig.left - (300 * p), opacity: orig.opacity });
            break;
        case 'slide-right':
            obj.set({ left: orig.left + (300 * p), opacity: orig.opacity });
            break;
        case 'slide-up':
            obj.set({ top: orig.top - (300 * p), opacity: orig.opacity });
            break;
        case 'slide-down':
            obj.set({ top: orig.top + (300 * p), opacity: orig.opacity });
            break;
        case 'scale':
            obj.set({ scaleX: orig.scaleX * (1 - p), scaleY: orig.scaleY * (1 - p), opacity: orig.opacity });
            break;
        case 'ascend':
            obj.set({ top: orig.top - (200 * p), opacity: (1 - p) * orig.opacity });
            break;
        case 'descend':
            obj.set({ top: orig.top + (200 * p), opacity: (1 - p) * orig.opacity });
            break;
        default:
            obj.set({ left: orig.left, top: orig.top, opacity: orig.opacity, scaleX: orig.scaleX, scaleY: orig.scaleY });
    }
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
            // ★ endTime=-1 means "full timeline" — resolve to actual duration for Out check
            const rawEt = config?.endTime ?? -1;
            const et = rawEt < 0 ? state.duration : rawEt;

            // ★ AE model: before in-point, layer does NOT EXIST (not just invisible)
            if (currentTime < st) {
                obj.set({ visible: false });
                needsRender = true;
                continue;
            }
            if (et > 0 && currentTime > et) {
                obj.set({ visible: false });
                needsRender = true;
                continue;
            }
            // Layer is within its lifespan — ensure it exists
            // ★ ALWAYS reset ALL properties from orig first to prevent
            // cross-contamination between In and Out presets that modify
            // different properties (e.g. slide-left changes left, ascend changes top)
            obj.set({ visible: true, left: orig.left, top: orig.top, opacity: orig.opacity, scaleX: orig.scaleX, scaleY: orig.scaleY });

            const hasIn = config && config.anim !== 'none';
            const outPreset = config?.animOut ?? 'none';
            const hasOut = outPreset !== 'none';

            if (!hasIn && !hasOut) {
                needsRender = true;
                continue;
            }

            // ── OUT animation check (takes priority near endTime) ──
            const outDur = config?.animOutDuration ?? 0.3;
            const outStart = et - outDur;
            if (hasOut && outStart > 0 && currentTime >= outStart && currentTime <= et) {
                const outProgress = (currentTime - outStart) / outDur; // 0→1
                const invO = 1 - outProgress;
                const p = 1 - (invO * invO * invO); // easeOut: 0→1
                applyFabricOutPreset(obj, outPreset, p, orig);
                needsRender = true;
                continue;
            }

            // ── IN animation ──
            if (!hasIn) {
                // Already reset above, just continue
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

            applyFabricPreset(obj, config.anim, t, orig);
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
                    visible: true,
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
            // ★ Always apply animation frame — visibility (visible:true/false)
            // must update even when scrubbing while stopped (AE behavior).
            // Safe now because out-of-range uses visible:false, not opacity:0.
            // Snapshot original positions if not already stored (for scrubbing while stopped).
            const objs = fc.getObjects().filter(o => !isArtboard(o));
            for (const obj of objs) {
                if (!(obj as any).__aceOrigPos) {
                    (obj as any).__aceOrigPos = {
                        left: obj.left ?? 0, top: obj.top ?? 0,
                        opacity: obj.opacity ?? 1, scaleX: obj.scaleX ?? 1, scaleY: obj.scaleY ?? 1,
                    };
                }
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
