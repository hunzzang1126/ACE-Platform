// ─────────────────────────────────────────────────
// designHeuristics — Unit Tests
// ─────────────────────────────────────────────────
// Tests for post-gen design quality auto-correction.

import { describe, it, expect } from 'vitest';
import { runDesignHeuristics } from './designHeuristics';
import type { BannerVariant } from '@/schema/design.types';
import type { DesignElement, TextElement, ButtonElement, ShapeElement } from '@/schema/elements.types';

// ── Fixtures ──

function makeVariant(width: number, height: number, elements: DesignElement[]): BannerVariant {
    return {
        id: 'v1',
        preset: { id: 'p1', name: `${width}x${height}`, width, height, category: 'display' },
        elements,
        backgroundColor: '#FFFFFF',
        overriddenElementIds: [],
        syncLocked: false,
    };
}

function makeShape(id: string, x: number, y: number, w: number, h: number, fill: string, role?: string): ShapeElement {
    return {
        id,
        name: `Shape ${id}`,
        type: 'shape',
        shapeType: 'rectangle',
        fill,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        role,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
        },
    } as ShapeElement;
}

function makeText(id: string, x: number, y: number, w: number, h: number, content: string, fontSize: number): TextElement {
    return {
        id,
        name: `Text ${id}`,
        type: 'text',
        content,
        fontFamily: 'Inter',
        fontSize,
        fontWeight: 400,
        fontStyle: 'normal',
        color: '#000000',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        autoShrink: false,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 1,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
        },
    } as TextElement;
}

function makeCTA(id: string, x: number, y: number, w: number, h: number, textColor: string, bgColor: string): ButtonElement {
    return {
        id,
        name: `CTA ${id}`,
        type: 'button',
        label: 'Buy Now',
        color: textColor,
        backgroundColor: bgColor,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 700,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 15,
        role: 'cta',
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
        },
    } as ButtonElement;
}

// ── Safe Zone Tests ──

describe('designHeuristics — Safe Zone', () => {
    it('element too close to left edge → fix moves it to 8px', () => {
        const el = makeShape('a', 2, 50, 80, 40, '#FF0000');
        const v = makeVariant(300, 250, [el]);
        const fixes = runDesignHeuristics(v);
        const safeZone = fixes.filter(f => f.rule === 'safe-zone');
        expect(safeZone).toHaveLength(1);
        expect(safeZone[0]!.patch.constraints?.horizontal.offset).toBeGreaterThanOrEqual(8);
    });

    it('element too close to top edge → fix moves it to 8px', () => {
        const el = makeShape('a', 50, 2, 80, 40, '#FF0000');
        const v = makeVariant(300, 250, [el]);
        const fixes = runDesignHeuristics(v);
        const safeZone = fixes.filter(f => f.rule === 'safe-zone');
        expect(safeZone).toHaveLength(1);
        expect(safeZone[0]!.patch.constraints?.vertical.offset).toBeGreaterThanOrEqual(8);
    });

    it('element safely inside → no fix', () => {
        const el = makeShape('a', 20, 20, 80, 40, '#FF0000');
        const v = makeVariant(300, 250, [el]);
        const fixes = runDesignHeuristics(v);
        const safeZone = fixes.filter(f => f.rule === 'safe-zone');
        expect(safeZone).toHaveLength(0);
    });

    it('background role is exempt from safe zone', () => {
        const bg = makeShape('bg', 0, 0, 300, 250, '#000000', 'background');
        const v = makeVariant(300, 250, [bg]);
        const fixes = runDesignHeuristics(v);
        const safeZone = fixes.filter(f => f.rule === 'safe-zone');
        expect(safeZone).toHaveLength(0);
    });
});

// ── CTA Contrast Tests ──

describe('designHeuristics — CTA Contrast', () => {
    it('low text contrast CTA → fix changes text color', () => {
        // Dark text on dark button = bad contrast
        const cta = makeCTA('c', 100, 200, 120, 36, '#333333', '#444444');
        const bg = makeShape('bg', 0, 0, 300, 250, '#FFFFFF', 'background');
        const v = makeVariant(300, 250, [bg, cta]);
        const fixes = runDesignHeuristics(v);
        const ctaFixes = fixes.filter(f => f.rule === 'cta-contrast');
        expect(ctaFixes).toHaveLength(1);
    });

    it('high contrast CTA → no fix needed', () => {
        // White text on dark button = good contrast
        const cta = makeCTA('c', 100, 200, 120, 36, '#FFFFFF', '#1a1a1a');
        const bg = makeShape('bg', 0, 0, 300, 250, '#FFFFFF', 'background');
        const v = makeVariant(300, 250, [bg, cta]);
        const fixes = runDesignHeuristics(v);
        const ctaFixes = fixes.filter(f => f.rule === 'cta-contrast');
        expect(ctaFixes).toHaveLength(0);
    });
});

// ── Text Overflow Tests ──

describe('designHeuristics — Text Overflow', () => {
    it('long text in small container → font shrink fix', () => {
        // "This is a very long headline that definitely overflows the small box"
        const longText = 'This is a very long headline that definitely overflows';
        const text = makeText('t', 20, 80, 120, 30, longText, 24);
        const v = makeVariant(300, 250, [text]);
        const fixes = runDesignHeuristics(v);
        const overflow = fixes.filter(f => f.rule === 'text-overflow');
        expect(overflow).toHaveLength(1);
        expect(overflow[0]!.patch.fontSize).toBeLessThan(24);
        expect(overflow[0]!.patch.fontSize).toBeGreaterThanOrEqual(8);
    });

    it('short text in big container → no overflow fix', () => {
        const text = makeText('t', 20, 80, 260, 40, 'Hello', 24);
        const v = makeVariant(300, 250, [text]);
        const fixes = runDesignHeuristics(v);
        const overflow = fixes.filter(f => f.rule === 'text-overflow');
        expect(overflow).toHaveLength(0);
    });
});

// ── Integration: multiple fixes ──

describe('designHeuristics — Combined Checks', () => {
    it('returns multiple fix types for a problematic design', () => {
        const bg = makeShape('bg', 0, 0, 300, 250, '#000000', 'background');
        const edgeEl = makeShape('e', 2, 2, 50, 30, '#FF0000');
        const cta = makeCTA('c', 100, 200, 120, 36, '#333333', '#444444');
        const v = makeVariant(300, 250, [bg, edgeEl, cta]);
        const fixes = runDesignHeuristics(v);
        // Should have safe-zone fix for edgeEl and cta-contrast fix for cta
        expect(fixes.length).toBeGreaterThanOrEqual(2);
        const rules = new Set(fixes.map(f => f.rule));
        expect(rules.has('safe-zone')).toBe(true);
        expect(rules.has('cta-contrast')).toBe(true);
    });
});
