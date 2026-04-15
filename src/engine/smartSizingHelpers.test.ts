// ─────────────────────────────────────────────────
// smartSizingHelpers.test.ts — Unit tests for role-aware helpers
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getEffectiveRole, buildCoverFill, buildLogoPinned } from './smartSizingHelpers';
import type { ShapeElement, ImageElement } from '@/schema/elements.types';
import type { LayoutRole } from '@/schema/layoutRoles';

function makeShape(id: string, x: number, y: number, w: number, h: number, name: string, role?: LayoutRole): ShapeElement {
    return {
        id, name, type: 'shape', shapeType: 'rectangle', fill: '#FF0000',
        visible: true, locked: false, opacity: 1, zIndex: 0, role,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
            rotation: 0,
        },
    } as ShapeElement;
}

function makeImage(id: string, x: number, y: number, w: number, h: number, name: string, role?: LayoutRole): ImageElement {
    return {
        id, name, type: 'image', src: 'data:test', fit: 'cover' as const,
        visible: true, locked: false, opacity: 1, zIndex: 0, role,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
            rotation: 0,
        },
    } as ImageElement;
}

// ── getEffectiveRole ──

describe('getEffectiveRole', () => {
    it('uses persisted role when available', () => {
        const el = makeShape('a', 0, 0, 100, 100, 'Some Shape', 'background');
        expect(getEffectiveRole(el, 300, 250)).toBe('background');
    });

    it('maps LayoutRole "hero" → ElementRole "image"', () => {
        const el = makeImage('h', 50, 50, 100, 80, 'My Image', 'hero');
        expect(getEffectiveRole(el, 300, 250)).toBe('image');
    });

    it('maps LayoutRole "cta" → ElementRole "cta"', () => {
        const el = makeShape('c', 100, 200, 120, 40, 'Button', 'cta');
        expect(getEffectiveRole(el, 300, 250)).toBe('cta');
    });

    it('falls back to heuristic when no role', () => {
        // Shape named "Background" → heuristic detects as 'background'
        const el = makeShape('bg', 0, 0, 300, 250, 'Background');
        expect(getEffectiveRole(el, 300, 250)).toBe('background');
    });

    it('falls back to heuristic for unknown role', () => {
        const el = makeShape('x', 50, 50, 30, 30, 'deco_star');
        expect(getEffectiveRole(el, 300, 250)).toBe('decoration');
    });
});

// ── buildCoverFill ──

describe('buildCoverFill', () => {
    it('shape fills target 100%', () => {
        const el = makeShape('bg', 0, 0, 300, 250, 'BG');
        const result = buildCoverFill(el, { x: 0, y: 0, w: 300, h: 250 }, 728, 90);
        expect(result.constraints.size.width).toBe(728);
        expect(result.constraints.size.height).toBe(90);
    });

    it('image wider than target gets negative X offset (centered crop)', () => {
        const el = makeImage('bg', 0, 0, 300, 250, 'BG Image');
        // 300x250 → 160x600: imgAspect=1.2, canvasAspect=0.267
        // bgW = round(600 * 1.2) = 720, bgX = -280
        const result = buildCoverFill(el, { x: 0, y: 0, w: 300, h: 250 }, 160, 600);
        expect(result.constraints.size.width).toBe(720);
        expect(result.constraints.horizontal.offset).toBe(-280);
    });

    it('image taller than target gets negative Y offset', () => {
        const el = makeImage('bg', 0, 0, 300, 250, 'BG Image');
        // 300x250 → 728x90: canvasAspect > imgAspect
        const result = buildCoverFill(el, { x: 0, y: 0, w: 300, h: 250 }, 728, 90);
        expect(result.constraints.size.height).toBeGreaterThan(90);
        expect(result.constraints.vertical.offset).toBeLessThan(0);
    });

    it('preserves rotation', () => {
        const el = makeShape('bg', 0, 0, 300, 250, 'BG');
        el.constraints.rotation = 45;
        const result = buildCoverFill(el, { x: 0, y: 0, w: 300, h: 250 }, 600, 500);
        expect(result.constraints.rotation).toBe(45);
    });
});

// ── buildLogoPinned ──

describe('buildLogoPinned', () => {
    it('preserves aspect ratio', () => {
        const el = makeImage('logo', 240, 210, 50, 25, 'Logo');
        const result = buildLogoPinned(el, { x: 240, y: 210, w: 50, h: 25 }, 300, 250, 600, 500, 2);
        const aspect = result.constraints.size.width / result.constraints.size.height;
        expect(Math.abs(aspect - 2.0)).toBeLessThan(0.1); // 50/25 = 2.0
    });

    it('scales with uniform scale', () => {
        const el = makeImage('logo', 240, 210, 50, 25, 'Logo');
        const result = buildLogoPinned(el, { x: 240, y: 210, w: 50, h: 25 }, 300, 250, 600, 500, 2);
        // newH = max(16, round(25 * 2)) = 50, newW = round(50 * 2) = 100
        expect(result.constraints.size.height).toBe(50);
        expect(result.constraints.size.width).toBe(100);
    });

    it('preserves relative position', () => {
        // Logo at bottom-right corner (240/300 = 80%, 210/250 = 84%)
        const el = makeImage('logo', 240, 210, 50, 25, 'Logo');
        const result = buildLogoPinned(el, { x: 240, y: 210, w: 50, h: 25 }, 300, 250, 600, 500, 2);
        // relX = 240/300 = 0.8, newX = round(0.8 * 600) = 480
        // clampedX = min(480, 600-100-4) = 480 → max(4, 480) = 480
        expect(result.constraints.horizontal.offset).toBe(480);
    });

    it('clamps to canvas bounds (no overflow)', () => {
        // Logo near edge → after scaling, should not exceed canvas
        const el = makeImage('logo', 290, 240, 30, 15, 'Logo');
        const result = buildLogoPinned(el, { x: 290, y: 240, w: 30, h: 15 }, 300, 250, 100, 50, 1.0);
        expect(result.constraints.horizontal.offset + result.constraints.size.width).toBeLessThanOrEqual(100);
        expect(result.constraints.vertical.offset + result.constraints.size.height).toBeLessThanOrEqual(50);
    });

    it('minimum padding of 4px from edges', () => {
        const el = makeImage('logo', 0, 0, 10, 10, 'Logo');
        const result = buildLogoPinned(el, { x: 0, y: 0, w: 10, h: 10 }, 300, 250, 600, 500, 1);
        expect(result.constraints.horizontal.offset).toBeGreaterThanOrEqual(4);
        expect(result.constraints.vertical.offset).toBeGreaterThanOrEqual(4);
    });
});
