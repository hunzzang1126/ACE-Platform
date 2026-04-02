// ─────────────────────────────────────────────────
// useAnimationPresets.test.ts — Animation store + computeAnimStyle tests
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimPresetStore, computeAnimStyle, presetLabel, ANIM_PRESETS } from './useAnimationPresets';
import type { AnimPresetType } from './useAnimationPresets';

describe('useAnimationPresets', () => {
    // ── ANIM_PRESETS constant ──
    describe('ANIM_PRESETS', () => {
        it('should have 9 preset types', () => {
            expect(ANIM_PRESETS).toHaveLength(9);
        });

        it('should include none as first', () => {
            expect(ANIM_PRESETS[0].value).toBe('none');
        });

        it('should have unique values', () => {
            const values = ANIM_PRESETS.map(p => p.value);
            expect(new Set(values).size).toBe(values.length);
        });
    });

    // ── presetLabel ──
    describe('presetLabel', () => {
        it('should return label for known preset', () => {
            expect(presetLabel('fade')).toBe('Fade In');
            expect(presetLabel('scale')).toBe('Scale Up');
        });

        it('should return None for unknown', () => {
            expect(presetLabel('unknown' as AnimPresetType)).toBe('None');
        });
    });

    // ── computeAnimStyle ──
    describe('computeAnimStyle', () => {
        it('should return hidden before startTime', () => {
            const style = computeAnimStyle('fade', 0, 0.5, 1.0);
            expect(style.opacity).toBe(0);
        });

        it('should return empty for none preset after startTime', () => {
            const style = computeAnimStyle('none', 1.0, 0.5, 0);
            expect(Object.keys(style)).toHaveLength(0);
        });

        it('should fade from 0 to 1', () => {
            const start = computeAnimStyle('fade', 0, 0.5, 0);
            expect(start.opacity).toBe(0);

            const end = computeAnimStyle('fade', 0.5, 0.5, 0);
            expect(end.opacity).toBe(1);
        });

        it('should slide-left with translateX', () => {
            const style = computeAnimStyle('slide-left', 0.25, 0.5, 0);
            expect(style.transform).toContain('translateX');
        });

        it('should slide-right with negative translateX', () => {
            const start = computeAnimStyle('slide-right', 0, 0.5, 0);
            expect(start.transform).toContain('translateX(-');
        });

        it('should slide-up with translateY', () => {
            const style = computeAnimStyle('slide-up', 0.25, 0.5, 0);
            expect(style.transform).toContain('translateY');
        });

        it('should scale from 0', () => {
            const start = computeAnimStyle('scale', 0, 0.5, 0);
            expect(start.transform).toBe('scale(0)');
        });

        it('should scale to 1 at end', () => {
            const end = computeAnimStyle('scale', 0.5, 0.5, 0);
            expect(end.transform).toBe('scale(1)');
        });

        it('should ascend with opacity + translateY', () => {
            const style = computeAnimStyle('ascend', 0.25, 0.5, 0);
            expect(style.opacity).toBeDefined();
            expect(style.transform).toContain('translateY');
        });

        it('should descend with opacity + negative translateY', () => {
            const style = computeAnimStyle('descend', 0.25, 0.5, 0);
            expect(style.opacity).toBeDefined();
            expect(style.transform).toContain('translateY(-');
        });

        it('should hide after endTime', () => {
            const style = computeAnimStyle('fade', 3.0, 0.5, 0, 2.0);
            expect(style.opacity).toBe(0);
        });

        it('should show final state after animation completes', () => {
            const style = computeAnimStyle('fade', 5.0, 0.5, 0);
            expect(style.opacity).toBe(1);
        });
    });

    // ── Store ──
    describe('useAnimPresetStore', () => {
        beforeEach(() => {
            useAnimPresetStore.setState({ presets: {}, currentTime: 0, isPlaying: false });
        });

        it('should set and get preset', () => {
            useAnimPresetStore.getState().setPreset('el-1', { anim: 'fade', animDuration: 0.5 });
            const preset = useAnimPresetStore.getState().getPreset('el-1');
            expect(preset.anim).toBe('fade');
            expect(preset.animDuration).toBe(0.5);
        });

        it('should return default for unknown element', () => {
            const preset = useAnimPresetStore.getState().getPreset('nonexistent');
            expect(preset.anim).toBe('none');
            expect(preset.animDuration).toBe(0.3);
        });

        it('should remove preset', () => {
            useAnimPresetStore.getState().setPreset('el-1', { anim: 'scale' });
            useAnimPresetStore.getState().removePreset('el-1');
            const preset = useAnimPresetStore.getState().getPreset('el-1');
            expect(preset.anim).toBe('none');
        });

        it('should set timing', () => {
            useAnimPresetStore.getState().setPreset('el-1', { anim: 'fade' });
            useAnimPresetStore.getState().setTiming('el-1', 1.0, 3.0);
            const preset = useAnimPresetStore.getState().getPreset('el-1');
            expect(preset.startTime).toBe(1.0);
            expect(preset.endTime).toBe(3.0);
        });

        it('should set current time', () => {
            useAnimPresetStore.getState().setCurrentTime(2.5);
            expect(useAnimPresetStore.getState().currentTime).toBe(2.5);
        });

        it('should set playing state', () => {
            useAnimPresetStore.getState().setIsPlaying(true);
            expect(useAnimPresetStore.getState().isPlaying).toBe(true);
        });

        it('should return anim style from store', () => {
            useAnimPresetStore.getState().setPreset('el-1', { anim: 'fade', animDuration: 0.5, startTime: 0 });
            useAnimPresetStore.getState().setCurrentTime(0.25);
            const style = useAnimPresetStore.getState().getAnimStyle('el-1');
            expect(style.opacity).toBeDefined();
            expect(typeof style.opacity).toBe('number');
            expect(style.opacity).toBeGreaterThan(0);
            expect(style.opacity).toBeLessThan(1);
        });

        it('should return empty style for none preset', () => {
            useAnimPresetStore.getState().setPreset('el-1', { anim: 'none' });
            const style = useAnimPresetStore.getState().getAnimStyle('el-1');
            expect(Object.keys(style)).toHaveLength(0);
        });
    });
});
