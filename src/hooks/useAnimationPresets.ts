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
    anim: AnimPresetType;       // single animation per element
    animDuration: number;       // seconds (default 0.3)
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
): CSSProperties {
    if (preset === 'none') return {};

    // Animation runs from startTime to startTime+animDuration
    const animStart = startTime;
    const animEnd = animStart + animDuration;

    // Before animation starts: show starting state
    // During animation: interpolate
    // After animation ends: show final state (normal)
    let progress: number;
    if (currentTime <= animStart) {
        progress = 0;
    } else if (currentTime >= animEnd) {
        progress = 1;
    } else {
        progress = (currentTime - animStart) / (animEnd - animStart);
    }

    const t = easeOut(Math.max(0, Math.min(1, progress)));

    switch (preset) {
        case 'fade':
            return { opacity: t };

        case 'slide-left':
            // Element slides leftward into position (enters from right)
            return { transform: `translateX(${1000 * (1 - t)}px)` };

        case 'slide-right':
            // Element slides rightward into position (enters from left)
            return { transform: `translateX(${-1000 * (1 - t)}px)` };

        case 'slide-up':
            // Element slides upward into position (enters from below)
            return { transform: `translateY(${1000 * (1 - t)}px)` };

        case 'slide-down':
            // Element slides downward into position (enters from above)
            return { transform: `translateY(${-1000 * (1 - t)}px)` };

        case 'scale':
            return { transform: `scale(${t})` };

        case 'ascend':
            // Rises upward with fade (enters from below)
            return {
                opacity: t,
                transform: `translateY(${1000 * (1 - t)}px)`,
            };

        case 'descend':
            // Falls downward with fade (enters from above)
            return {
                opacity: t,
                transform: `translateY(${-1000 * (1 - t)}px)`,
            };

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
        if (config.anim === 'none') return {};
        return computeAnimStyle(config.anim, state.currentTime, config.animDuration, config.startTime);
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
