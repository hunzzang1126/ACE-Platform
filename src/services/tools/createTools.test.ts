// ─────────────────────────────────────────────────
// createTools.test.ts — Element creation tool tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { createShape, createText, createImage, createImageFromBrandKit, createButton, duplicateNode, createTools } from './createTools';
import type { ToolContext } from './toolTypes';

function makeCtx(overrides?: Partial<ToolContext>): ToolContext {
    return {
        activeCreativeSetId: 'cs-1', activeVariantId: 'v-1',
        canvasW: 300, canvasH: 250, brandKit: null,
        designActions: {
            addElementToMaster: vi.fn(),
            updateMasterElement: vi.fn(),
            removeElementFromMaster: vi.fn(),
            addVariant: vi.fn(), removeVariant: vi.fn(),
            getCreativeSet: () => ({
                variants: [{ id: 'v-1', elements: [
                    { id: 'el-1', name: 'BG', zIndex: 0, constraints: { horizontal: { anchor: 'left', offset: 10 }, vertical: { anchor: 'top', offset: 10 } } },
                    { id: 'el-2', name: 'Title', zIndex: 1, constraints: { horizontal: { anchor: 'left', offset: 20 }, vertical: { anchor: 'top', offset: 30 } } },
                ] }],
            }),
        },
        editorActions: { setSelectedElementId: vi.fn(), getSelectedElementId: () => null },
        ...overrides,
    };
}

describe('createTools', () => {
    describe('createShape', () => {
        it('should create a shape and return id', () => {
            const ctx = makeCtx();
            const result = createShape.execute({ shapeType: 'rectangle', x: 10, y: 20, w: 100, h: 50 }, ctx);
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('id');
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'shape', shapeType: 'rectangle' }),
            );
        });

        it('should default fill to #333333', () => {
            const ctx = makeCtx();
            createShape.execute({ shapeType: 'ellipse', x: 0, y: 0, w: 50, h: 50 }, ctx);
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ fill: '#333333' }),
            );
        });

        it('should use custom name', () => {
            const ctx = makeCtx();
            createShape.execute({ shapeType: 'rectangle', x: 0, y: 0, w: 50, h: 50, name: 'My Shape' }, ctx);
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'My Shape' }),
            );
        });

        it('should set z-index above existing elements', () => {
            const ctx = makeCtx();
            createShape.execute({ shapeType: 'rectangle', x: 0, y: 0, w: 50, h: 50 }, ctx);
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ zIndex: 2 }),
            );
        });
    });

    describe('createText', () => {
        it('should create text with content', () => {
            const ctx = makeCtx();
            const result = createText.execute({ content: 'Hello', x: 10, y: 20, w: 200 }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'text', content: 'Hello' }),
            );
        });

        it('should default to Inter font, 24px', () => {
            const ctx = makeCtx();
            createText.execute({ content: 'test', x: 0, y: 0, w: 100 }, ctx);
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ fontFamily: 'Inter', fontSize: 24 }),
            );
        });
    });

    describe('createImage', () => {
        it('should create image with src', () => {
            const ctx = makeCtx();
            const result = createImage.execute({ src: 'https://img.png', x: 0, y: 0, w: 100, h: 100 }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'image', src: 'https://img.png', fit: 'cover' }),
            );
        });
    });

    describe('createImageFromBrandKit', () => {
        it('should fail when no brand kit', () => {
            const result = createImageFromBrandKit.execute({ assetId: 'a1' }, makeCtx());
            expect(result.success).toBe(false);
            expect(result.message).toContain('brand kit');
        });

        it('should fail when asset not found', () => {
            const ctx = makeCtx({ brandKit: { assets: [], palette: {} as any, typography: {} as any, guidelines: {} as any } as any });
            const result = createImageFromBrandKit.execute({ assetId: 'missing' }, ctx);
            expect(result.success).toBe(false);
        });

        it('should place brand asset on canvas', () => {
            const ctx = makeCtx({
                brandKit: {
                    assets: [{ id: 'logo1', name: 'Logo', src: 'data:img', width: 80, height: 30, category: 'logo', role: 'primary_logo' }],
                    palette: {} as any, typography: {} as any, guidelines: {} as any,
                } as any,
            });
            const result = createImageFromBrandKit.execute({ assetId: 'logo1', x: 10, y: 5 }, ctx);
            expect(result.success).toBe(true);
            expect(result.message).toContain('Logo');
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalled();
        });

        it('should skip deleted assets', () => {
            const ctx = makeCtx({
                brandKit: {
                    assets: [{ id: 'a1', name: 'Old', src: 'x', width: 50, height: 50, deletedAt: '2026-01-01' }],
                    palette: {} as any, typography: {} as any, guidelines: {} as any,
                } as any,
            });
            const result = createImageFromBrandKit.execute({ assetId: 'a1' }, ctx);
            expect(result.success).toBe(false);
        });
    });

    describe('createButton', () => {
        it('should create button with label', () => {
            const ctx = makeCtx();
            const result = createButton.execute({ label: 'Click Me', x: 50, y: 200, w: 120, h: 40 }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'button', label: 'Click Me' }),
            );
        });

        it('should default to orange bg with white text', () => {
            const ctx = makeCtx();
            createButton.execute({ label: 'Go', x: 0, y: 0, w: 100, h: 40 }, ctx);
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ backgroundColor: '#ff6b35', color: '#ffffff' }),
            );
        });
    });

    describe('duplicateNode', () => {
        it('should duplicate existing element', () => {
            const ctx = makeCtx();
            const result = duplicateNode.execute({ id: 'el-1' }, ctx);
            expect(result.success).toBe(true);
            expect(result.message).toContain('BG');
            expect(ctx.designActions.addElementToMaster).toHaveBeenCalled();
        });

        it('should fail for non-existent element', () => {
            const result = duplicateNode.execute({ id: 'missing' }, makeCtx());
            expect(result.success).toBe(false);
        });

        it('should offset clone by 20px', () => {
            const ctx = makeCtx();
            duplicateNode.execute({ id: 'el-1' }, ctx);
            const addedEl = (ctx.designActions.addElementToMaster as any).mock.calls[0][0];
            expect(addedEl.constraints.horizontal.offset).toBe(30); // 10 + 20
            expect(addedEl.constraints.vertical.offset).toBe(30); // 10 + 20
        });

        it('should append "Copy" to name', () => {
            const ctx = makeCtx();
            duplicateNode.execute({ id: 'el-1' }, ctx);
            const addedEl = (ctx.designActions.addElementToMaster as any).mock.calls[0][0];
            expect(addedEl.name).toBe('BG Copy');
        });
    });

    describe('createTools array', () => {
        it('should export 6 tools', () => { expect(createTools).toHaveLength(6); });
        it('should all be create category', () => {
            for (const t of createTools) expect(t.category).toBe('create');
        });
    });
});
