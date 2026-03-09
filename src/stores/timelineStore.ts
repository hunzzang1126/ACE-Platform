// ─────────────────────────────────────────────────
// timelineStore — Keyframe animation data model
// ─────────────────────────────────────────────────
// Manages per-element keyframe tracks for the timeline editor.
// Works alongside useAnimPresetStore for preset-based animations
// and provides fine-grained keyframe editing for power users.
// ─────────────────────────────────────────────────

import { create } from 'zustand';

// ── Types ────────────────────────────────────────

export type EasingType =
    | 'linear'
    | 'ease_in'
    | 'ease_out'
    | 'ease_in_out'
    | 'bounce'
    | 'elastic'
    | 'spring';

export type AnimatableProperty =
    | 'x'
    | 'y'
    | 'opacity'
    | 'scale_x'
    | 'scale_y'
    | 'rotation'
    | 'width'
    | 'height';

export interface Keyframe {
    /** Time in seconds */
    time: number;
    /** Target value */
    value: number;
    /** Easing from this keyframe to the next */
    easing: EasingType;
}

export interface PropertyTrack {
    /** Which property this track animates */
    property: AnimatableProperty;
    /** Ordered keyframes (sorted by time) */
    keyframes: Keyframe[];
}

export interface ElementTimeline {
    /** Element ID (matches EngineNode.id) */
    elementId: number;
    /** All property tracks for this element */
    tracks: PropertyTrack[];
}

// ── Store ────────────────────────────────────────

interface TimelineStore {
    /** Duration in seconds */
    duration: number;
    /** Current scrubber position (seconds) */
    currentTime: number;
    /** Is timeline playing */
    isPlaying: boolean;
    /** Loop playback */
    isLooping: boolean;
    /** Playback speed multiplier */
    speed: number;
    /** All element timelines */
    timelines: Record<string, ElementTimeline>;
    /** Currently selected keyframe for editing */
    selectedKeyframe: { elementId: number; property: AnimatableProperty; keyframeIndex: number } | null;

    // ── Actions ──
    setDuration: (d: number) => void;
    setCurrentTime: (t: number) => void;
    setIsPlaying: (v: boolean) => void;
    setIsLooping: (v: boolean) => void;
    setSpeed: (s: number) => void;

    /** Add or update a keyframe */
    setKeyframe: (elementId: number, property: AnimatableProperty, time: number, value: number, easing?: EasingType) => void;
    /** Remove a keyframe */
    removeKeyframe: (elementId: number, property: AnimatableProperty, keyframeIndex: number) => void;
    /** Clear all keyframes for an element */
    clearElement: (elementId: number) => void;
    /** Clear all keyframes */
    clearAll: () => void;
    /** Select a keyframe for editing */
    selectKeyframe: (elementId: number, property: AnimatableProperty, keyframeIndex: number) => void;
    /** Deselect keyframe */
    deselectKeyframe: () => void;
    /** Get interpolated value at time for a property */
    getValueAt: (elementId: number, property: AnimatableProperty, time: number) => number | null;
}

// ── Easing Functions ─────────────────────────────

function applyEasing(t: number, easing: EasingType): number {
    const c = Math.max(0, Math.min(1, t));
    switch (easing) {
        case 'linear': return c;
        case 'ease_in': return c * c * c;
        case 'ease_out': { const inv = 1 - c; return 1 - inv * inv * inv; }
        case 'ease_in_out': return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
        case 'bounce': {
            const n1 = 7.5625, d1 = 2.75;
            let x = c;
            if (x < 1 / d1) return n1 * x * x;
            if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
            if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
            x -= 2.625 / d1; return n1 * x * x + 0.984375;
        }
        case 'elastic': {
            if (c === 0 || c === 1) return c;
            return -Math.pow(2, 10 * c - 10) * Math.sin((c * 10 - 10.75) * ((2 * Math.PI) / 3));
        }
        case 'spring': {
            const freq = 4.7, decay = 4;
            return 1 - Math.exp(-decay * c) * Math.cos(freq * Math.PI * c);
        }
        default: return c;
    }
}

// ── Interpolation ────────────────────────────────

function interpolate(keyframes: Keyframe[], time: number): number | null {
    if (keyframes.length === 0) return null;
    if (keyframes.length === 1) return keyframes[0]!.value;

    // Before first keyframe
    if (time <= keyframes[0]!.time) return keyframes[0]!.value;
    // After last keyframe
    if (time >= keyframes[keyframes.length - 1]!.time) return keyframes[keyframes.length - 1]!.value;

    // Find surrounding keyframes
    for (let i = 0; i < keyframes.length - 1; i++) {
        const a = keyframes[i]!;
        const b = keyframes[i + 1]!;
        if (time >= a.time && time <= b.time) {
            const duration = b.time - a.time;
            if (duration <= 0) return a.value;
            const progress = (time - a.time) / duration;
            const eased = applyEasing(progress, a.easing);
            return a.value + (b.value - a.value) * eased;
        }
    }
    return keyframes[keyframes.length - 1]!.value;
}

// ── Store Implementation ─────────────────────────

export const useTimelineStore = create<TimelineStore>()((set, get) => ({
    duration: 5.0,
    currentTime: 0,
    isPlaying: false,
    isLooping: false,
    speed: 1.0,
    timelines: {},
    selectedKeyframe: null,

    setDuration: (d) => set({ duration: Math.max(0.1, d) }),
    setCurrentTime: (t) => set({ currentTime: Math.max(0, t) }),
    setIsPlaying: (v) => set({ isPlaying: v }),
    setIsLooping: (v) => set({ isLooping: v }),
    setSpeed: (s) => set({ speed: Math.max(0.1, Math.min(10, s)) }),

    setKeyframe: (elementId, property, time, value, easing = 'ease_out') => {
        set((state) => {
            const key = String(elementId);
            const timeline = state.timelines[key] ?? { elementId, tracks: [] };
            let track = timeline.tracks.find(t => t.property === property);

            if (!track) {
                track = { property, keyframes: [] };
                timeline.tracks = [...timeline.tracks, track];
            }

            // Replace existing keyframe at same time, or add new
            const existingIdx = track.keyframes.findIndex(k => Math.abs(k.time - time) < 0.001);
            const newKeyframes = [...track.keyframes];
            if (existingIdx >= 0) {
                newKeyframes[existingIdx] = { time, value, easing };
            } else {
                newKeyframes.push({ time, value, easing });
                newKeyframes.sort((a, b) => a.time - b.time);
            }

            const updatedTrack = { ...track, keyframes: newKeyframes };
            const updatedTracks = timeline.tracks.map(t => t.property === property ? updatedTrack : t);

            return {
                timelines: {
                    ...state.timelines,
                    [key]: { ...timeline, tracks: updatedTracks },
                },
            };
        });
    },

    removeKeyframe: (elementId, property, keyframeIndex) => {
        set((state) => {
            const key = String(elementId);
            const timeline = state.timelines[key];
            if (!timeline) return state;

            const track = timeline.tracks.find(t => t.property === property);
            if (!track || keyframeIndex < 0 || keyframeIndex >= track.keyframes.length) return state;

            const newKeyframes = track.keyframes.filter((_, i) => i !== keyframeIndex);
            const updatedTrack = { ...track, keyframes: newKeyframes };
            const updatedTracks = newKeyframes.length > 0
                ? timeline.tracks.map(t => t.property === property ? updatedTrack : t)
                : timeline.tracks.filter(t => t.property !== property);

            return {
                timelines: {
                    ...state.timelines,
                    [key]: { ...timeline, tracks: updatedTracks },
                },
            };
        });
    },

    clearElement: (elementId) => {
        set((state) => {
            const { [String(elementId)]: _, ...rest } = state.timelines;
            return { timelines: rest };
        });
    },

    clearAll: () => set({ timelines: {} }),

    selectKeyframe: (elementId, property, keyframeIndex) => {
        set({ selectedKeyframe: { elementId, property, keyframeIndex } });
    },
    deselectKeyframe: () => set({ selectedKeyframe: null }),

    getValueAt: (elementId, property, time) => {
        const timeline = get().timelines[String(elementId)];
        if (!timeline) return null;
        const track = timeline.tracks.find(t => t.property === property);
        if (!track) return null;
        return interpolate(track.keyframes, time);
    },
}));

// ── Export easing for external use ───────────────

export { applyEasing, interpolate };
