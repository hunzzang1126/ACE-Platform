// ─────────────────────────────────────────────────
// smartSizing — Regression Tests
// ─────────────────────────────────────────────────
// Proportional scaling is the core of the plug system.
import { describe, it, expect } from 'vitest';
import { classifyRatio, smartSizeElements, LAYOUT_ZONES } from './smartSizing';
import type { ShapeElement, TextElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';
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

// ── smartSizeElements — Proportional Scaling ──────

describe('smartSizeElements — Proportional Scaling', () => {
    function makeShape(id: string, x: number, y: number, w: number, h: number): ShapeElement {
        return {
            id,
            name: `Shape ${id}`,
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

    function makeText(id: string, x: number, y: number, w: number, h: number, fontSize: number): TextElement {
        return {
            id,
            name: `Text ${id}`,
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
            constraints: {
                horizontal: { anchor: 'left', offset: x },
                vertical: { anchor: 'top', offset: y },
                size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
            },
        } as TextElement;
    }

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

    it('proportional position: element at 33% stays at 33%', () => {
        // Shape at (100, 50) in 300x250 = (33.3%, 20%)
        const origin = [makeShape('a', 100, 50, 60, 40)];
        const result = smartSizeElements(origin, 300, 250, 600, 500);
        const resolved = resolveConstraints(result[0]!.constraints, 600, 500);
        // Expected: (200, 100) in 600x500 = still (33.3%, 20%)
        expect(resolved.x).toBe(200);
        expect(resolved.y).toBe(100);
    });

    it('proportional size: element covering 33% width stays at 33%', () => {
        // Shape 100px wide in 300px canvas = 33.3% width
        const origin = [makeShape('a', 0, 0, 100, 50)];
        const result = smartSizeElements(origin, 300, 250, 900, 750);
        const resolved = resolveConstraints(result[0]!.constraints, 900, 750);
        // Expected: 300px wide in 900px canvas = still 33.3%
        expect(resolved.width).toBe(300);
        expect(resolved.height).toBe(150);
    });

    it('handles different aspect ratios (300x250 → 728x90)', () => {
        const origin = [makeShape('a', 150, 125, 60, 50)]; // center
        const result = smartSizeElements(origin, 300, 250, 728, 90);
        const resolved = resolveConstraints(result[0]!.constraints, 728, 90);
        // X: 150/300 * 728 = 364 (50% of width)
        expect(resolved.x).toBe(364);
        // Y: 125/250 * 90 = 45 (50% of height)
        expect(resolved.y).toBe(45);
    });

    it('font size scales proportionally with minimum floor', () => {
        const origin = [makeText('t', 10, 10, 200, 30, 24)];
        // Scale to 2x → font should be ~2x = 48
        const result2x = smartSizeElements(origin, 300, 250, 600, 500);
        expect((result2x[0] as TextElement).fontSize).toBe(48);
        // Scale to 0.25x → font should hit floor of 8
        const resultTiny = smartSizeElements(origin, 300, 250, 75, 62);
        expect((resultTiny[0] as TextElement).fontSize).toBe(8);
    });

    it('font size uses smaller scale factor to prevent overflow', () => {
        // 300x250 → 728x90: scaleX=2.43, scaleY=0.36 → use 0.36
        const origin = [makeText('t', 10, 10, 200, 30, 24)];
        const result = smartSizeElements(origin, 300, 250, 728, 90);
        // 24 * 0.36 = 8.64 → round to 9
        expect((result[0] as TextElement).fontSize).toBe(9);
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

    it('minimum element size is 4px', () => {
        // 1px element in 300px → scale to 30px (0.1x) → should be 4px floor
        const origin = [makeShape('tiny', 0, 0, 1, 1)];
        const result = smartSizeElements(origin, 300, 250, 30, 25);
        const resolved = resolveConstraints(result[0]!.constraints, 30, 25);
        expect(resolved.width).toBeGreaterThanOrEqual(4);
        expect(resolved.height).toBeGreaterThanOrEqual(4);
    });
});
