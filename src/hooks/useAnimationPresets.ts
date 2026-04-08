// ─────────────────────────────────────────────────
// useAnimationPresets — Animation preset system
// One animation per element. Simple.
// ─────────────────────────────────────────────────
import { create } from 'zustand';
import { useCallback, type CSSProperties } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

export type AnimPresetType =
    | 'none'
    | 'fade'
    | 'slide-left'
    | 'slide-right'
    | 'slide-up'
    | 'slide-down'
    | 'scale'
    | 'ascend'
    | 'descend';

export interface AnimPresetConfig {
    anim: AnimPresetType;       // IN animation per element
    animDuration: number;       // IN duration in seconds (default 0.3)
    animOut: AnimPresetType;    // OUT (exit) animation
    animOutDuration: number;    // OUT duration in seconds (default 0.3)
    startTime: number;          // element start time in seconds (default 0)
    endTime: number;            // element end time in seconds (default = timeline duration, -1 means full)
}

export const ANIM_PRESETS: { label: string; value: AnimPresetType }[] = [
    { label: 'None', value: 'none' },
    { label: 'Fade In', value: 'fade' },
    { label: 'Slide to Left', value: 'slide-left' },
    { label: 'Slide to Right', value: 'slide-right' },
    { label: 'Slide to Top', value: 'slide-up' },
    { label: 'Slide to Bottom', value: 'slide-down' },
    { label: 'Scale Up', value: 'scale' },
    { label: 'Rise Up (Fade)', value: 'ascend' },
    { label: 'Drop Down (Fade)', value: 'descend' },
];

/** Human-readable label for a preset type */
export function presetLabel(preset: AnimPresetType): string {
    return ANIM_PRESETS.find(p => p.value === preset)?.label ?? 'None';
}

interface AnimPresetStore {
    /** Map<elementId, AnimPresetConfig> */
    presets: Record<string, AnimPresetConfig>;
    /** Current timeline playback time (seconds) */
    currentTime: number;
    /** Whether timeline is playing */
    isPlaying: boolean;
    setPreset: (elementId: string, config: Partial<AnimPresetConfig>) => void;
    getPreset: (elementId: string) => AnimPresetConfig;
    removePreset: (elementId: string) => void;
    setTiming: (elementId: string, startTime: number, endTime: number) => void;
    setCurrentTime: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    /** Get CSS style overrides for an element at the current timeline time */
    getAnimStyle: (elementId: string) => CSSProperties;
}

const DEFAULT_CONFIG: AnimPresetConfig = {
    anim: 'none',
    animDuration: 0.3,
    animOut: 'none',
    animOutDuration: 0.3,
    startTime: 0,
    endTime: -1, // -1 = use timeline duration
};

/** Simple ease-out curve: t => 1 - (1-t)^3 */
function easeOut(t: number): number {
    const inv = 1 - t;
    return 1 - inv * inv * inv;
}

/** Compute animation style at given time for a preset — exported for preview grid */
export function computeAnimStyle(
    preset: AnimPresetType,
    currentTime: number,
    animDuration: number,
    startTime: number,
    /** Optional endTime — if provided, element hidden after this time */
    endTime?: number,
    /** Optional OUT preset — plays in reverse before endTime */
    outPreset?: AnimPresetType,
    outDuration?: number,
): CSSProperties {
    // ★ AE model: element doesn't exist before its in-point
    if (currentTime < startTime) return { display: 'none' };
    if (endTime !== undefined && endTime > 0 && currentTime > endTime) {
        return { display: 'none' };
    }

    // ── OUT animation check (before IN, since OUT takes priority near endTime) ──
    const resolvedOut = outPreset ?? 'none';
    const resolvedOutDur = outDuration ?? 0.3;
    if (resolvedOut !== 'none' && endTime !== undefined && endTime > 0) {
        const outStart = endTime - resolvedOutDur;
        if (currentTime >= outStart && currentTime <= endTime) {
            const outProgress = (currentTime - outStart) / resolvedOutDur;
            const t = 1 - easeOut(Math.max(0, Math.min(1, outProgress))); // 1→0
            return computePresetStyle(resolvedOut, t);
        }
    }

    // No IN animation preset — just visible within time range
    if (preset === 'none') return {};

    // ── IN animation ──
    const animStart = startTime;
    const animEnd = animStart + animDuration;
    let progress: number;
    if (currentTime <= animStart) progress = 0;
    else if (currentTime >= animEnd) progress = 1;
    else progress = (currentTime - animStart) / (animEnd - animStart);

    const t = easeOut(Math.max(0, Math.min(1, progress)));
    return computePresetStyle(preset, t);
}

/** Shared: convert a preset + progress (0→1) into CSS properties */
function computePresetStyle(preset: AnimPresetType, t: number): CSSProperties {
    switch (preset) {
        case 'fade':
            return { opacity: t };
        case 'slide-left':
            return { transform: `translateX(${1000 * (1 - t)}px)` };
        case 'slide-right':
            return { transform: `translateX(${-1000 * (1 - t)}px)` };
        case 'slide-up':
            return { transform: `translateY(${1000 * (1 - t)}px)` };
        case 'slide-down':
            return { transform: `translateY(${-1000 * (1 - t)}px)` };
        case 'scale':
            return { transform: `scale(${t})` };
        case 'ascend':
            return { opacity: t, transform: `translateY(${1000 * (1 - t)}px)` };
        case 'descend':
            return { opacity: t, transform: `translateY(${-1000 * (1 - t)}px)` };
        default:
            return {};
    }
}

export const useAnimPresetStore = create<AnimPresetStore>()((set, get) => ({
    presets: {},
    currentTime: 0,
    isPlaying: false,

    setPreset: (elementId, config) => set((s) => ({
        presets: {
            ...s.presets,
            [elementId]: { ...(s.presets[elementId] ?? DEFAULT_CONFIG), ...config },
        },
    })),

    getPreset: (elementId) => get().presets[elementId] ?? DEFAULT_CONFIG,

    removePreset: (elementId) => set((s) => {
        const { [elementId]: _, ...rest } = s.presets;
        return { presets: rest };
    }),

    setTiming: (elementId, startTime, endTime) => set((s) => ({
        presets: {
            ...s.presets,
            [elementId]: {
                ...(s.presets[elementId] ?? DEFAULT_CONFIG),
                startTime,
                endTime,
            },
        },
    })),

    setCurrentTime: (time) => set({ currentTime: time }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    getAnimStyle: (elementId) => {
        const state = get();
        const config = state.presets[elementId] ?? DEFAULT_CONFIG;
        // ★ AE model: visibility must apply even when scrubbing while stopped.
        // Elements outside their timeline range must not exist (display:none).
        const st = config.startTime;
        const et = config.endTime;
        if (state.currentTime < st) return { display: 'none' };
        if (et > 0 && state.currentTime > et) return { display: 'none' };
        // Within range but not playing — show at design position (no animation offset)
        const hasIn = config.anim !== 'none';
        const hasOut = (config.animOut ?? 'none') !== 'none';
        if (!hasIn && !hasOut) return {};
        if (!state.isPlaying) return {};
        return computeAnimStyle(
            config.anim, state.currentTime, config.animDuration, config.startTime,
            config.endTime > 0 ? config.endTime : undefined,
            config.animOut, config.animOutDuration,
        );
    },
}));

// ── Apply animation keyframes to the engine ──
function applyPresetKeyframes(
    engine: Engine,
    nodeId: number,
    preset: AnimPresetType,
    duration: number,
    totalDuration: number,
) {
    if (!engine || preset === 'none') return;

    // Animation plays as "In" at the start of the element's timeline
    const startTime = 0;
    const endTime = duration;
    const easing = 'ease_out';

    try {
        switch (preset) {
            case 'fade':
                engine.add_keyframe(nodeId, 'opacity', startTime, 0, easing);
                engine.add_keyframe(nodeId, 'opacity', endTime, 1, easing);
                break;

            case 'slide-left':
                engine.add_keyframe(nodeId, 'x', startTime, -200, easing);
                engine.add_keyframe(nodeId, 'x', endTime, 0, easing);
                break;

            case 'slide-right':
                engine.add_keyframe(nodeId, 'x', startTime, 200, easing);
                engine.add_keyframe(nodeId, 'x', endTime, 0, easing);
                break;

            case 'slide-up':
                engine.add_keyframe(nodeId, 'y', startTime, -200, easing);
                engine.add_keyframe(nodeId, 'y', endTime, 0, easing);
                break;

            case 'slide-down':
                engine.add_keyframe(nodeId, 'y', startTime, 200, easing);
                engine.add_keyframe(nodeId, 'y', endTime, 0, easing);
                break;

            case 'scale':
                engine.add_keyframe(nodeId, 'scale_x', startTime, 0, easing);
                engine.add_keyframe(nodeId, 'scale_x', endTime, 1, easing);
                engine.add_keyframe(nodeId, 'scale_y', startTime, 0, easing);
                engine.add_keyframe(nodeId, 'scale_y', endTime, 1, easing);
                break;

            case 'ascend':
                engine.add_keyframe(nodeId, 'y', startTime, 100, easing);
                engine.add_keyframe(nodeId, 'y', endTime, 0, easing);
                engine.add_keyframe(nodeId, 'opacity', startTime, 0, easing);
                engine.add_keyframe(nodeId, 'opacity', endTime, 1, easing);
                break;

            case 'descend':
                engine.add_keyframe(nodeId, 'y', startTime, -100, easing);
                engine.add_keyframe(nodeId, 'y', endTime, 0, easing);
                engine.add_keyframe(nodeId, 'opacity', startTime, 0, easing);
                engine.add_keyframe(nodeId, 'opacity', endTime, 1, easing);
                break;
        }
    } catch {
        // Engine functions may not be available yet
    }
}

/** Hook to apply animation preset to a specific element */
export function useAnimationPresets(engine: Engine | undefined) {
    const setPreset = useAnimPresetStore((s) => s.setPreset);
    const getPreset = useAnimPresetStore((s) => s.getPreset);

    const applyAnim = useCallback((nodeId: number, preset: AnimPresetType, duration?: number) => {
        if (!engine) return;
        const totalDuration = engine.anim_duration?.() ?? 5.0;
        const dur = duration ?? 0.3;
        setPreset(String(nodeId), { anim: preset, animDuration: dur });
        applyPresetKeyframes(engine, nodeId, preset, dur, totalDuration);
    }, [engine, setPreset]);

    return { applyAnim, getPreset };
}
