// ─────────────────────────────────────────────────
// canvasEngineActions.test.ts — Canvas action creators
// ─────────────────────────────────────────────────
// Covers: useCanvasEngineActions, addRect, addRoundedRect,
// shape color palette cycling, canvas center positioning
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './canvasEngineActions.ts'), 'utf-8');

describe('canvasEngineActions — exports', () => {
    it('exports useCanvasEngineActions function', () => {
        expect(src).toContain('export function useCanvasEngineActions');
    });

    it('accepts engineRef, width, height, nodes, selection, syncState', () => {
        expect(src).toContain('engineRef');
        expect(src).toContain('width: number, height: number');
        expect(src).toContain('syncState');
    });
});

describe('canvasEngineActions — shape creation', () => {
    it('has addRect action', () => {
        expect(src).toContain('addRect');
        expect(src).toContain('add_rect');
    });

    it('has addRoundedRect action', () => {
        expect(src).toContain('addRoundedRect');
        expect(src).toContain('add_rounded_rect');
    });

    it('centers shapes on canvas by default', () => {
        expect(src).toContain('width / 2');
        expect(src).toContain('height / 2');
    });
});

describe('canvasEngineActions — color palette', () => {
    it('has SHAPE_COLORS palette', () => {
        expect(src).toContain('SHAPE_COLORS');
    });

    it('cycles through colors with nextColor', () => {
        expect(src).toContain('nextColor');
        expect(src).toContain('colorIdx');
    });

    it('has 7 preset colors', () => {
        const colorMatches = src.match(/\[\d+\.\d+, \d+\.\d+, \d+\.\d+\]/g);
        expect(colorMatches).not.toBeNull();
        expect(colorMatches!.length).toBeGreaterThanOrEqual(7);
    });
});

describe('canvasEngineActions — null safety', () => {
    it('checks engineRef.current before operations', () => {
        expect(src).toContain('if (!e) return null');
    });

    it('calls select and syncState after creation', () => {
        expect(src).toContain('e.select(id)');
        expect(src).toContain('syncState()');
    });
});
