// ─────────────────────────────────────────────────
// fabricCanvasEvents.test.ts — Transform badge regression tests
// ─────────────────────────────────────────────────
// Covers:
// - Figma-style rotation angle badge
// - Figma-style dimension badge during scaling
// - Line element handler
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './fabricCanvasEvents.ts'), 'utf-8');
const sidebarSrc = readFileSync(resolve(__dirname, '../components/editor/SidebarElementsTab.tsx'), 'utf-8');

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Transform badges (v421)
// ═════════════════════════════════════════════════

describe('★ REGRESSION: Figma-style transform badges', () => {

    it('tracks transformMode for rotating and scaling', () => {
        expect(src).toContain("let transformMode: 'none' | 'rotating' | 'scaling' = 'none'");
    });

    it('sets mode to rotating on object:rotating event', () => {
        expect(src).toContain("fc.on('object:rotating'");
        expect(src).toContain("transformMode = 'rotating'");
    });

    it('sets mode to scaling on object:scaling event', () => {
        expect(src).toContain("fc.on('object:scaling'");
        // Note: object:scaling is also used for text scaling logic
        expect(src).toContain("transformMode = 'scaling'");
    });

    it('resets mode on object:modified and mouse:up', () => {
        expect(src).toContain("transformMode = 'none'");
        // Should be reset in both events
        const noneOccurrences = src.match(/transformMode = 'none'/g);
        expect(noneOccurrences).not.toBeNull();
        expect(noneOccurrences!.length).toBeGreaterThanOrEqual(2); // modified + mouseup
    });

    it('draws on after:render event', () => {
        expect(src).toContain("fc.on('after:render'");
    });

    it('uses contextTop for drawing (Fabric v6 API)', () => {
        expect(src).toContain('contextTop');
        // Must NOT use getTopContext (which doesn't exist in Fabric v6)
        expect(src).not.toContain('getTopContext');
    });

    it('shows rotation angle with degree symbol', () => {
        // Unicode degree sign \u00B0
        expect(src).toContain('\\u00B0');
        expect(src).toContain('obj.angle');
    });

    it('shows dimensions with multiplication sign during scaling', () => {
        // Unicode multiplication sign \u00D7
        expect(src).toContain('\\u00D7');
        expect(src).toContain('obj.width');
        expect(src).toContain('obj.scaleX');
    });

    it('uses Figma-blue badge color (#0D99FF)', () => {
        expect(src).toContain("'#0D99FF'");
    });

    it('applies viewport transform for correct screen positioning', () => {
        expect(src).toContain('viewportTransform');
        expect(src).toContain('getBoundingRect');
    });

    it('skips artboard objects', () => {
        expect(src).toContain('isArtboard(obj)');
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Line element handler (v420)
// ═════════════════════════════════════════════════

describe('★ REGRESSION: Line element — SidebarElementsTab', () => {

    it('has a Line shape definition in SHAPES array', () => {
        expect(sidebarSrc).toContain("id: 'line'");
        expect(sidebarSrc).toContain("label: 'Line'");
    });

    it('handleAdd switch includes case line', () => {
        expect(sidebarSrc).toContain("case 'line'");
    });

    it('Line creates a thin rect (h=3) for save/load compatibility', () => {
        expect(sidebarSrc).toContain('setNodeSize(nodeId, w, 3)');
    });

    it('Line uses amber color matching icon', () => {
        // 0.96, 0.62, 0.04 ≈ #f59e0b
        expect(sidebarSrc).toContain('0.96, 0.62, 0.04');
    });

    it('Line is centered on canvas', () => {
        expect(sidebarSrc).toContain('cw * 0.6');
        expect(sidebarSrc).toContain('(cw - w) / 2');
        expect(sidebarSrc).toContain('ch / 2');
    });
});
