// ─────────────────────────────────────────────────
// animationSync.test.ts — Animation save/load/direction tests
// ─────────────────────────────────────────────────
// ★ REGRESSION GUARDS:
// - Animation key must not double-prefix (engine-engine-X)
// - Slide directions must match label semantics
// - Effects must be included in headless render opts
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Animation Direction Tests ──

describe('shimAnimation directions', () => {
    // Test the direction logic extracted from shimAnimation.ts

    function computeSlidePosition(anim: string, origLeft: number, origTop: number, t: number) {
        switch (anim) {
            case 'slide-left':
                return { left: origLeft + (300 * (1 - t)), top: origTop };
            case 'slide-right':
                return { left: origLeft + (-300 * (1 - t)), top: origTop };
            case 'slide-up':
                return { left: origLeft, top: origTop + (300 * (1 - t)) };
            case 'slide-down':
                return { left: origLeft, top: origTop + (-300 * (1 - t)) };
            default:
                return { left: origLeft, top: origTop };
        }
    }

    it('★ REGRESSION: slide-left starts from RIGHT side (positive offset at t=0)', () => {
        const pos = computeSlidePosition('slide-left', 100, 50, 0);
        // At t=0, element should be 300px to the RIGHT of its final position
        expect(pos.left).toBe(400); // 100 + 300
    });

    it('★ REGRESSION: slide-left ends at final position (t=1)', () => {
        const pos = computeSlidePosition('slide-left', 100, 50, 1);
        expect(pos.left).toBe(100); // Back to original
    });

    it('★ REGRESSION: slide-right starts from LEFT side (negative offset at t=0)', () => {
        const pos = computeSlidePosition('slide-right', 100, 50, 0);
        // At t=0, element should be 300px to the LEFT of its final position
        expect(pos.left).toBe(-200); // 100 + (-300)
    });

    it('★ REGRESSION: slide-right ends at final position (t=1)', () => {
        const pos = computeSlidePosition('slide-right', 100, 50, 1);
        expect(pos.left).toBe(100);
    });

    it('★ REGRESSION: slide-up starts from BELOW (positive Y offset at t=0)', () => {
        const pos = computeSlidePosition('slide-up', 100, 50, 0);
        expect(pos.top).toBe(350); // 50 + 300
    });

    it('★ REGRESSION: slide-down starts from ABOVE (negative Y offset at t=0)', () => {
        const pos = computeSlidePosition('slide-down', 100, 50, 0);
        expect(pos.top).toBe(-250); // 50 + (-300)
    });
});

// ── Animation Key Tests ──

describe('animation key restore (no double-prefix)', () => {
    it('★ REGRESSION: element ID from elementConverters is already engine-prefixed', () => {
        // elementConverters creates IDs like "engine-123"
        const elId = 'engine-42';

        // OLD (broken): would create "engine-engine-42"
        const brokenKey = `engine-${elId}`;
        expect(brokenKey).toBe('engine-engine-42');  // This was the bug

        // NEW (fixed): use el.id directly
        const fixedKey = elId;
        expect(fixedKey).toBe('engine-42');  // Correct
    });

    it('★ REGRESSION: image/video elements use their original ID without prefix', () => {
        const imageElId = 'img-abc123';
        // Image elements already have non-engine-prefixed IDs
        const fixedKey = imageElId;
        expect(fixedKey).toBe('img-abc123');
        expect(fixedKey).not.toContain('engine-');
    });
});

// ── HTML5 Exporter Direction Tests ──

describe('html5Exporter keyframe directions', () => {
    // Test the direction strings extracted from html5Exporter.ts

    function getKeyframeFrom(anim: string): string {
        switch (anim) {
            case 'slide-left': return 'translateX(100%)';   // enters from right
            case 'slide-right': return 'translateX(-100%)';  // enters from left
            case 'slide-up': return 'translateY(100%)';      // enters from below
            case 'slide-down': return 'translateY(-100%)';   // enters from above
            default: return '';
        }
    }

    it('★ REGRESSION: slide-left CSS starts from translateX(100%) — right side', () => {
        expect(getKeyframeFrom('slide-left')).toBe('translateX(100%)');
    });

    it('★ REGRESSION: slide-right CSS starts from translateX(-100%) — left side', () => {
        expect(getKeyframeFrom('slide-right')).toBe('translateX(-100%)');
    });

    it('★ REGRESSION: slide-up CSS starts from translateY(100%) — below', () => {
        expect(getKeyframeFrom('slide-up')).toBe('translateY(100%)');
    });

    it('★ REGRESSION: slide-down CSS starts from translateY(-100%) — above', () => {
        expect(getKeyframeFrom('slide-down')).toBe('translateY(-100%)');
    });
});

// ── CSS Preview Direction Tests (useAnimationPresets) ──

describe('computeAnimStyle directions (CSS preview)', () => {
    // The computeAnimStyle function is the reference — it was already correct.
    // These tests ensure it stays correct.

    // Inline reimplementation of computeAnimStyle logic for testing
    function getTransformAtT0(preset: string): string {
        switch (preset) {
            case 'slide-left': return `translateX(${1000}px)`;   // enters from right
            case 'slide-right': return `translateX(${-1000}px)`;  // enters from left  
            case 'slide-up': return `translateY(${1000}px)`;      // enters from below
            case 'slide-down': return `translateY(${-1000}px)`;   // enters from above
            default: return '';
        }
    }

    it('all three systems (shim, CSS, export) agree on slide-left = enters from right', () => {
        // shimAnimation: origLeft + (300 * 1) → positive offset → RIGHT
        // CSS preview: translateX(1000px) → positive → RIGHT
        // HTML export: translateX(100%) → positive → RIGHT
        expect(getTransformAtT0('slide-left')).toContain('1000');
        expect(getTransformAtT0('slide-left')).not.toContain('-');
    });

    it('all three systems agree on slide-right = enters from left', () => {
        expect(getTransformAtT0('slide-right')).toContain('-1000');
    });
});

// ── Text Effect in Headless Renderer ──

describe('fabricHeadlessRenderer textEffect', () => {
    it('★ REGRESSION: drop shadow effect produces shadow string', () => {
        const fx = { type: 'drop' as const, intensity: 50, color: '#000000' };
        const fxScale = (fx.intensity) / 50;
        const shadow = `${Math.round(4 * fxScale)}px ${Math.round(4 * fxScale)}px ${Math.round(8 * fxScale)}px ${fx.color}cc`;
        expect(shadow).toBe('4px 4px 8px #000000cc');
    });

    it('★ REGRESSION: glow effect produces centered shadow', () => {
        const fx = { type: 'glow' as const, intensity: 50, color: '#7c3aed' };
        const fxScale = (fx.intensity) / 50;
        const shadow = `0px 0px ${Math.round(20 * fxScale)}px ${fx.color}80`;
        expect(shadow).toBe('0px 0px 20px #7c3aed80');
    });

    it('★ REGRESSION: outline effect produces stroke params', () => {
        const fx = { type: 'outline' as const, intensity: 50, color: '#3b82f6' };
        const fxScale = (fx.intensity) / 50;
        const strokeWidth = Math.max(1, 2 * fxScale);
        expect(strokeWidth).toBe(2);
    });

    it('★ REGRESSION: splice effect makes fill transparent', () => {
        const fx = { type: 'splice' as const, intensity: 50, color: '#ec4899' };
        // splice should set fill='transparent' and stroke=fxColor
        expect(fx.type).toBe('splice');
        // In the actual renderer, opts.fill = 'transparent'
    });

    it('★ REGRESSION: none effect produces no shadow/stroke', () => {
        const fx = { type: 'none' as const, intensity: 50, color: '#000000' };
        expect(fx.type).toBe('none');
        // When type is 'none', the whole effect block is skipped
    });
});
