// ─────────────────────────────────────────────────
// timelineStore.test — Keyframe timeline store tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore, applyEasing, interpolate } from './timelineStore';
import type { Keyframe } from './timelineStore';

describe('timelineStore', () => {
    beforeEach(() => {
        useTimelineStore.setState({
            duration: 5.0,
            currentTime: 0,
            isPlaying: false,
            isLooping: false,
            speed: 1.0,
            timelines: {},
            selectedKeyframe: null,
        });
    });

    // ── Duration & Playback ──
    it('sets duration with minimum clamp', () => {
        useTimelineStore.getState().setDuration(0.05);
        expect(useTimelineStore.getState().duration).toBe(0.1);
    });

    it('sets playback speed with clamp', () => {
        useTimelineStore.getState().setSpeed(20);
        expect(useTimelineStore.getState().speed).toBe(10);
        useTimelineStore.getState().setSpeed(-1);
        expect(useTimelineStore.getState().speed).toBe(0.1);
    });

    // ── Keyframe CRUD ──
    it('adds keyframes to element track', () => {
        const { setKeyframe } = useTimelineStore.getState();
        setKeyframe(1, 'opacity', 0, 0, 'linear');
        setKeyframe(1, 'opacity', 1, 1, 'ease_out');

        const timeline = useTimelineStore.getState().timelines['1'];
        expect(timeline).toBeDefined();
        expect(timeline!.tracks.length).toBe(1);
        expect(timeline!.tracks[0]!.keyframes.length).toBe(2);
    });

    it('sorts keyframes by time', () => {
        const { setKeyframe } = useTimelineStore.getState();
        setKeyframe(1, 'x', 2, 100);
        setKeyframe(1, 'x', 0, 0);
        setKeyframe(1, 'x', 1, 50);

        const track = useTimelineStore.getState().timelines['1']!.tracks[0]!;
        expect(track.keyframes.map(k => k.time)).toEqual([0, 1, 2]);
    });

    it('replaces keyframe at same time', () => {
        const { setKeyframe } = useTimelineStore.getState();
        setKeyframe(1, 'opacity', 0.5, 0.3);
        setKeyframe(1, 'opacity', 0.5, 0.8);

        const track = useTimelineStore.getState().timelines['1']!.tracks[0]!;
        expect(track.keyframes.length).toBe(1);
        expect(track.keyframes[0]!.value).toBe(0.8);
    });

    it('removes keyframe by index', () => {
        const { setKeyframe, removeKeyframe } = useTimelineStore.getState();
        setKeyframe(1, 'y', 0, 0);
        setKeyframe(1, 'y', 1, 100);
        removeKeyframe(1, 'y', 0);

        const track = useTimelineStore.getState().timelines['1']!.tracks[0]!;
        expect(track.keyframes.length).toBe(1);
        expect(track.keyframes[0]!.value).toBe(100);
    });

    it('removes track when last keyframe is deleted', () => {
        const { setKeyframe, removeKeyframe } = useTimelineStore.getState();
        setKeyframe(1, 'rotation', 0, 0);
        removeKeyframe(1, 'rotation', 0);

        const timeline = useTimelineStore.getState().timelines['1']!;
        expect(timeline.tracks.length).toBe(0);
    });

    it('clears all keyframes for an element', () => {
        const { setKeyframe, clearElement } = useTimelineStore.getState();
        setKeyframe(1, 'x', 0, 0);
        setKeyframe(1, 'y', 0, 0);
        clearElement(1);
        expect(useTimelineStore.getState().timelines['1']).toBeUndefined();
    });

    // ── Interpolation ──
    it('interpolates between keyframes', () => {
        const { getValueAt, setKeyframe } = useTimelineStore.getState();
        setKeyframe(1, 'opacity', 0, 0, 'linear');
        setKeyframe(1, 'opacity', 2, 1, 'linear');

        expect(useTimelineStore.getState().getValueAt(1, 'opacity', 1)).toBeCloseTo(0.5, 1);
    });

    it('returns null for missing element', () => {
        expect(useTimelineStore.getState().getValueAt(999, 'x', 0)).toBeNull();
    });

    it('clamps to first/last keyframe outside range', () => {
        const { setKeyframe } = useTimelineStore.getState();
        setKeyframe(1, 'x', 1, 50, 'linear');
        setKeyframe(1, 'x', 3, 100, 'linear');

        expect(useTimelineStore.getState().getValueAt(1, 'x', 0)).toBe(50);
        expect(useTimelineStore.getState().getValueAt(1, 'x', 5)).toBe(100);
    });

    // ── Selection ──
    it('selects and deselects keyframe', () => {
        const s = useTimelineStore.getState();
        s.selectKeyframe(1, 'opacity', 0);
        expect(useTimelineStore.getState().selectedKeyframe).toEqual({ elementId: 1, property: 'opacity', keyframeIndex: 0 });
        useTimelineStore.getState().deselectKeyframe();
        expect(useTimelineStore.getState().selectedKeyframe).toBeNull();
    });
});

// ── Easing Functions ──
describe('applyEasing', () => {
    it('linear returns input', () => {
        expect(applyEasing(0.5, 'linear')).toBeCloseTo(0.5);
    });

    it('ease_out decelerates', () => {
        expect(applyEasing(0.5, 'ease_out')).toBeGreaterThan(0.5);
    });

    it('ease_in accelerates', () => {
        expect(applyEasing(0.5, 'ease_in')).toBeLessThan(0.5);
    });

    it('all easings return 0 at t=0 and 1 at t=1', () => {
        const types: Parameters<typeof applyEasing>[1][] = ['linear', 'ease_in', 'ease_out', 'ease_in_out', 'bounce', 'spring'];
        for (const type of types) {
            expect(applyEasing(0, type)).toBeCloseTo(0, 1);
            expect(applyEasing(1, type)).toBeCloseTo(1, 1);
        }
    });
});

// ── Standalone interpolate ──
describe('interpolate', () => {
    it('returns null for empty keyframes', () => {
        expect(interpolate([], 0)).toBeNull();
    });

    it('returns single keyframe value', () => {
        const kf: Keyframe[] = [{ time: 0, value: 42, easing: 'linear' }];
        expect(interpolate(kf, 5)).toBe(42);
    });

    it('interpolates linearly between two keyframes', () => {
        const kf: Keyframe[] = [
            { time: 0, value: 0, easing: 'linear' },
            { time: 1, value: 100, easing: 'linear' },
        ];
        expect(interpolate(kf, 0.5)).toBeCloseTo(50, 0);
    });
});
