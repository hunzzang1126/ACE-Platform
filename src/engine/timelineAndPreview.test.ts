// ─────────────────────────────────────────────────
// timelineAndPreview.test.ts — Tests for dynamic timeline,
// animation preview, and MP4 export pipeline
// ─────────────────────────────────────────────────
// Covers: computeAnimStyle, scaleAnimStyle, endTime=-1 resolution,
// timeline duration calc, renderVariantAtTime export
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { computeAnimStyle } from '@/hooks/useAnimationPresets';
import type { AnimPresetType } from '@/hooks/useAnimationPresets';

// ── scaleAnimStyle (extracted for testing) ──
function scaleAnimStyle(style: Record<string, unknown>, s: number): Record<string, unknown> {
    const result = { ...style };
    if (result.transform && typeof result.transform === 'string') {
        result.transform = result.transform
            .replace(/translateX\(([^)]+)px\)/g, (_: string, v: string) => `translateX(${parseFloat(v) * s}px)`)
            .replace(/translateY\(([^)]+)px\)/g, (_: string, v: string) => `translateY(${parseFloat(v) * s}px)`);
    }
    return result;
}

// ── endTime=-1 resolution logic (extracted for testing) ──
function resolveEndTime(endTime: number, defaultDuration: number): number {
    return endTime < 0 ? defaultDuration : endTime;
}

function calcTimelineDuration(
    barEndTimes: number[],
    defaultDuration: number,
    maxDuration: number,
): number {
    let maxEnd = 0.5;
    for (const et of barEndTimes) {
        const resolved = resolveEndTime(et, defaultDuration);
        if (resolved > maxEnd) maxEnd = resolved;
    }
    return Math.min(maxDuration, Math.max(1, Math.ceil(maxEnd)));
}

// ═══════════════════════════════════════════════════
// computeAnimStyle tests
// ═══════════════════════════════════════════════════

describe('computeAnimStyle', () => {
    it('returns empty object for "none" preset', () => {
        const style = computeAnimStyle('none', 0, 0.6, 0);
        expect(style).toEqual({});
    });

    it('returns opacity 0 for fade at progress=0', () => {
        const style = computeAnimStyle('fade', 0, 0.6, 0);
        expect(style.opacity).toBeCloseTo(0, 1);
    });

    it('returns opacity ~1 for fade at progress=1 (after animation ends)', () => {
        const style = computeAnimStyle('fade', 1.0, 0.6, 0);
        expect(style.opacity).toBeCloseTo(1, 1);
    });

    it('returns opacity between 0 and 1 for fade at mid-progress', () => {
        const style = computeAnimStyle('fade', 0.3, 0.6, 0);
        const op = style.opacity as number;
        expect(op).toBeGreaterThan(0);
        expect(op).toBeLessThan(1);
    });

    it('slide-left starts off-screen right at progress=0', () => {
        const style = computeAnimStyle('slide-left', 0, 0.6, 0);
        expect(style.transform).toContain('translateX');
        const match = (style.transform as string).match(/translateX\(([^)]+)px\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeGreaterThan(0);
    });

    it('slide-left is at 0 (resting) at progress=1', () => {
        const style = computeAnimStyle('slide-left', 1.0, 0.6, 0);
        expect(style.transform).toContain('translateX(0px)');
    });

    it('slide-right starts off-screen left at progress=0', () => {
        const style = computeAnimStyle('slide-right', 0, 0.6, 0);
        const match = (style.transform as string).match(/translateX\(([^)]+)px\)/);
        expect(parseFloat(match![1])).toBeLessThan(0);
    });

    it('slide-up starts off-screen below at progress=0', () => {
        const style = computeAnimStyle('slide-up', 0, 0.6, 0);
        const match = (style.transform as string).match(/translateY\(([^)]+)px\)/);
        expect(parseFloat(match![1])).toBeGreaterThan(0);
    });

    it('slide-down starts off-screen above at progress=0', () => {
        const style = computeAnimStyle('slide-down', 0, 0.6, 0);
        const match = (style.transform as string).match(/translateY\(([^)]+)px\)/);
        expect(parseFloat(match![1])).toBeLessThan(0);
    });

    it('scale starts at 0 at progress=0', () => {
        const style = computeAnimStyle('scale', 0, 0.6, 0);
        expect(style.transform).toBe('scale(0)');
    });

    it('scale is at 1 at progress=1', () => {
        const style = computeAnimStyle('scale', 1.0, 0.6, 0);
        expect(style.transform).toBe('scale(1)');
    });

    it('ascend has both opacity and translateY', () => {
        const style = computeAnimStyle('ascend', 0, 0.6, 0);
        expect(style.opacity).toBeDefined();
        expect(style.transform).toContain('translateY');
    });

    it('descend has both opacity and translateY', () => {
        const style = computeAnimStyle('descend', 0, 0.6, 0);
        expect(style.opacity).toBeDefined();
        expect(style.transform).toContain('translateY');
    });

    it('respects startTime — before startTime, element does not exist', () => {
        const style = computeAnimStyle('fade', 1.0, 0.6, 2.0);
        // currentTime=1.0, startTime=2.0 → layer does not exist yet
        expect(style.display).toBe('none');
    });

    it('respects startTime — at startTime + duration, progress is 1', () => {
        const style = computeAnimStyle('fade', 2.6, 0.6, 2.0);
        // currentTime=2.6, startTime=2.0, duration=0.6 → animation ended
        expect(style.opacity).toBeCloseTo(1, 1);
    });

    it('all presets return valid styles', () => {
        const presets: AnimPresetType[] = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'descend'];
        for (const preset of presets) {
            const style = computeAnimStyle(preset, 0.3, 0.6, 0);
            expect(style).toBeDefined();
            expect(typeof style).toBe('object');
        }
    });

    // ── Visibility based on startTime/endTime ──

    it('★ REGRESSION: none preset — layer does not exist before startTime', () => {
        const style = computeAnimStyle('none', 0.2, 0.6, 0.5);
        // currentTime=0.2, startTime=0.5 → layer does not exist
        expect(style.display).toBe('none');
    });

    it('none preset shows element at startTime', () => {
        const style = computeAnimStyle('none', 0.5, 0.6, 0.5);
        // currentTime >= startTime → visible, no animation → empty
        expect(style).toEqual({});
    });

    it('none preset shows element after startTime', () => {
        const style = computeAnimStyle('none', 2.0, 0.6, 0.5);
        expect(style).toEqual({});
    });

    it('element does not exist after endTime', () => {
        const style = computeAnimStyle('none', 4.0, 0.6, 0, 3.0);
        expect(style.display).toBe('none');
    });

    it('shows element before endTime', () => {
        const style = computeAnimStyle('none', 2.0, 0.6, 0, 3.0);
        expect(style).toEqual({});
    });

    it('fade element does not exist before startTime', () => {
        const style = computeAnimStyle('fade', 0.1, 0.6, 0.5);
        expect(style.display).toBe('none');
    });

    it('slide-left element does not exist before startTime', () => {
        const style = computeAnimStyle('slide-left', 0.1, 0.6, 0.5);
        expect(style.display).toBe('none');
    });

    it('any preset element does not exist after endTime', () => {
        const style = computeAnimStyle('fade', 5.0, 0.6, 0, 3.0);
        expect(style.display).toBe('none');
    });
});

// ═══════════════════════════════════════════════════
// computeAnimStyle — Out animation tests
// ═══════════════════════════════════════════════════

describe('computeAnimStyle — Out animation', () => {
    it('★ REGRESSION: Out fires when endTime is explicit', () => {
        // outPreset=fade, endTime=3, outDuration=0.5 → Out starts at 2.5
        const style = computeAnimStyle('none', 2.8, 0.6, 0, 3.0, 'fade', 0.5);
        expect(style.opacity).toBeDefined();
        expect(style.opacity as number).toBeLessThan(1);
    });

    it('★ REGRESSION: Out fires with timelineDuration fallback when endTime is undefined', () => {
        // No explicit endTime → effectiveEnd = timelineDuration = 5
        // outPreset=fade, outDuration=0.3 → Out starts at 4.7
        const style = computeAnimStyle('none', 4.8, 0.6, 0, undefined, 'fade', 0.3, 5);
        expect(style.opacity).toBeDefined();
        expect(style.opacity as number).toBeLessThan(1);
    });

    it('★ REGRESSION: Out does NOT fire without timelineDuration when endTime is undefined', () => {
        // No endTime, no timelineDuration → effectiveEnd = undefined → Out never fires
        const style = computeAnimStyle('none', 4.8, 0.6, 0, undefined, 'fade', 0.3);
        expect(style).toEqual({});
    });

    it('Out slide-down uses easeIn (slow start)', () => {
        // endTime=5, outDuration=0.3, outStart=4.7
        // At t=4.733 (first frame), easeIn(0.11) ≈ 0.001 → translateY ≈ 1px
        const style = computeAnimStyle('none', 4.733, 0.6, 0, 5, 'slide-down', 0.3);
        const match = (style.transform as string)?.match(/translateY\(([^)]+)px\)/);
        expect(match).toBeTruthy();
        const offset = parseFloat(match![1]);
        // easeIn should give small offset at start (< 20px)
        expect(offset).toBeLessThan(20);
        expect(offset).toBeGreaterThan(0);
    });

    it('Out slide-down has large offset near end (easeIn accelerates)', () => {
        // At t=4.967 (last frame), easeIn(0.89) ≈ 0.70 → translateY ≈ 700px
        const style = computeAnimStyle('none', 4.95, 0.6, 0, 5, 'slide-down', 0.3);
        const match = (style.transform as string)?.match(/translateY\(([^)]+)px\)/);
        expect(match).toBeTruthy();
        const offset = parseFloat(match![1]);
        expect(offset).toBeGreaterThan(500);
    });

    it('Out slide-left moves element leftward', () => {
        const style = computeAnimStyle('none', 4.85, 0.6, 0, 5, 'slide-left', 0.3);
        const match = (style.transform as string)?.match(/translateX\(([^)]+)px\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeLessThan(0);
    });

    it('Out slide-right moves element rightward', () => {
        const style = computeAnimStyle('none', 4.85, 0.6, 0, 5, 'slide-right', 0.3);
        const match = (style.transform as string)?.match(/translateX\(([^)]+)px\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeGreaterThan(0);
    });

    it('Out slide-up moves element upward', () => {
        const style = computeAnimStyle('none', 4.85, 0.6, 0, 5, 'slide-up', 0.3);
        const match = (style.transform as string)?.match(/translateY\(([^)]+)px\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeLessThan(0);
    });

    it('Out scale-down reduces scale', () => {
        const style = computeAnimStyle('none', 4.85, 0.6, 0, 5, 'scale', 0.3);
        const match = (style.transform as string)?.match(/scale\(([^)]+)\)/);
        expect(match).toBeTruthy();
        expect(parseFloat(match![1])).toBeLessThan(1);
    });

    it('Out fade reduces opacity to 0', () => {
        // Near end: opacity should be close to 0
        const style = computeAnimStyle('none', 4.99, 0.6, 0, 5, 'fade', 0.3);
        expect(style.opacity as number).toBeLessThan(0.3);
    });

    it('element hidden after effectiveEnd (timelineDuration fallback)', () => {
        const style = computeAnimStyle('none', 5.1, 0.6, 0, undefined, 'fade', 0.3, 5);
        expect(style.display).toBe('none');
    });

    it('Out does not apply before outStart zone', () => {
        // endTime=5, outDuration=0.3, outStart=4.7 → at t=4.5 Out not active
        const style = computeAnimStyle('none', 4.5, 0.6, 0, 5, 'slide-down', 0.3);
        expect(style).toEqual({});
    });

    it('In and Out coexist: In at start, Out at end', () => {
        // In=fade at t=0.1, Out=slide-down at t=4.8
        const styleIn = computeAnimStyle('fade', 0.1, 0.6, 0, 5, 'slide-down', 0.3);
        expect(styleIn.opacity).toBeDefined(); // In: fade opacity

        const styleOut = computeAnimStyle('fade', 4.85, 0.6, 0, 5, 'slide-down', 0.3);
        expect(styleOut.transform).toBeDefined(); // Out: slide transform
    });

    it('In plays normally in mid-timeline (Out not active)', () => {
        const style = computeAnimStyle('fade', 2.0, 0.6, 0, 5, 'slide-down', 0.3);
        // far past In end, before Out start → In is complete (opacity=1)
        expect(style.opacity).toBeCloseTo(1, 1);
        // No Out transform present
        expect(style.transform).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════
// scaleAnimStyle tests
// ═══════════════════════════════════════════════════

describe('scaleAnimStyle', () => {
    it('scales translateX by scale factor', () => {
        const input = { transform: 'translateX(1000px)' };
        const result = scaleAnimStyle(input, 0.3);
        expect(result.transform).toBe('translateX(300px)');
    });

    it('scales translateY by scale factor', () => {
        const input = { transform: 'translateY(500px)' };
        const result = scaleAnimStyle(input, 0.5);
        expect(result.transform).toBe('translateY(250px)');
    });

    it('scales negative translate values', () => {
        const input = { transform: 'translateX(-1000px)' };
        const result = scaleAnimStyle(input, 0.3);
        expect(result.transform).toBe('translateX(-300px)');
    });

    it('handles combined translateX + translateY', () => {
        const input = { transform: 'translateX(100px) translateY(200px)' };
        const result = scaleAnimStyle(input, 0.5);
        expect(result.transform).toBe('translateX(50px) translateY(100px)');
    });

    it('does not modify scale() transforms', () => {
        const input = { transform: 'scale(0.5)' };
        const result = scaleAnimStyle(input, 0.3);
        expect(result.transform).toBe('scale(0.5)');
    });

    it('preserves non-transform properties', () => {
        const input = { opacity: 0.5, transform: 'translateX(100px)' };
        const result = scaleAnimStyle(input, 0.5);
        expect(result.opacity).toBe(0.5);
        expect(result.transform).toBe('translateX(50px)');
    });

    it('returns unchanged style when no transform', () => {
        const input = { opacity: 0.8 };
        const result = scaleAnimStyle(input, 0.3);
        expect(result).toEqual({ opacity: 0.8 });
    });

    it('handles scale factor of 1 (no change)', () => {
        const input = { transform: 'translateX(500px)' };
        const result = scaleAnimStyle(input, 1);
        expect(result.transform).toBe('translateX(500px)');
    });

    it('handles scale factor of 0', () => {
        const input = { transform: 'translateX(500px)' };
        const result = scaleAnimStyle(input, 0);
        expect(result.transform).toBe('translateX(0px)');
    });
});

// ═══════════════════════════════════════════════════
// endTime resolution + timeline duration tests
// ═══════════════════════════════════════════════════

describe('endTime resolution', () => {
    it('resolves -1 to default duration', () => {
        expect(resolveEndTime(-1, 5)).toBe(5);
    });

    it('resolves -2 to default duration', () => {
        expect(resolveEndTime(-2, 5)).toBe(5);
    });

    it('keeps explicit positive endTime unchanged', () => {
        expect(resolveEndTime(3.5, 5)).toBe(3.5);
    });

    it('keeps 0 as 0', () => {
        expect(resolveEndTime(0, 5)).toBe(0);
    });
});

describe('calcTimelineDuration', () => {
    const DEFAULT = 5;
    const MAX = 20;

    it('returns 5s when all bars have endTime=-1', () => {
        expect(calcTimelineDuration([-1, -1, -1], DEFAULT, MAX)).toBe(5);
    });

    it('returns max bar end when one bar is extended', () => {
        expect(calcTimelineDuration([-1, 8.5, -1], DEFAULT, MAX)).toBe(9);
    });

    it('★ REGRESSION: shrinks when all bars are under 5s', () => {
        expect(calcTimelineDuration([3, 2.5, 4], DEFAULT, MAX)).toBe(4);
    });

    it('★ REGRESSION: shrinks to 1s minimum', () => {
        expect(calcTimelineDuration([0.3, 0.5, 0.8], DEFAULT, MAX)).toBe(1);
    });

    it('★ REGRESSION: does NOT shrink if one bar still has -1 sentinel', () => {
        // -1 resolves to 5, so timeline stays at 5
        expect(calcTimelineDuration([3, -1, 2], DEFAULT, MAX)).toBe(5);
    });

    it('caps at MAX_DURATION', () => {
        expect(calcTimelineDuration([25, 30], DEFAULT, MAX)).toBe(20);
    });

    it('handles empty array', () => {
        expect(calcTimelineDuration([], DEFAULT, MAX)).toBe(1);
    });

    it('handles single bar exactly at default', () => {
        expect(calcTimelineDuration([5], DEFAULT, MAX)).toBe(5);
    });

    it('ceils to next integer', () => {
        expect(calcTimelineDuration([4.1], DEFAULT, MAX)).toBe(5);
        expect(calcTimelineDuration([6.01], DEFAULT, MAX)).toBe(7);
    });

    it('handles float precision edge case', () => {
        expect(calcTimelineDuration([3.0000001], DEFAULT, MAX)).toBe(4);
    });
});

// ═══════════════════════════════════════════════════
// fabricVideoExporter export tests
// ═══════════════════════════════════════════════════

describe('fabricVideoExporter exports', () => {
    it('exports renderVariantAtTime function', async () => {
        const mod = await import('@/engine/fabricVideoExporter');
        expect(typeof mod.renderVariantAtTime).toBe('function');
    });

    it('exports renderFrameAtTime function', async () => {
        const mod = await import('@/engine/fabricVideoExporter');
        expect(typeof mod.renderFrameAtTime).toBe('function');
    });

    it('exports exportVariantToMp4 function', async () => {
        const mod = await import('@/engine/fabricVideoExporter');
        expect(typeof mod.exportVariantToMp4).toBe('function');
    });
});
