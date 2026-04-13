// ─────────────────────────────────────────────────
// ResizeHandles — Component structure tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ResizeHandles.tsx'), 'utf-8');

describe('ResizeHandles — Handle configuration', () => {
    it('exports ResizeHandles component', () => {
        expect(src).toContain('export function ResizeHandles');
    });

    it('exports DimensionTooltip component', () => {
        expect(src).toContain('export function DimensionTooltip');
    });

    it('exports RotationTooltip component', () => {
        expect(src).toContain('export function RotationTooltip');
    });

    it('exports HandleDir type', () => {
        expect(src).toContain("export type HandleDir");
    });

    it('defines all 4 corner handles (nw, ne, sw, se)', () => {
        expect(src).toContain("dir: 'nw'");
        expect(src).toContain("dir: 'ne'");
        expect(src).toContain("dir: 'sw'");
        expect(src).toContain("dir: 'se'");
    });

    it('defines all 4 edge handles (n, s, e, w)', () => {
        expect(src).toContain("dir: 'n'");
        expect(src).toContain("dir: 's'");
        expect(src).toContain("dir: 'e'");
        expect(src).toContain("dir: 'w'");
    });

    it('corner handles use square style', () => {
        expect(src).toContain('width: CORNER_SIZE');
        expect(src).toContain('height: CORNER_SIZE');
    });

    it('rotation zones are outside corners', () => {
        expect(src).toContain('ROTATION_SIZE');
        expect(src).toContain('top: -ROTATION_SIZE');
    });

    it('corners use Figma blue (#0D99FF)', () => {
        expect(src).toContain('#0D99FF');
        expect(src).toContain('#FFFFFF');
    });

    it('rotation is optional (conditional render)', () => {
        expect(src).toContain('onRotateStart &&');
    });
});

describe('ResizeHandles — Tooltip styling', () => {
    it('DimensionTooltip shows width x height', () => {
        expect(src).toContain('Math.round(w)');
        expect(src).toContain('Math.round(h)');
    });

    it('RotationTooltip shows angle with degree symbol', () => {
        expect(src).toContain('Math.round(angle)');
        expect(src).toContain('°');
    });

    it('tooltips use pointerEvents none', () => {
        expect(src).toContain("pointerEvents: 'none'");
    });

    it('tooltips use z-index 10000', () => {
        expect(src).toContain('zIndex: 10000');
    });
});
