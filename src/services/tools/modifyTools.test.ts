// ─────────────────────────────────────────────────
// modifyTools.test.ts — Element modification tool tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { setFill, setFont, setText, moveNode, resizeNode, setOpacity, setVisible, setZIndex, modifyTools } from './modifyTools';
import type { ToolContext } from './toolTypes';

function makeCtx(): ToolContext {
    return {
        activeCreativeSetId: 'cs-1', activeVariantId: 'v-1',
        canvasW: 300, canvasH: 250, brandKit: null,
        designActions: {
            addElementToMaster: vi.fn(),
            updateMasterElement: vi.fn(),
            removeElementFromMaster: vi.fn(),
            addVariant: vi.fn(), removeVariant: vi.fn(),
            getCreativeSet: () => null,
        },
        editorActions: { setSelectedElementId: vi.fn(), getSelectedElementId: () => null },
    };
}

describe('modifyTools', () => {
    describe('setFill', () => {
        it('should update fill color', () => {
            const ctx = makeCtx();
            const result = setFill.execute({ id: 'el-1', color: '#ff0000' }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', { fill: '#ff0000' });
        });
    });

    describe('setFont', () => {
        it('should update only provided font props', () => {
            const ctx = makeCtx();
            setFont.execute({ id: 'el-1', fontSize: 32, fontWeight: 700 }, ctx);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', { fontSize: 32, fontWeight: 700 });
        });

        it('should not include undefined props', () => {
            const ctx = makeCtx();
            setFont.execute({ id: 'el-1', fontFamily: 'Roboto' }, ctx);
            const patch = (ctx.designActions.updateMasterElement as any).mock.calls[0][1];
            expect(patch.fontFamily).toBe('Roboto');
            expect(patch.fontSize).toBeUndefined();
        });
    });

    describe('setText', () => {
        it('should update text content', () => {
            const ctx = makeCtx();
            const result = setText.execute({ id: 'el-1', content: 'New Text' }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', { content: 'New Text' });
        });
    });

    describe('moveNode', () => {
        it('should update position constraints', () => {
            const ctx = makeCtx();
            const result = moveNode.execute({ id: 'el-1', x: 50, y: 100 }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', {
                constraints: {
                    horizontal: { anchor: 'left', offset: 50 },
                    vertical: { anchor: 'top', offset: 100 },
                },
            });
        });
    });

    describe('resizeNode', () => {
        it('should update size constraints', () => {
            const ctx = makeCtx();
            const result = resizeNode.execute({ id: 'el-1', w: 200, h: 150 }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', {
                constraints: {
                    size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 150 },
                },
            });
        });
    });

    describe('setOpacity', () => {
        it('should update opacity', () => {
            const ctx = makeCtx();
            const result = setOpacity.execute({ id: 'el-1', opacity: 0.5 }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', { opacity: 0.5 });
        });
    });

    describe('setVisible', () => {
        it('should show element', () => {
            const ctx = makeCtx();
            const result = setVisible.execute({ id: 'el-1', visible: true }, ctx);
            expect(result.success).toBe(true);
            expect(result.message).toContain('true');
        });

        it('should hide element', () => {
            const ctx = makeCtx();
            const result = setVisible.execute({ id: 'el-1', visible: false }, ctx);
            expect(result.message).toContain('false');
        });
    });

    describe('setZIndex', () => {
        it('should update zIndex', () => {
            const ctx = makeCtx();
            const result = setZIndex.execute({ id: 'el-1', zIndex: 5 }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', { zIndex: 5 });
        });
    });

    describe('modifyTools array', () => {
        it('should export 8 tools', () => { expect(modifyTools).toHaveLength(8); });
        it('should all be modify category', () => {
            for (const t of modifyTools) expect(t.category).toBe('modify');
        });
        it('should have unique names', () => {
            const names = modifyTools.map(t => t.name);
            expect(new Set(names).size).toBe(names.length);
        });
    });
});
