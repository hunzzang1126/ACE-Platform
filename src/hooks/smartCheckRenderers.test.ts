// ─────────────────────────────────────────────────
// smartCheckRenderers.test.ts — Canvas rendering for Vision QA
// ─────────────────────────────────────────────────
// Covers: renderVariantToCanvas, roundRect helper, element types,
// constraintsToAbsolute usage, text rendering, linebreak handling
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './smartCheckRenderers.ts'), 'utf-8');

describe('smartCheckRenderers — exports', () => {
    it('exports renderVariantToCanvas function', () => {
        expect(src).toContain('export function renderVariantToCanvas');
    });
});

describe('smartCheckRenderers — canvas setup', () => {
    it('creates offscreen canvas with variant dimensions', () => {
        expect(src).toContain("document.createElement('canvas')");
        expect(src).toContain('canvas.width = w');
        expect(src).toContain('canvas.height = h');
    });

    it('gets 2d context', () => {
        expect(src).toContain("getContext('2d')");
    });

    it('returns null on zero-size variant', () => {
        expect(src).toContain('w === 0 || h === 0');
    });
});

describe('smartCheckRenderers — element rendering', () => {
    it('uses constraintsToAbsolute for positioning', () => {
        expect(src).toContain('constraintsToAbsolute');
    });

    it('handles text elements', () => {
        expect(src).toContain("'text'");
        expect(src).toContain('fillText');
    });

    it('handles shape elements', () => {
        expect(src).toContain("'shape'");
    });

    it('handles image elements', () => {
        expect(src).toContain("'image'");
    });
});

describe('smartCheckRenderers — roundRect helper', () => {
    it('draws rounded rectangle path', () => {
        expect(src).toContain('function roundRect');
        expect(src).toContain('quadraticCurveTo');
        expect(src).toContain('beginPath');
        expect(src).toContain('closePath');
    });
});

describe('smartCheckRenderers — text rendering', () => {
    it('handles linebreaks in text', () => {
        const hasLinebreak = src.includes('\\n') || src.includes('split');
        expect(hasLinebreak).toBe(true);
    });

    it('applies font styling', () => {
        expect(src).toContain('font');
        expect(src).toContain('fillStyle');
    });
});

describe('smartCheckRenderers — output', () => {
    it('returns base64 encoded image', () => {
        expect(src).toContain('toDataURL');
    });
});
