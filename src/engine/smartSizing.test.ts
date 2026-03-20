// ─────────────────────────────────────────────────
// smartSizing — Regression Tests
// ─────────────────────────────────────────────────
// ★ v2: Tests cover both role-aware smart layout and proportional fallback.
import { describe, it, expect } from 'vitest';
import { classifyRatio, smartSizeElements, LAYOUT_ZONES } from './smartSizing';
import type { ShapeElement, TextElement } from '@/schema/elements.types';
import type { LayoutRole } from '@/schema/layoutRoles';
import { resolveConstraints } from '@/schema/constraints.types';

// ── classifyRatio ──────────────────────────────────

describe('classifyRatio — Aspect Ratio Classification', () => {
    it('728x90 → ultra-wide', () => {
        expect(classifyRatio(728, 90)).toBe('ultra-wide');
    });

    it('970x250 → wide (ratio 3.88)', () => {
        expect(classifyRatio(970, 250)).toBe('wide');
    });

    it('468x60 → ultra-wide', () => {
        expect(classifyRatio(468, 60)).toBe('ultra-wide');
    });

    it('320x50 → ultra-wide', () => {
        expect(classifyRatio(320, 50)).toBe('ultra-wide');
    });

    it('300x250 → square (ratio 1.2)', () => {
        expect(classifyRatio(300, 250)).toBe('square');
    });

    it('1200x628 → landscape', () => {
        expect(classifyRatio(1200, 628)).toBe('landscape');
    });

    it('1080x1080 → square', () => {
        expect(classifyRatio(1080, 1080)).toBe('square');
    });

    it('1200x1200 → square', () => {
        expect(classifyRatio(1200, 1200)).toBe('square');
    });

    it('1080x1920 → portrait', () => {
        expect(classifyRatio(1080, 1920)).toBe('portrait');
    });

    it('320x480 → portrait', () => {
        expect(classifyRatio(320, 480)).toBe('portrait');
    });

    it('160x600 → ultra-tall', () => {
        expect(classifyRatio(160, 600)).toBe('ultra-tall');
    });

    it('300x600 → ultra-tall or portrait (tall ratio)', () => {
        const result = classifyRatio(300, 600);
        expect(['ultra-tall', 'portrait']).toContain(result);
    });
});

// ── LAYOUT_ZONES ──────────────────────────────────

describe('LAYOUT_ZONES — Zone Data Integrity (used by AI services)', () => {
    const categories = ['ultra-wide', 'landscape', 'square', 'portrait', 'ultra-tall'] as const;

    it('all size categories have layout zones defined', () => {
        for (const cat of categories) {
            expect(LAYOUT_ZONES[cat]).toBeDefined();
        }
    });

    it('all zones have valid ranges (0-1)', () => {
        for (const cat of categories) {
            const zones = LAYOUT_ZONES[cat];
            for (const [role, zone] of Object.entries(zones)) {
                expect(zone.x).toBeGreaterThanOrEqual(0);
                expect(zone.y).toBeGreaterThanOrEqual(0);
                expect(zone.w).toBeGreaterThan(0);
                expect(zone.h).toBeGreaterThan(0);
                expect(zone.x + zone.w).toBeLessThanOrEqual(1.01);
                expect(zone.y + zone.h).toBeLessThanOrEqual(1.01);
            }
        }
    });

    it('all categories have background zone', () => {
        for (const cat of categories) {
            expect(LAYOUT_ZONES[cat].background).toBeDefined();
        }
    });
});

// ── Fixtures ──────────────────────────────────────

function makeShape(id: string, x: number, y: number, w: number, h: number, name?: string): ShapeElement {
    return {
        id,
        name: name ?? `Shape ${id}`,
        type: 'shape',
        shapeType: 'rectangle',
        fill: '#FF0000',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
        },
    } as ShapeElement;
}

function makeText(id: string, x: number, y: number, w: number, h: number, fontSize: number, opts?: { role?: LayoutRole; name?: string }): TextElement {
    return {
        id,
        name: opts?.name ?? `Text ${id}`,
        type: 'text',
        content: 'Hello',
        fontFamily: 'Inter',
        fontSize,
        fontWeight: 400,
        fontStyle: 'normal' as const,
        color: '#000000',
        textAlign: 'left' as const,
        lineHeight: 1.2,
        letterSpacing: 0,
        autoShrink: false,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 1,
        role: opts?.role,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
        },
    } as TextElement;
}

// ── smartSizeElements — Basic / Backward Compat ──

describe('smartSizeElements — Basic Operations', () => {
    it('returns same number of elements', () => {
        const origin = [makeShape('a', 10, 10, 100, 80), makeText('b', 20, 50, 200, 30, 24)];
        const result = smartSizeElements(origin, 300, 250, 600, 500);
        expect(result).toHaveLength(2);
    });

    it('preserves element IDs and types', () => {
        const origin = [makeShape('a', 0, 0, 100, 80), makeText('b', 0, 0, 200, 30, 24)];
        const result = smartSizeElements(origin, 300, 250, 728, 90);
        expect(result[0]!.id).toBe('a');
        expect(result[0]!.type).toBe('shape');
        expect(result[1]!.id).toBe('b');
        expect(result[1]!.type).toBe('text');
    });

    it('same size → identical deep clone', () => {
        const origin = [makeShape('a', 50, 60, 100, 80)];
        const result = smartSizeElements(origin, 300, 250, 300, 250);
        const resolved = resolveConstraints(result[0]!.constraints, 300, 250);
        expect(resolved.x).toBe(50);
        expect(resolved.y).toBe(60);
        expect(resolved.width).toBe(100);
        expect(resolved.height).toBe(80);
        // Must be a deep clone, not same reference
        expect(result[0]).not.toBe(origin[0]);
    });

    it('generates valid constraints for all output elements', () => {
        const origin = [makeShape('a', 10, 20, 50, 60)];
        const result = smartSizeElements(origin, 300, 250, 160, 600);
        for (const el of result) {
            expect(el.constraints).toBeDefined();
            expect(el.constraints.horizontal).toBeDefined();
            expect(el.constraints.vertical).toBeDefined();
            expect(el.constraints.size).toBeDefined();
        }
    });

    it('minimum element size is 4px (decoration fallback)', () => {
        // Uses a name that won't match any role → decoration → proportional fallback
        const origin = [makeShape('tiny', 0, 0, 1, 1, 'deco_tiny')];
        const result = smartSizeElements(origin, 300, 250, 30, 25);
        const resolved = resolveConstraints(result[0]!.constraints, 30, 25);
        expect(resolved.width).toBeGreaterThanOrEqual(4);
        expect(resolved.height).toBeGreaterThanOrEqual(4);
    });
});

// ── smartSizeElements — Role-Aware Smart Layout ──

describe('smartSizeElements — Role-Aware Smart Layout', () => {

    it('background fills 100% of target canvas regardless of aspect ratio', () => {
        // Background in 300x250 → should fill 728x90 completely
        const bg = makeShape('bg', 0, 0, 300, 250, 'Background');
        const result = smartSizeElements([bg], 300, 250, 728, 90);
        const resolved = resolveConstraints(result[0]!.constraints, 728, 90);
        // Background should use stretch width mode via smartLayout
        // The constraints should make it cover the full canvas
        expect(resolved.width).toBe(728);
        expect(resolved.height).toBe(90);
    });

    it('background fills 100% when going to portrait (160x600)', () => {
        const bg = makeShape('bg', 0, 0, 300, 250, 'Background');
        const result = smartSizeElements([bg], 300, 250, 160, 600);
        const resolved = resolveConstraints(result[0]!.constraints, 160, 600);
        expect(resolved.width).toBe(160);
        expect(resolved.height).toBe(600);
    });

    it('300x250 → 728x90: headline gets readable font size (not squished to 9px)', () => {
        const headline = makeText('h', 50, 50, 200, 40, 24, { role: 'headline', name: 'Headline' });
        const result = smartSizeElements([headline], 300, 250, 728, 90);
        const resultText = result[0] as TextElement;
        // Smart font size for headline in ultra-wide should be readable
        // getSmartFontSize('headline', 728, 90) → scaledFontSize(24, 728, 90)
        // minDim = min(728, 90) = 90 < 100 → 24 * 0.5 = 12, floor = max(8, 12) = 12
        expect(resultText.fontSize).toBeGreaterThanOrEqual(10);
        // Old proportional would give 24 * 0.36 = 9 — this should be better
        expect(resultText.fontSize).toBeGreaterThan(9);
    });

    it('300x250 → 160x600: CTA positioned in lower part (portrait rules)', () => {
        // CTA button element
        const cta = {
            id: 'cta',
            name: 'CTA Button',
            type: 'button' as const,
            label: 'Learn More',
            color: '#FFFFFF',
            backgroundColor: '#FF0000',
            borderRadius: 4,
            fontSize: 14,
            visible: true,
            locked: false,
            opacity: 1,
            zIndex: 15,
            role: 'cta' as LayoutRole,
            constraints: {
                horizontal: { anchor: 'left' as const, offset: 100 },
                vertical: { anchor: 'top' as const, offset: 200 },
                size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: 100, height: 36 },
            },
        };
        const result = smartSizeElements([cta as any], 300, 250, 160, 600);
        const resolved = resolveConstraints(result[0]!.constraints, 160, 600);
        // Portrait rule: CTA should be in the bottom third (y > 300 in 600px canvas)
        expect(resolved.y).toBeGreaterThan(300);
    });

    it('elements with explicit role="headline" use smart constraints', () => {
        const headline = makeText('h', 50, 50, 200, 40, 24, { role: 'headline', name: 'Headline' });
        const result = smartSizeElements([headline], 300, 250, 160, 600);
        const resolved = resolveConstraints(result[0]!.constraints, 160, 600);
        // Portrait headline should be center-area, not proportionally squished
        // Smart layout rule: center with vOffsetPct: -0.1
        expect(resolved.width).toBeGreaterThan(100); // Should use ~85% of 160 = 136
    });

    it('decoration elements (no role) still use proportional fallback', () => {
        // A small decoration shape with no role
        const deco = makeShape('d', 100, 100, 20, 20, 'deco_star');
        const result = smartSizeElements([deco], 300, 250, 600, 500);
        const resolved = resolveConstraints(result[0]!.constraints, 600, 500);
        // Proportional: center at (110/300 * 600, 110/250 * 500) = (220, 220)
        // Size: 20 * min(2, 2) = 40
        expect(resolved.width).toBe(40);
        expect(resolved.height).toBe(40);
    });

    it('subline text detected by name gets smart layout', () => {
        const sub = makeText('s', 50, 150, 200, 20, 14, { name: 'Description' });
        const result = smartSizeElements([sub], 300, 250, 728, 90);
        const resultText = result[0] as TextElement;
        // Name 'Description' matches /desc/ → detected as 'subtext' → mapped to 'subline'
        // Should use getSmartFontSize('subline', 728, 90) instead of 14 * 0.36 = 5
        expect(resultText.fontSize).toBeGreaterThanOrEqual(8);
    });

    it('★ REGRESSION: same-size produces identical clone (no smart layout interference)', () => {
        const headline = makeText('h', 50, 50, 200, 40, 24, { role: 'headline', name: 'Headline' });
        const result = smartSizeElements([headline], 300, 250, 300, 250);
        const resultText = result[0] as TextElement;
        // Same size → deep clone, fontSize should be unchanged
        expect(resultText.fontSize).toBe(24);
        expect(result[0]).not.toBe(headline);
    });
});
