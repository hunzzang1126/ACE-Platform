// ─────────────────────────────────────────────────
// readTools.test.ts — Read/query tool tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { getPageTree, getNode, findNodes, getSelection, getCanvasBounds, readTools } from './readTools';
import type { ToolContext } from './toolTypes';

const mockElements = [
    { id: 'el-1', name: 'Headline', type: 'text', zIndex: 2, visible: true, locked: false, opacity: 1, role: 'headline', content: 'Hello World', fontFamily: 'Inter', fontSize: 32, fontWeight: '700', color: '#fff', textAlign: 'center' },
    { id: 'el-2', name: 'Background', type: 'shape', zIndex: 0, visible: true, locked: false, opacity: 1, role: 'background', shapeType: 'rect', fill: '#0a0e1a', borderRadius: 0 },
    { id: 'el-3', name: 'CTA', type: 'button', zIndex: 3, visible: true, locked: false, opacity: 1, role: 'cta', label: 'Buy Now', backgroundColor: '#ff6b35', borderRadius: 6 },
];

const mockCS = {
    masterVariantId: 'v-1',
    variants: [{ id: 'v-1', preset: { width: 300, height: 250 }, elements: mockElements, backgroundColor: '#0a0e1a' }],
};

function makeCtx(overrides?: Partial<ToolContext>): ToolContext {
    return {
        activeCreativeSetId: 'cs-1',
        activeVariantId: 'v-1',
        canvasW: 300, canvasH: 250,
        brandKit: null,
        designActions: {
            addElementToMaster: vi.fn(),
            updateMasterElement: vi.fn(),
            removeElementFromMaster: vi.fn(),
            addVariant: vi.fn(),
            removeVariant: vi.fn(),
            getCreativeSet: () => mockCS,
        },
        editorActions: { setSelectedElementId: vi.fn(), getSelectedElementId: () => null },
        ...overrides,
    };
}

describe('readTools', () => {
    // ── getPageTree ──
    describe('getPageTree', () => {
        it('should return all elements', () => {
            const result = getPageTree.execute({}, makeCtx());
            expect(result.success).toBe(true);
            const data = result.data as any;
            expect(data.elements).toHaveLength(3);
            expect(data.canvas.width).toBe(300);
        });

        it('should include text-specific props', () => {
            const data = getPageTree.execute({}, makeCtx()).data as any;
            const headline = data.elements.find((e: any) => e.name === 'Headline');
            expect(headline.content).toBe('Hello World');
            expect(headline.fontSize).toBe(32);
        });

        it('should include shape-specific props', () => {
            const data = getPageTree.execute({}, makeCtx()).data as any;
            const bg = data.elements.find((e: any) => e.name === 'Background');
            expect(bg.fill).toBe('#0a0e1a');
            expect(bg.shapeType).toBe('rect');
        });

        it('should fail when no active variant', () => {
            const ctx = makeCtx({ activeVariantId: null });
            expect(getPageTree.execute({}, ctx).success).toBe(false);
        });
    });

    // ── getNode ──
    describe('getNode', () => {
        it('should find element by ID', () => {
            const result = getNode.execute({ id: 'el-1' }, makeCtx());
            expect(result.success).toBe(true);
            expect((result.data as any).name).toBe('Headline');
        });

        it('should fail for unknown ID', () => {
            const result = getNode.execute({ id: 'missing' }, makeCtx());
            expect(result.success).toBe(false);
        });
    });

    // ── findNodes ──
    describe('findNodes', () => {
        it('should find by name (case-insensitive)', () => {
            const result = findNodes.execute({ name: 'head' }, makeCtx());
            expect(result.success).toBe(true);
            expect((result.data as any)).toHaveLength(1);
        });

        it('should find by type', () => {
            const result = findNodes.execute({ type: 'shape' }, makeCtx());
            expect((result.data as any)).toHaveLength(1);
        });

        it('should find by role', () => {
            const result = findNodes.execute({ role: 'cta' }, makeCtx());
            expect((result.data as any)).toHaveLength(1);
        });

        it('should return all elements when no filters', () => {
            const result = findNodes.execute({}, makeCtx());
            expect((result.data as any)).toHaveLength(3);
        });

        it('should return empty for no match', () => {
            const result = findNodes.execute({ name: 'zzzzz' }, makeCtx());
            expect((result.data as any)).toHaveLength(0);
        });
    });

    // ── getSelection ──
    describe('getSelection', () => {
        it('should return null when nothing selected', () => {
            const result = getSelection.execute({}, makeCtx());
            expect(result.success).toBe(true);
            expect(result.data).toBeNull();
        });

        it('should return selected element', () => {
            const ctx = makeCtx({
                editorActions: { setSelectedElementId: vi.fn(), getSelectedElementId: () => 'el-3' },
            });
            const result = getSelection.execute({}, ctx);
            expect(result.success).toBe(true);
            expect((result.data as any).name).toBe('CTA');
        });
    });

    // ── getCanvasBounds ──
    describe('getCanvasBounds', () => {
        it('should return canvas dimensions', () => {
            const result = getCanvasBounds.execute({}, makeCtx());
            expect(result.success).toBe(true);
            const data = result.data as any;
            expect(data.width).toBe(300);
            expect(data.height).toBe(250);
        });

        it('should calculate safe padding', () => {
            const data = getCanvasBounds.execute({}, makeCtx()).data as any;
            expect(data.safePadding).toBeGreaterThanOrEqual(10);
            expect(data.safeArea.x).toBe(data.safePadding);
        });

        it('should compute safe area correctly', () => {
            const data = getCanvasBounds.execute({}, makeCtx()).data as any;
            expect(data.safeArea.w).toBe(data.width - 2 * data.safePadding);
            expect(data.safeArea.h).toBe(data.height - 2 * data.safePadding);
        });
    });

    // ── readTools array ──
    describe('readTools array', () => {
        it('should export 5 tools', () => {
            expect(readTools).toHaveLength(5);
        });

        it('should all be read category', () => {
            for (const tool of readTools) expect(tool.category).toBe('read');
        });
    });
});
