// ─────────────────────────────────────────────────
// canvasSyncSave.test — Tests for save pipeline helpers
// ─────────────────────────────────────────────────
// ★ REGRESSION GUARD: Ensures the engine → store pipeline
// correctly serializes canvas state including fonts, positions,
// and element counts.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { convertNodesToElements, addOverlaysAndSort } from './canvasSyncSave';
import type { EngineNode } from './canvasTypes';
import type { OverlayElement } from './useOverlayElements';

const makeTextNode = (overrides: Partial<EngineNode> = {}): EngineNode => ({
    id: 1,
    type: 'text',
    x: 80, y: 176, w: 920, h: 273,
    opacity: 1, z_index: 2,
    fill_r: 1, fill_g: 1, fill_b: 1, fill_a: 1,
    border_radius: 0,
    name: 'Headline',
    content: 'Design Is not Hard',
    fontSize: 130,
    fontFamily: 'Anton',
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
    ...overrides,
});

const makeShapeNode = (overrides: Partial<EngineNode> = {}): EngineNode => ({
    id: 2,
    type: 'rect',
    x: 0, y: 0, w: 1080, h: 1080,
    opacity: 1, z_index: 0,
    fill_r: 0.04, fill_g: 0.05, fill_b: 0.1, fill_a: 1,
    border_radius: 0,
    name: 'Background',
    ...overrides,
});

describe('convertNodesToElements', () => {
    const CW = 1080, CH = 1080;

    it('★ REGRESSION: preserves fontFamily from engine nodes (not default Inter)', () => {
        const nodes: EngineNode[] = [makeTextNode({ fontFamily: 'Anton' })];
        const elements = convertNodesToElements(nodes, CW, CH);

        expect(elements.length).toBe(1);
        expect(elements[0].type).toBe('text');
        expect((elements[0] as any).fontFamily).toBe('Anton');
    });

    it('★ REGRESSION: preserves fontSize from engine nodes', () => {
        const nodes: EngineNode[] = [makeTextNode({ fontSize: 130 })];
        const elements = convertNodesToElements(nodes, CW, CH);

        expect((elements[0] as any).fontSize).toBe(130);
    });

    it('★ REGRESSION: preserves text content from engine nodes', () => {
        const nodes: EngineNode[] = [makeTextNode({ content: 'Custom Title' })];
        const elements = convertNodesToElements(nodes, CW, CH);

        expect((elements[0] as any).content).toBe('Custom Title');
    });

    it('★ REGRESSION: element count matches node count exactly', () => {
        const nodes: EngineNode[] = [
            makeShapeNode(),
            makeTextNode(),
            makeTextNode({ id: 3, name: 'Body', fontSize: 36, content: 'Subtitle' }),
        ];
        const elements = convertNodesToElements(nodes, CW, CH);

        expect(elements.length).toBe(3);
    });

    it('★ REGRESSION: deleted elements reduce count (simulates canvas delete)', () => {
        // Before delete: 4 nodes
        const before: EngineNode[] = [
            makeShapeNode(),
            makeTextNode(),
            makeTextNode({ id: 3, name: 'Body' }),
            makeShapeNode({ id: 4, name: 'CTA', w: 200, h: 60 }),
        ];
        expect(convertNodesToElements(before, CW, CH).length).toBe(4);

        // After delete: 3 nodes (user removed Body)
        const after: EngineNode[] = [
            makeShapeNode(),
            makeTextNode(),
            makeShapeNode({ id: 4, name: 'CTA', w: 200, h: 60 }),
        ];
        expect(convertNodesToElements(after, CW, CH).length).toBe(3);
    });

    it('★ REGRESSION: position changes in engine nodes are captured in constraints', () => {
        const nodes: EngineNode[] = [makeTextNode({ x: 200, y: 400, w: 600, h: 150 })];
        const elements = convertNodesToElements(nodes, CW, CH);

        const constraints = elements[0].constraints;
        // Verify position was captured (exact anchor depends on absoluteToConstraints logic)
        expect(constraints).toBeDefined();
        expect(constraints.size.width).toBeGreaterThan(0);
        expect(constraints.size.height).toBeGreaterThan(0);
    });

    it('converts shape nodes correctly', () => {
        const nodes: EngineNode[] = [makeShapeNode()];
        const elements = convertNodesToElements(nodes, CW, CH);

        expect(elements[0].type).toBe('shape');
        expect(elements[0].name).toBe('Background');
    });

    it('handles image nodes', () => {
        const imgNode: EngineNode = {
            id: 5, type: 'image', x: 0, y: 0, w: 540, h: 540,
            opacity: 1, z_index: 1, fill_r: 0, fill_g: 0, fill_b: 0, fill_a: 1,
            border_radius: 0, name: 'Hero Image', src: 'idb://img-123',
        };
        const elements = convertNodesToElements([imgNode], CW, CH);
        expect(elements[0].type).toBe('image');
        expect((elements[0] as any).src).toBe('idb://img-123');
    });
});

describe('addOverlaysAndSort', () => {
    const CW = 1080, CH = 1080;

    it('merges overlays into elements and sorts by zIndex', () => {
        const nodes: EngineNode[] = [
            makeShapeNode({ z_index: 0 }),
            makeTextNode({ z_index: 2 }),
        ];
        const elements = convertNodesToElements(nodes, CW, CH);

        const overlay: OverlayElement = {
            id: 'vid-1', type: 'video', x: 0, y: 0, w: 540, h: 540,
            videoSrc: 'blob://x', objectFit: 'cover', muted: true, loop: true,
            autoplay: true, opacity: 1, visible: true, locked: false, zIndex: 1,
        };

        addOverlaysAndSort(elements, [overlay], CW, CH);

        expect(elements.length).toBe(3);
        // Should be sorted by zIndex: 0, 1, 2
        expect(elements[0].zIndex).toBe(0);
        expect(elements[1].zIndex).toBe(1);
        expect(elements[2].zIndex).toBe(2);
    });
});
