// ─────────────────────────────────────────────────
// sizingTools.test.ts — Smart sizing tool tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { getVariantList, addVariant, removeVariant, getAvailablePresets, sizingTools } from './sizingTools';
import type { ToolContext } from './toolTypes';

const mockCS = {
    name: 'Test Campaign',
    masterVariantId: 'v-master',
    variants: [
        { id: 'v-master', preset: { id: 'p1', name: '300×250', width: 300, height: 250 }, elements: [{ id: 'e1' }, { id: 'e2' }] },
        { id: 'v-2', preset: { id: 'p2', name: '728×90', width: 728, height: 90 }, elements: [{ id: 'e3' }] },
    ],
};

function makeCtx(cs: unknown = mockCS): ToolContext {
    return {
        activeCreativeSetId: 'cs-1', activeVariantId: 'v-master',
        canvasW: 300, canvasH: 250, brandKit: null,
        designActions: {
            addElementToMaster: vi.fn(), updateMasterElement: vi.fn(),
            removeElementFromMaster: vi.fn(), addVariant: vi.fn(),
            removeVariant: vi.fn(), getCreativeSet: () => cs,
        },
        editorActions: { setSelectedElementId: vi.fn(), getSelectedElementId: () => null },
    };
}

describe('sizingTools', () => {
    // ── getVariantList ──
    describe('getVariantList', () => {
        it('should list all variants', () => {
            const result = getVariantList.execute({}, makeCtx());
            expect(result.success).toBe(true);
            const data = result.data as any;
            expect(data.variants).toHaveLength(2);
            expect(data.masterVariantId).toBe('v-master');
        });

        it('should mark master variant', () => {
            const data = getVariantList.execute({}, makeCtx()).data as any;
            const master = data.variants.find((v: any) => v.isMaster);
            expect(master).toBeDefined();
            expect(master.width).toBe(300);
        });

        it('should include element counts', () => {
            const data = getVariantList.execute({}, makeCtx()).data as any;
            expect(data.variants[0].elementCount).toBe(2);
            expect(data.variants[1].elementCount).toBe(1);
        });

        it('should fail when no creative set', () => {
            expect(getVariantList.execute({}, makeCtx(null)).success).toBe(false);
        });
    });

    // ── addVariant ──
    describe('addVariant', () => {
        it('should fail for unknown preset ID', () => {
            const result = addVariant.execute({ presetId: 'nonexistent' }, makeCtx());
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });

        it('should list available presets on failure', () => {
            const result = addVariant.execute({ presetId: 'bad' }, makeCtx());
            expect(result.message).toContain('Available');
        });
    });

    // ── removeVariant ──
    describe('removeVariant', () => {
        it('should prevent removing master variant', () => {
            const result = removeVariant.execute({ variantId: 'v-master' }, makeCtx());
            expect(result.success).toBe(false);
            expect(result.message).toContain('master');
        });

        it('should remove non-master variant', () => {
            const ctx = makeCtx();
            const result = removeVariant.execute({ variantId: 'v-2' }, ctx);
            expect(result.success).toBe(true);
            expect(ctx.designActions.removeVariant).toHaveBeenCalledWith('v-2');
        });

        it('should fail when no creative set', () => {
            expect(removeVariant.execute({ variantId: 'v-2' }, makeCtx(null)).success).toBe(false);
        });
    });

    // ── getAvailablePresets ──
    describe('getAvailablePresets', () => {
        it('should return all presets', () => {
            const result = getAvailablePresets.execute({}, makeCtx());
            expect(result.success).toBe(true);
            const data = result.data as any;
            expect(data.presets.length).toBeGreaterThan(0);
        });

        it('should include preset dimensions', () => {
            const data = getAvailablePresets.execute({}, makeCtx()).data as any;
            for (const p of data.presets) {
                expect(p.width).toBeGreaterThan(0);
                expect(p.height).toBeGreaterThan(0);
                expect(p.name).toBeTruthy();
            }
        });
    });

    // ── Array validation ──
    describe('sizingTools array', () => {
        it('should export 4 tools', () => {
            expect(sizingTools).toHaveLength(4);
        });

        it('should all be sizing category', () => {
            for (const tool of sizingTools) expect(tool.category).toBe('sizing');
        });
    });
});
