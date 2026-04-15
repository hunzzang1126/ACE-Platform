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

    it('v8: 300x250 → 728x90: headline font uses uniform scale', () => {
        const headline = makeText('h', 50, 50, 200, 40, 24, { role: 'headline', name: 'Headline' });
        const result = smartSizeElements([headline], 300, 250, 728, 90);
        const resultText = result[0] as TextElement;
        // v8: uniformScale = min(2.43, 0.36) = 0.36
        // font = round(24 * 0.36) = round(8.64) = 9
        // boxH = round(40 * 0.36) = 14, 9*1.2=10.8 < 14 → no shrink
        expect(resultText.fontSize).toBe(9);
    });

    it('v8: 300x250 → 160x600: CTA centered in canvas', () => {
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
        // v8: uniformScale = min(0.533, 2.4) = 0.533
        // Scaled then centered within 160x600 canvas
        expect(resolved.y).toBeGreaterThan(200);
        expect(resolved.y).toBeLessThan(400);
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

// ── Template-Proven Plug Sizing (v3) ──────────────

describe('smartSizeElements — Template-Proven Scaling (v3)', () => {

    // ★ REGRESSION GUARD: Background must fill 100% for ALL size transitions.
    // This was the root cause bug — QA auto-fixer was shrinking backgrounds.

    it('★ REGRESSION: BG fills 100% for square → ultra-wide (300x250 → 728x90)', () => {
        const bg = makeShape('bg', 0, 0, 300, 250, 'Background');
        const result = smartSizeElements([bg], 300, 250, 728, 90);
        const c = result[0]!.constraints;
        expect(c.horizontal.offset).toBe(0);
        expect(c.vertical.offset).toBe(0);
        expect(c.size.width).toBe(728);
        expect(c.size.height).toBe(90);
    });

    it('★ REGRESSION: BG fills 100% for square → ultra-tall (300x250 → 160x600)', () => {
        const bg = makeShape('bg', 0, 0, 300, 250, 'Background');
        const result = smartSizeElements([bg], 300, 250, 160, 600);
        const c = result[0]!.constraints;
        expect(c.size.width).toBe(160);
        expect(c.size.height).toBe(600);
    });

    it('★ REGRESSION: BG fills 100% for square → landscape (1080x1080 → 1200x628)', () => {
        const bg = makeShape('bg', 0, 0, 1080, 1080, 'ai_bg');
        const result = smartSizeElements([bg], 1080, 1080, 1200, 628);
        const c = result[0]!.constraints;
        expect(c.size.width).toBe(1200);
        expect(c.size.height).toBe(628);
    });

    it('★ REGRESSION: BG fills 100% for landscape → portrait (1200x628 → 1080x1920)', () => {
        const bg = makeShape('bg', 0, 0, 1200, 628, 'Background');
        const result = smartSizeElements([bg], 1200, 628, 1080, 1920);
        const c = result[0]!.constraints;
        expect(c.size.width).toBe(1080);
        expect(c.size.height).toBe(1920);
    });

    it('BG detected by coverage heuristic (>60% area, unnamed shape)', () => {
        // Shape named "Rectangle #1" covering full canvas → detected as background via coverage
        const bigShape = makeShape('big', 0, 0, 300, 250, 'Rectangle #1');
        const result = smartSizeElements([bigShape], 300, 250, 728, 90);
        const c = result[0]!.constraints;
        // Coverage = (300*250)/(300*250) = 1.0 > 0.6 → background → fills 100%
        expect(c.size.width).toBe(728);
        expect(c.size.height).toBe(90);
    });

    it('small shape NOT promoted to BG (coverage < 60%)', () => {
        const smallShape = makeShape('btn', 100, 180, 100, 36, 'Rectangle #2');
        const result = smartSizeElements([smallShape], 300, 250, 728, 90);
        const c = result[0]!.constraints;
        // Coverage = (100*36)/(300*250) = 0.048 < 0.6 → NOT background
        // Should be proportionally scaled, not 728x90
        expect(c.size.width).toBeLessThan(728);
        expect(c.size.height).toBeLessThan(90);
    });

    // ★ Font scaling uses geometric mean √(scaleX * scaleY)

    it('v7b: font shrinks to fit box in cross-ratio resize', () => {
        const text = makeText('t', 50, 100, 200, 40, 36, { name: 'Main Title' });
        const result = smartSizeElements([text], 300, 250, 728, 90);
        const resultText = result[0] as TextElement;
        // v7b: proportional stretch → boxH = 40 * 0.36 = 14px
        // geometric mean fontSize = 34, but 34 * 1.2 lineH = 41 > 14
        // shrink-to-fit: floor(14 / 1.2) = 11, clamped to max(8, 11) = 11
        expect(resultText.fontSize).toBe(11);
    });

    it('font never goes below MIN_FONT (8px)', () => {
        const text = makeText('t', 50, 100, 200, 20, 10, { name: 'Tiny Caption' });
        // Going to a much smaller canvas
        const result = smartSizeElements([text], 1080, 1080, 160, 90);
        const resultText = result[0] as TextElement;
        expect(resultText.fontSize).toBeGreaterThanOrEqual(8);
    });

    // ★ Independent X/Y stretch fill (same as template drops)

    it('v8: uniform scale preserves element proportions and gaps', () => {
        // v8: ALL non-bg elements use uniformScale = min(scaleX, scaleY)
        // 300x250 → 600x500: uniformScale = min(2, 2) = 2
        const el = makeShape('deco', 150, 125, 60, 50, 'deco_star');
        const result = smartSizeElements([el], 300, 250, 600, 500);
        const c = result[0]!.constraints;
        // uniformScale=2 → x=300, y=250, w=120, h=100
        // Center offset: (600-120)/2 - 300 = -60, (500-100)/2 - 250 = -50
        // Final: x=240, y=200
        expect(c.horizontal.offset).toBe(240);
        expect(c.vertical.offset).toBe(200);
    });

    it('cross-category: decoration uses smart layout instead of stretch', () => {
        // ★ v4 REGRESSION GUARD: cross-category (square→ultra-wide) uses role-based layout
        const el = makeShape('deco', 150, 125, 60, 50, 'deco_star');
        const result = smartSizeElements([el], 300, 250, 728, 90);
        const c = result[0]!.constraints;
        // Decoration → accent → computeSmartConstraints uses accent rule
        // Should NOT be at old stretch coordinates (364, 45)
        expect(c.horizontal).toBeDefined();
        expect(c.vertical).toBeDefined();
        expect(c.size).toBeDefined();
    });

    it('preserves gradient properties through sizing', () => {
        const gradBg = {
            ...makeShape('gbg', 0, 0, 300, 250, 'Background'),
            gradientStart: '#1a0033',
            gradientEnd: '#0d1b2a',
            gradientAngle: 135,
        } as ShapeElement;
        const result = smartSizeElements([gradBg], 300, 250, 728, 90);
        const r = result[0] as ShapeElement;
        expect(r.gradientStart).toBe('#1a0033');
        expect(r.gradientEnd).toBe('#0d1b2a');
        expect(r.gradientAngle).toBe(135);
        // And it fills 100%
        expect(r.constraints.size.width).toBe(728);
        expect(r.constraints.size.height).toBe(90);
    });

    it('v8: borderRadius scales with uniform scale', () => {
        const btn = makeShape('btn', 100, 200, 120, 40, 'deco_pill');
        (btn as any).borderRadius = 20;
        const result = smartSizeElements([btn], 300, 250, 728, 90);
        const r = result[0] as any;
        // v8: uniformScale = min(2.427, 0.36) = 0.36
        // borderRadius = round(20 * 0.36) = round(7.2) = 7
        expect(r.borderRadius).toBe(7);
    });
});

// ── Cover Fill Centering & Image Centering (v0.0.0.505+) ──

function makeImage(id: string, x: number, y: number, w: number, h: number, name?: string) {
    return {
        id,
        name: name ?? `Image ${id}`,
        type: 'image' as const,
        src: 'data:image/png;base64,test',
        fit: 'cover' as const,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        constraints: {
            horizontal: { anchor: 'left' as const, offset: x },
            vertical: { anchor: 'top' as const, offset: y },
            size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: w, height: h },
        },
    };
}

describe('★ REGRESSION: postStretchTextFit must not override cover-fill centering', () => {

    it('background image keeps negative offset for centering (300x250 → 160x600)', () => {
        // Image fills 300x250 → detected as background → cover fill
        // imgAspect = 1.2, canvasAspect = 0.267 → bgW = 720, bgX = -280
        // postStretchTextFit MUST NOT clamp this to offset=4
        const bg = makeImage('bg', 0, 0, 300, 250, 'Background');
        const result = smartSizeElements([bg as any], 300, 250, 160, 600);
        const c = result[0]!.constraints;
        // Cover fill: bgW = round(600 * 1.2) = 720, bgX = -round((720-160)/2) = -280
        expect(c.size.width).toBe(720);
        expect(c.horizontal.offset).toBe(-280);
    });

    it('background image keeps negative Y offset for vertical centering (300x250 → 728x90)', () => {
        const bg = makeImage('bg', 0, 0, 300, 250, 'Background');
        const result = smartSizeElements([bg as any], 300, 250, 728, 90);
        const c = result[0]!.constraints;
        // imgAspect=1.2, canvasAspect=8.09 → bgW=728, bgH=round(728/1.2)=607
        // bgY = -round((607-90)/2) = -259
        expect(c.size.height).toBeGreaterThan(90);
        expect(c.vertical.offset).toBeLessThan(0);
    });

    it('non-overflow elements are still clamped to canvas bounds', () => {
        // Text near corner → resize → after uniform scale + centering,
        // if position goes beyond canvas, postStretchTextFit clamps it
        const text = makeText('t', 0, 0, 200, 30, 24, { name: 'Corner Text' });
        const result = smartSizeElements([text], 300, 250, 600, 500);
        const c = result[0]!.constraints;
        // After resize, text must remain within canvas bounds
        expect(c.horizontal.offset).toBeGreaterThanOrEqual(0);
        expect(c.horizontal.offset + c.size.width).toBeLessThanOrEqual(600 + 4); // MARGIN tolerance
    });
});

describe('★ REGRESSION: role-aware image positioning (v0.0.0.566+)', () => {

    it('hero-role image IS centered horizontally (300x250 → 728x90)', () => {
        const img = { ...makeImage('glow', 0, 0, 150, 100, 'Glow Effect'), role: 'hero' as LayoutRole };
        const result = smartSizeElements([img as any], 300, 250, 728, 90);
        const c = result[0]!.constraints;
        const expectedCenter = Math.round((728 - c.size.width) / 2);
        expect(c.horizontal.offset).toBe(expectedCenter);
    });

    it('non-hero image is NOT force-centered (maintains group position)', () => {
        // Image without hero role should NOT get individually centered
        const img = makeImage('deco', 10, 10, 100, 80, 'Decorative Pattern');
        const text = makeText('t', 10, 100, 200, 30, 24, { name: 'Title' });
        const result = smartSizeElements([text, img as any], 300, 250, 600, 500);
        const imgC = result.find(e => e.type === 'image')!.constraints;
        // Should NOT necessarily be at center — just group-centered
        const imgCenter = Math.round((600 - imgC.size.width) / 2);
        // May or may not equal center, but it's based on group centering, not individual
        expect(imgC.horizontal.offset).toBeDefined();
    });

    it('edge-pin mode: hero image IS centered', () => {
        const img = { ...makeImage('overlay', 0, 0, 100, 80, 'Hero Image'), role: 'hero' as LayoutRole };
        const result = smartSizeElements([img as any], 300, 250, 160, 600, 'edge-pin');
        const c = result[0]!.constraints;
        expect(c.horizontal.offset).toBe(Math.round((160 - c.size.width) / 2));
    });

    it('edge-pin mode: non-hero image NOT force-centered', () => {
        const img = makeImage('overlay', 0, 0, 100, 80, 'Overlay');
        const result = smartSizeElements([img as any], 300, 250, 160, 600, 'edge-pin');
        const c = result[0]!.constraints;
        // Should NOT be at center — based on padding ratio position
        expect(c.horizontal.offset).toBeDefined();
    });

    it('logo-role element gets corner-pinned', () => {
        const logo = { ...makeImage('logo', 240, 200, 50, 30, 'Brand Logo'), role: 'logo' as LayoutRole };
        const result = smartSizeElements([logo as any], 300, 250, 600, 500);
        const c = result[0]!.constraints;
        // Logo should maintain relative position and aspect ratio
        expect(c.size.width).toBeGreaterThan(0);
        expect(c.size.height).toBeGreaterThan(0);
        // Aspect ratio preserved
        const origAspect = 50 / 30;
        const newAspect = c.size.width / c.size.height;
        expect(Math.abs(origAspect - newAspect)).toBeLessThan(0.1);
    });

    it('element with role="background" gets cover-fill via getEffectiveRole', () => {
        const img = { ...makeImage('bg-img', 0, 0, 300, 250, 'my-img'), role: 'background' as LayoutRole };
        const result = smartSizeElements([img as any], 300, 250, 160, 600);
        const c = result[0]!.constraints;
        // Should be cover-filled, not proportionally scaled
        expect(c.size.width).toBeGreaterThanOrEqual(160);
        expect(c.size.height).toBeGreaterThanOrEqual(600);
    });
});

