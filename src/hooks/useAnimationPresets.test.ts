// ─────────────────────────────────────────────────
// useAnimationPresets.test.ts — Pure functions + store
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    presetLabel,
    computeAnimStyle,
    ANIM_PRESETS,
    useAnimPresetStore,
} from './useAnimationPresets';

describe('ANIM_PRESETS', () => {
    it('has 9 presets', () => {
        expect(ANIM_PRESETS).toHaveLength(9);
    });

    it('first preset is none', () => {
        expect(ANIM_PRESETS[0]!.value).toBe('none');
    });

    it('all have label and value', () => {
        for (const p of ANIM_PRESETS) {
            expect(p.label.length).toBeGreaterThan(0);
            expect(p.value.length).toBeGreaterThan(0);
        }
    });
});

describe('presetLabel', () => {
    it('returns label for known presets', () => {
        expect(presetLabel('fade')).toBe('Fade In');
        expect(presetLabel('scale')).toBe('Scale Up');
        expect(presetLabel('none')).toBe('None');
    });

    it('returns None for unknown preset', () => {
        expect(presetLabel('unknown' as any)).toBe('None');
    });
});

describe('computeAnimStyle', () => {
    it('returns display:none before startTime (AE model)', () => {
        const style = computeAnimStyle('fade', 0, 0.3, 0.5);
        expect(style.display).toBe('none');
    });

    it('returns display:none after endTime (AE model)', () => {
        const style = computeAnimStyle('fade', 5, 0.3, 0, 2);
        expect(style.display).toBe('none');
    });

    it('returns empty for none preset', () => {
        const style = computeAnimStyle('none', 1, 0.3, 0);
        expect(Object.keys(style)).toHaveLength(0);
    });

    it('fade: opacity 0 at start', () => {
        const style = computeAnimStyle('fade', 0, 0.3, 0);
        expect(style.opacity).toBe(0);
    });

    it('fade: opacity 1 after animation', () => {
        const style = computeAnimStyle('fade', 1, 0.3, 0);
        expect(style.opacity).toBe(1);
    });

    it('fade: partial opacity mid-animation', () => {
        const style = computeAnimStyle('fade', 0.15, 0.3, 0);
        expect(style.opacity).toBeGreaterThan(0);
        expect(style.opacity).toBeLessThan(1);
    });

    it('slide-left: starts off-screen', () => {
        const style = computeAnimStyle('slide-left', 0, 0.3, 0);
        expect(style.transform).toContain('1000');
    });

    it('slide-left: ends at position', () => {
        const style = computeAnimStyle('slide-left', 1, 0.3, 0);
        expect(style.transform).toBe('translateX(0px)');
    });

    it('slide-right: starts off-screen left', () => {
        const style = computeAnimStyle('slide-right', 0, 0.3, 0);
        expect(style.transform).toContain('-1000');
    });

    it('slide-up: translateY with 1000', () => {
        const style = computeAnimStyle('slide-up', 0, 0.3, 0);
        expect(style.transform).toContain('translateY');
    });

    it('slide-down: translateY negative', () => {
        const style = computeAnimStyle('slide-down', 0, 0.3, 0);
        expect(style.transform).toContain('-1000');
    });

    it('scale: starts at scale(0)', () => {
        const style = computeAnimStyle('scale', 0, 0.3, 0);
        expect(style.transform).toBe('scale(0)');
    });

    it('scale: ends at scale(1)', () => {
        const style = computeAnimStyle('scale', 1, 0.3, 0);
        expect(style.transform).toBe('scale(1)');
    });

    it('ascend: has opacity and translateY', () => {
        const style = computeAnimStyle('ascend', 0.15, 0.3, 0);
        expect(style.opacity).toBeDefined();
        expect(style.transform).toContain('translateY');
    });

    it('descend: has opacity and translateY', () => {
        const style = computeAnimStyle('descend', 0.15, 0.3, 0);
        expect(style.opacity).toBeDefined();
        expect(style.transform).toContain('translateY');
    });
});

describe('useAnimPresetStore', () => {
    it('starts with empty presets', () => {
        expect(typeof useAnimPresetStore.getState().presets).toBe('object');
    });

    it('setPreset adds a config', () => {
        useAnimPresetStore.getState().setPreset('el-1', { anim: 'fade', animDuration: 0.5 });
        const p = useAnimPresetStore.getState().getPreset('el-1');
        expect(p.anim).toBe('fade');
        expect(p.animDuration).toBe(0.5);
    });

    it('getPreset returns default for unknown', () => {
        const p = useAnimPresetStore.getState().getPreset('nope');
        expect(p.anim).toBe('none');
    });

    it('removePreset removes config', () => {
        useAnimPresetStore.getState().setPreset('el-2', { anim: 'scale' });
        useAnimPresetStore.getState().removePreset('el-2');
        expect(useAnimPresetStore.getState().getPreset('el-2').anim).toBe('none');
    });

    it('setTiming updates start/end', () => {
        useAnimPresetStore.getState().setPreset('el-3', { anim: 'fade' });
        useAnimPresetStore.getState().setTiming('el-3', 1, 5);
        const p = useAnimPresetStore.getState().getPreset('el-3');
        expect(p.startTime).toBe(1);
        expect(p.endTime).toBe(5);
    });

    it('setCurrentTime and setIsPlaying work', () => {
        useAnimPresetStore.getState().setCurrentTime(2.5);
        expect(useAnimPresetStore.getState().currentTime).toBe(2.5);
        useAnimPresetStore.getState().setIsPlaying(true);
        expect(useAnimPresetStore.getState().isPlaying).toBe(true);
    });

    it('getAnimStyle returns CSSProperties', () => {
        useAnimPresetStore.getState().setPreset('el-4', { anim: 'fade', startTime: 0 });
        useAnimPresetStore.getState().setCurrentTime(0);
        const style = useAnimPresetStore.getState().getAnimStyle('el-4');
        expect(typeof style).toBe('object');
    });

    it('setPreset merges animOut field', () => {
        useAnimPresetStore.getState().setPreset('el-out', { anim: 'slide-left', animOut: 'fade', animOutDuration: 0.5 });
        const p = useAnimPresetStore.getState().getPreset('el-out');
        expect(p.animOut).toBe('fade');
        expect(p.animOutDuration).toBe(0.5);
    });

    it('getPreset returns animOut=none by default', () => {
        const p = useAnimPresetStore.getState().getPreset('unknown-out');
        expect(p.animOut).toBe('none');
    });
});

// ══════════════════════════════════════════════════
// computeAnimStyle — OUT animation
// ══════════════════════════════════════════════════

describe('computeAnimStyle — Out animation', () => {
    it('fade out: opacity decreases near endTime', () => {
        // endTime=5, outDuration=0.5 → out starts at 4.5
        const style = computeAnimStyle('none', 4.7, 0.3, 0, 5, 'fade', 0.5);
        expect(style.opacity).toBeDefined();
        expect(style.opacity as number).toBeLessThan(1);
        expect(style.opacity as number).toBeGreaterThan(0);
    });

    it('fade out: opacity ~0 at endTime', () => {
        const style = computeAnimStyle('none', 5.0, 0.3, 0, 5, 'fade', 0.5);
        expect(style.opacity).toBeCloseTo(0, 1);
    });

    it('fade out: no effect before out zone', () => {
        // endTime=5, outDuration=0.5 → out starts at 4.5
        // At t=3, should be normal (no out effect)
        const style = computeAnimStyle('none', 3.0, 0.3, 0, 5, 'fade', 0.5);
        expect(style).toEqual({}); // none preset, not in out zone
    });

    it('slide-left out: translateX negative near endTime', () => {
        const style = computeAnimStyle('none', 4.7, 0.3, 0, 5, 'slide-left', 0.5);
        expect(style.transform).toContain('translateX');
    });

    it('no regression: animOut=none behaves exactly like before', () => {
        const withoutOut = computeAnimStyle('fade', 0.15, 0.3, 0, 5);
        const withNoneOut = computeAnimStyle('fade', 0.15, 0.3, 0, 5, 'none', 0.3);
        expect(withoutOut).toEqual(withNoneOut);
    });

    it('In + Out coexist: fade in at start, fade out at end', () => {
        // t=0 → in zone → opacity near 0
        const inStyle = computeAnimStyle('fade', 0, 0.3, 0, 5, 'fade', 0.5);
        expect(inStyle.opacity).toBeCloseTo(0, 1);

        // t=2 → normal zone → opacity 1 (no animation active)
        const midStyle = computeAnimStyle('fade', 2, 0.3, 0, 5, 'fade', 0.5);
        expect(midStyle.opacity).toBeCloseTo(1, 1);

        // t=4.8 → out zone → opacity decreasing
        const outStyle = computeAnimStyle('fade', 4.8, 0.3, 0, 5, 'fade', 0.5);
        expect(outStyle.opacity as number).toBeLessThan(1);
        expect(outStyle.opacity as number).toBeGreaterThan(0);
    });

    it('display:none after endTime even with animOut', () => {
        const style = computeAnimStyle('fade', 6.0, 0.3, 0, 5, 'fade', 0.5);
        expect(style.display).toBe('none');
    });

    it('display:none before startTime even with animOut', () => {
        const style = computeAnimStyle('fade', 0, 0.3, 1, 5, 'fade', 0.5);
        expect(style.display).toBe('none');
    });

    it('★ DIRECTION: slide-down out exits DOWNWARD (positive translateY)', () => {
        // At t=4.7, out is in progress. Slide to Bottom = exit DOWN = positive Y
        const style = computeAnimStyle('none', 4.7, 0.3, 0, 5, 'slide-down', 0.5);
        const match = style.transform?.match(/translateY\((.+?)px\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeGreaterThan(0); // positive = downward
    });

    it('★ DIRECTION: slide-left out exits LEFT (negative translateX)', () => {
        const style = computeAnimStyle('none', 4.7, 0.3, 0, 5, 'slide-left', 0.5);
        const match = style.transform?.match(/translateX\((.+?)px\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeLessThan(0); // negative = leftward
    });

    it('★ DIRECTION: slide-up out exits UPWARD (negative translateY)', () => {
        const style = computeAnimStyle('none', 4.7, 0.3, 0, 5, 'slide-up', 0.5);
        const match = style.transform?.match(/translateY\((.+?)px\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeLessThan(0); // negative = upward
    });

    it('★ DIRECTION: slide-right out exits RIGHT (positive translateX)', () => {
        const style = computeAnimStyle('none', 4.7, 0.3, 0, 5, 'slide-right', 0.5);
        const match = style.transform?.match(/translateX\((.+?)px\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeGreaterThan(0); // positive = rightward
    });
});
