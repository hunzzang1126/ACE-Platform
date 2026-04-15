// ─────────────────────────────────────────────────
// visionRoleClassifier.test.ts — Unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { heuristicFallback, applyRolesToElements } from './visionRoleClassifier';
import type { DesignElement, ShapeElement, TextElement, ImageElement } from '@/schema/elements.types';
import type { LayoutRole } from '@/schema/layoutRoles';

// ── Fixtures ──

function makeShape(id: string, x: number, y: number, w: number, h: number, name: string): ShapeElement {
    return {
        id, name, type: 'shape', shapeType: 'rectangle', fill: '#FF0000',
        visible: true, locked: false, opacity: 1, zIndex: 0,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
            rotation: 0,
        },
    } as ShapeElement;
}

function makeText(id: string, x: number, y: number, w: number, h: number, name: string, fontSize: number): TextElement {
    return {
        id, name, type: 'text', content: 'Hello', fontFamily: 'Inter',
        fontSize, fontWeight: 400, fontStyle: 'normal' as const, color: '#000',
        textAlign: 'left' as const, lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
        visible: true, locked: false, opacity: 1, zIndex: 1,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
            rotation: 0,
        },
    } as TextElement;
}

function makeImage(id: string, x: number, y: number, w: number, h: number, name: string): ImageElement {
    return {
        id, name, type: 'image', src: 'data:test', fit: 'cover' as const,
        visible: true, locked: false, opacity: 1, zIndex: 0,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
            rotation: 0,
        },
    } as ImageElement;
}

// ── heuristicFallback ──

describe('heuristicFallback — Name-based role detection', () => {
    it('detects background by name', () => {
        const el = makeShape('bg', 0, 0, 300, 250, 'Background');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('background');
    });

    it('detects logo by name', () => {
        const el = makeImage('l', 10, 10, 50, 30, 'Brand Logo');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('logo');
    });

    it('detects CTA by name', () => {
        const el = makeShape('c', 100, 200, 120, 40, 'CTA Button');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('cta');
    });

    it('detects headline by name', () => {
        const el = makeText('h', 50, 50, 200, 40, 'Headline', 24);
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('headline');
    });

    it('detects subline by name containing "body"', () => {
        const el = makeText('s', 50, 100, 200, 20, 'Body text', 14);
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('subline');
    });

    it('detects hero by name "hero"', () => {
        const el = makeImage('h', 50, 50, 100, 80, 'Hero Image');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('hero');
    });

    it('detects badge by name', () => {
        const el = makeShape('b', 0, 0, 60, 30, 'Sale Badge');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('badge');
    });

    it('detects TnC by name', () => {
        const el = makeText('t', 10, 240, 280, 10, 'Terms and Conditions', 8);
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('tnc');
    });
});

describe('heuristicFallback — Coverage-based detection', () => {
    it('large shape (>60% area) → background', () => {
        const el = makeShape('big', 0, 0, 290, 240, 'Rectangle #1');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('background');
    });

    it('small shape (<60% area) → accent', () => {
        const el = makeShape('btn', 100, 200, 100, 36, 'Rectangle #2');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('accent');
    });

    it('large image (>60% area) → background', () => {
        const el = makeImage('bg', 0, 0, 300, 250, 'Full Image');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('background');
    });

    it('small image (<60% area) → hero', () => {
        const el = makeImage('prod', 50, 50, 100, 80, 'Product Shot');
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('hero');
    });
});

describe('heuristicFallback — Text size detection', () => {
    it('large text (>=24px) → headline', () => {
        const el = makeText('h', 50, 50, 200, 40, 'Fancy Text', 28);
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('headline');
    });

    it('medium text (16-23px) → subline', () => {
        const el = makeText('s', 50, 100, 200, 20, 'Some Text', 18);
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('subline');
    });

    it('small text (<16px) without name match → detail', () => {
        const el = makeText('d', 50, 200, 200, 15, 'Some Info', 10);
        const result = heuristicFallback([el], 300, 250);
        expect(result[0]!.role).toBe('detail');
    });
});

describe('heuristicFallback — sizingHint mapping', () => {
    it('background → cover', () => {
        const result = heuristicFallback([makeShape('bg', 0, 0, 300, 250, 'Background')], 300, 250);
        expect(result[0]!.sizingHint).toBe('cover');
    });

    it('hero → contain', () => {
        const result = heuristicFallback([makeImage('h', 50, 50, 100, 80, 'Hero Image')], 300, 250);
        expect(result[0]!.sizingHint).toBe('contain');
    });

    it('logo → fixed', () => {
        const result = heuristicFallback([makeImage('l', 10, 10, 50, 30, 'Brand Logo')], 300, 250);
        expect(result[0]!.sizingHint).toBe('fixed');
    });

    it('all classifications have confidence 60 (heuristic default)', () => {
        const els = [
            makeShape('bg', 0, 0, 300, 250, 'Background'),
            makeText('h', 50, 50, 200, 40, 'Headline', 24),
        ];
        const result = heuristicFallback(els as DesignElement[], 300, 250);
        for (const r of result) expect(r.confidence).toBe(60);
    });
});

// ── applyRolesToElements ──

describe('applyRolesToElements', () => {
    it('applies roles to matching elements', () => {
        const elements: DesignElement[] = [
            makeShape('a', 0, 0, 300, 250, 'Shape A'),
            makeText('b', 50, 50, 200, 40, 'Text B', 24),
        ];
        const classifications = [
            { elementId: 'a', role: 'background' as LayoutRole, confidence: 95, sizingHint: 'cover' as const },
            { elementId: 'b', role: 'headline' as LayoutRole, confidence: 90, sizingHint: 'proportional' as const },
        ];
        const count = applyRolesToElements(elements, classifications);
        expect(count).toBe(2);
        expect(elements[0]!.role).toBe('background');
        expect(elements[1]!.role).toBe('headline');
    });

    it('returns 0 for non-matching IDs', () => {
        const elements: DesignElement[] = [makeShape('a', 0, 0, 100, 100, 'Shape')];
        const classifications = [
            { elementId: 'z', role: 'cta' as LayoutRole, confidence: 80, sizingHint: 'proportional' as const },
        ];
        const count = applyRolesToElements(elements, classifications);
        expect(count).toBe(0);
        expect(elements[0]!.role).toBeUndefined();
    });

    it('handles empty inputs', () => {
        expect(applyRolesToElements([], [])).toBe(0);
    });
});
