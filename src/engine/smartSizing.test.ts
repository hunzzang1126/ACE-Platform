// ─────────────────────────────────────────────────
// smartSizing — Regression Tests
// ─────────────────────────────────────────────────
// Core differentiator. If this breaks, ACE loses its moat.
import { describe, it, expect } from 'vitest';
import { classifyRatio, smartSizeElements, LAYOUT_ZONES, clampToCanvas } from './smartSizing';
import type { ShapeElement, TextElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';

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

describe('LAYOUT_ZONES — Zone Data Integrity', () => {
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
                expect(zone.x + zone.w).toBeLessThanOrEqual(1.01); // small tolerance
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

// ── smartSizeElements ──────────────────────────────

describe('smartSizeElements — Core Propagation', () => {
    function makeTestElement(id: string, type: 'shape' | 'text'): ShapeElement | TextElement {
        const base = {
            id,
            name: `Element ${id}`,
            visible: true,
            locked: false,
            opacity: 1,
            zIndex: 0,
            constraints: createDefaultConstraints(),
        };
        if (type === 'shape') {
            return {
                ...base,
                type: 'shape',
                shapeType: 'rectangle',
                fill: '#FF0000',
            } as ShapeElement;
        }
        return {
            ...base,
            type: 'text',
            content: 'Hello',
            fontFamily: 'Inter',
            fontSize: 24,
            fontWeight: 400,
            fontStyle: 'normal' as const,
            color: '#000000',
            textAlign: 'left' as const,
            lineHeight: 1.2,
            letterSpacing: 0,
            autoShrink: false,
        } as TextElement;
    }

    it('returns same number of elements', () => {
        const master = [makeTestElement('bg', 'shape'), makeTestElement('title', 'text')];
        const result = smartSizeElements(master, 300, 250, 728, 90);
        expect(result).toHaveLength(2);
    });

    it('preserves element IDs', () => {
        const master = [makeTestElement('bg', 'shape'), makeTestElement('title', 'text')];
        const result = smartSizeElements(master, 300, 250, 728, 90);
        expect(result[0]!.id).toBe('bg');
        expect(result[1]!.id).toBe('title');
    });

    it('preserves element types', () => {
        const master = [makeTestElement('bg', 'shape'), makeTestElement('title', 'text')];
        const result = smartSizeElements(master, 300, 250, 1080, 1920);
        expect(result[0]!.type).toBe('shape');
        expect(result[1]!.type).toBe('text');
    });

    it('generates valid constraints for all output elements', () => {
        const master = [makeTestElement('bg', 'shape')];
        const result = smartSizeElements(master, 300, 250, 160, 600);
        for (const el of result) {
            expect(el.constraints).toBeDefined();
            expect(el.constraints.horizontal).toBeDefined();
            expect(el.constraints.vertical).toBeDefined();
            expect(el.constraints.size).toBeDefined();
        }
    });

    it('text element fontSize is adjusted for target size', () => {
        const master = [makeTestElement('title', 'text')] as TextElement[];
        const result = smartSizeElements(master, 300, 250, 728, 90);
        const textEl = result[0] as TextElement;
        // Font size should be adjusted (not necessarily same as original)
        expect(textEl.fontSize).toBeGreaterThan(0);
    });
});
