// ─────────────────────────────────────────────────
// layoutFingerprint.test — Dedup engine tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
    generateFingerprint,
    calculateSimilarity,
    extractDescriptors,
    isDuplicate,
    DUPLICATE_THRESHOLD,
    NOVEL_THRESHOLD,
} from './layoutFingerprint';
import type { DesignElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';

// ── Helpers ──

function makeText(id: string, x: number, y: number, w: number, h: number, role?: string): DesignElement {
    const c = createDefaultConstraints();
    c.horizontal.offset = x; c.vertical.offset = y;
    c.size.width = w; c.size.height = h;
    return {
        id, name: id, type: 'text', constraints: c,
        opacity: 1, visible: true, locked: false, zIndex: 1,
        content: 'Test', fontFamily: 'Inter', fontSize: 24, fontWeight: 700,
        fontStyle: 'normal', color: '#fff', textAlign: 'left',
        lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
        role: role as any,
    };
}

function makeShape(id: string, x: number, y: number, w: number, h: number, fill: string, role?: string): DesignElement {
    const c = createDefaultConstraints();
    c.horizontal.offset = x; c.vertical.offset = y;
    c.size.width = w; c.size.height = h;
    return {
        id, name: id, type: 'shape', shapeType: 'rectangle', constraints: c,
        opacity: 1, visible: true, locked: false, zIndex: 0,
        fill, role: role as any,
    };
}

// ── Tests ──

describe('layoutFingerprint', () => {
    const canvasW = 300, canvasH = 250;

    it('identical layouts produce the same fingerprint', () => {
        const els1 = [
            makeShape('bg1', 0, 0, 300, 250, '#000', 'background'),
            makeText('h1', 20, 30, 260, 50, 'headline'),
        ];
        const els2 = [
            makeShape('bg2', 0, 0, 300, 250, '#fff', 'background'), // different color!
            makeText('h2', 20, 30, 260, 50, 'headline'),            // different ID!
        ];
        expect(generateFingerprint(els1, canvasW, canvasH))
            .toBe(generateFingerprint(els2, canvasW, canvasH));
    });

    it('same layout different colors → similarity 1.0', () => {
        const els1 = [
            makeShape('bg', 0, 0, 300, 250, '#000000', 'background'),
            makeText('h', 20, 30, 260, 50, 'headline'),
        ];
        const els2 = [
            makeShape('bg', 0, 0, 300, 250, '#ff0000', 'background'),
            makeText('h', 20, 30, 260, 50, 'headline'),
        ];
        const d1 = extractDescriptors(els1, canvasW, canvasH);
        const d2 = extractDescriptors(els2, canvasW, canvasH);
        expect(calculateSimilarity(d1, d2)).toBe(1.0);
    });

    it('completely different layouts → similarity < NOVEL_THRESHOLD', () => {
        const els1 = [
            makeText('h', 0, 0, 50, 20, 'headline'),
        ];
        const els2 = [
            makeShape('bg', 200, 200, 100, 50, '#000', 'background'),
            makeText('body', 100, 100, 200, 150, 'body'),
            makeText('cta', 250, 220, 50, 30, 'cta'),
        ];
        const d1 = extractDescriptors(els1, canvasW, canvasH);
        const d2 = extractDescriptors(els2, canvasW, canvasH);
        expect(calculateSimilarity(d1, d2)).toBeLessThan(NOVEL_THRESHOLD);
    });

    it('isDuplicate returns true for similar layouts', () => {
        const els = [
            makeShape('bg', 0, 0, 300, 250, '#000', 'background'),
            makeText('h', 20, 30, 260, 50, 'headline'),
        ];
        const existingDesc = [extractDescriptors(els, canvasW, canvasH)];
        // Same layout with different colors
        const newEls = [
            makeShape('bg', 0, 0, 300, 250, '#ff0000', 'background'),
            makeText('h', 20, 30, 260, 50, 'headline'),
        ];
        expect(isDuplicate(newEls, canvasW, canvasH, existingDesc)).toBe(true);
    });

    it('isDuplicate returns false for different layouts', () => {
        const els = [
            makeText('h', 20, 30, 260, 50, 'headline'),
        ];
        const existingDesc = [extractDescriptors(els, canvasW, canvasH)];
        const newEls = [
            makeShape('bg', 0, 0, 300, 250, '#000', 'background'),
            makeText('body', 100, 150, 100, 80, 'body'),
            makeText('cta', 200, 200, 80, 30, 'cta'),
        ];
        expect(isDuplicate(newEls, canvasW, canvasH, existingDesc)).toBe(false);
    });

    it('empty elements → similarity 1.0', () => {
        const d1 = extractDescriptors([], canvasW, canvasH);
        const d2 = extractDescriptors([], canvasW, canvasH);
        expect(calculateSimilarity(d1, d2)).toBe(1.0);
    });
});
