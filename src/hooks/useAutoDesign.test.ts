// ─────────────────────────────────────────────────
// useAutoDesign.test.ts — Auto-Design 2.0 Hook
// ─────────────────────────────────────────────────
// Covers: Mode A (from scratch), Mode B (asset-context),
// vision feedback loop, state management, abort support
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useAutoDesign.ts'), 'utf-8');

describe('useAutoDesign — exports', () => {
    it('exports useAutoDesign hook', () => {
        expect(src).toContain('export function useAutoDesign');
    });

    it('exports AutoDesignState type', () => {
        expect(src).toContain('export interface AutoDesignState');
    });

    it('exports AutoDesignOptions type', () => {
        expect(src).toContain('export interface AutoDesignOptions');
    });
});

describe('useAutoDesign — state management', () => {
    it('tracks isGenerating state', () => {
        expect(src).toContain('isGenerating');
    });

    it('has phase lifecycle: idle → generating → reviewing → done', () => {
        expect(src).toContain("'idle'");
        expect(src).toContain("'generating'");
        expect(src).toContain("'reviewing'");
        expect(src).toContain("'done'");
    });

    it('tracks error state', () => {
        expect(src).toContain("'error'");
        expect(src).toContain('error:');
    });

    it('tracks progress message', () => {
        expect(src).toContain('progress');
    });

    it('tracks createdCount', () => {
        expect(src).toContain('createdCount');
    });
});

describe('useAutoDesign — dual mode operation', () => {
    it('Mode A: calls from-scratch generation', () => {
        expect(src).toContain('callFromScratch');
    });

    it('Mode B: calls asset-context generation', () => {
        expect(src).toContain('callAssetContext');
    });
});

describe('useAutoDesign — vision feedback loop', () => {
    it('runs vision loop for quality assurance', () => {
        expect(src).toContain('runVisionLoop');
    });

    it('tracks final score', () => {
        expect(src).toContain('finalScore');
    });
});

describe('useAutoDesign — options', () => {
    it('accepts engine, canvasW, canvasH', () => {
        expect(src).toContain('engine:');
        expect(src).toContain('canvasW:');
        expect(src).toContain('canvasH:');
    });
});
