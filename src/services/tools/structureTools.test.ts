// ─────────────────────────────────────────────────
// structureTools.test.ts — Structure operation tool tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { deleteNode, renameNode, setRole, setLocked, structureTools } from './structureTools';
import type { ToolContext } from './toolTypes';

function makeCtx(overrides?: Partial<ToolContext>): ToolContext {
    return {
        activeCreativeSetId: 'cs-1',
        activeVariantId: 'v-1',
        canvasW: 300,
        canvasH: 250,
        brandKit: null,
        designActions: {
            addElementToMaster: vi.fn(),
            updateMasterElement: vi.fn(),
            removeElementFromMaster: vi.fn(),
            addVariant: vi.fn(),
            removeVariant: vi.fn(),
            getCreativeSet: () => null,
        },
        editorActions: {
            setSelectedElementId: vi.fn(),
            getSelectedElementId: () => null,
        },
        ...overrides,
    };
}

describe('structureTools', () => {
    describe('deleteNode', () => {
        it('should call removeElementFromMaster', () => {
            const ctx = makeCtx();
            const result = deleteNode.execute({ id: 'el-1' }, ctx);
            expect(ctx.designActions.removeElementFromMaster).toHaveBeenCalledWith('el-1');
            expect(result).toEqual(expect.objectContaining({ success: true }));
        });

        it('should include element id in message', () => {
            const ctx = makeCtx();
            const result = deleteNode.execute({ id: 'el-abc' }, ctx);
            expect(result.message).toContain('el-abc');
        });

        it('should have sideEffects array', () => {
            const ctx = makeCtx();
            const result = deleteNode.execute({ id: 'el-1' }, ctx);
            expect(result.sideEffects).toBeDefined();
            expect(result.sideEffects!.length).toBeGreaterThan(0);
        });
    });

    describe('renameNode', () => {
        it('should call updateMasterElement with new name', () => {
            const ctx = makeCtx();
            const result = renameNode.execute({ id: 'el-1', name: 'New Title' }, ctx);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', { name: 'New Title' });
            expect(result.success).toBe(true);
        });
    });

    describe('setRole', () => {
        it('should set element role', () => {
            const ctx = makeCtx();
            const result = setRole.execute({ id: 'el-1', role: 'headline' }, ctx);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', { role: 'headline' });
            expect(result.success).toBe(true);
            expect(result.message).toContain('headline');
        });

        it('should have valid role enum in schema', () => {
            const roles = (setRole.inputSchema.properties as any).role.enum;
            expect(roles).toContain('headline');
            expect(roles).toContain('cta');
            expect(roles).toContain('background');
            expect(roles).toContain('logo');
        });
    });

    describe('setLocked', () => {
        it('should lock an element', () => {
            const ctx = makeCtx();
            const result = setLocked.execute({ id: 'el-1', locked: true }, ctx);
            expect(ctx.designActions.updateMasterElement).toHaveBeenCalledWith('el-1', { locked: true });
            expect(result.message).toContain('Locked');
        });

        it('should unlock an element', () => {
            const ctx = makeCtx();
            const result = setLocked.execute({ id: 'el-1', locked: false }, ctx);
            expect(result.message).toContain('Unlocked');
        });
    });

    describe('structureTools array', () => {
        it('should export all 4 tools', () => {
            expect(structureTools).toHaveLength(4);
        });

        it('should have unique names', () => {
            const names = structureTools.map(t => t.name);
            expect(new Set(names).size).toBe(names.length);
        });

        it('should all be structure category', () => {
            for (const tool of structureTools) {
                expect(tool.category).toBe('structure');
            }
        });
    });
});
