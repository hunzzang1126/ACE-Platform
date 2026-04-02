// ─────────────────────────────────────────────────
// exportTools.test.ts — Export operation tool tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { listExportableVariants, getExportSummary, exportTools } from './exportTools';
import type { ToolContext } from './toolTypes';

const mockCreativeSet = {
    name: 'Test Campaign',
    variants: [
        { id: 'v-1', preset: { name: '300×250', width: 300, height: 250 }, elements: [{ id: 'el-1' }, { id: 'el-2' }] },
        { id: 'v-2', preset: { name: '728×90', width: 728, height: 90 }, elements: [{ id: 'el-3' }] },
    ],
};

function makeCtx(cs: unknown = mockCreativeSet): ToolContext {
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
            getCreativeSet: () => cs,
        },
        editorActions: {
            setSelectedElementId: vi.fn(),
            getSelectedElementId: () => null,
        },
    };
}

describe('exportTools', () => {
    describe('listExportableVariants', () => {
        it('should list all variants with dimensions', () => {
            const result = listExportableVariants.execute({}, makeCtx());
            expect(result.success).toBe(true);
            expect(result.message).toContain('2 variants');
            expect(result.data).toBeDefined();
            const data = result.data as any;
            expect(data.variants).toHaveLength(2);
            expect(data.variants[0].width).toBe(300);
            expect(data.variants[1].width).toBe(728);
        });

        it('should include element counts', () => {
            const result = listExportableVariants.execute({}, makeCtx());
            const data = result.data as any;
            expect(data.variants[0].elementCount).toBe(2);
            expect(data.variants[1].elementCount).toBe(1);
        });

        it('should fail when no creative set', () => {
            const result = listExportableVariants.execute({}, makeCtx(null));
            expect(result.success).toBe(false);
        });

        it('should include creative set name', () => {
            const result = listExportableVariants.execute({}, makeCtx());
            const data = result.data as any;
            expect(data.creativeName).toBe('Test Campaign');
        });
    });

    describe('getExportSummary', () => {
        it('should return export plan for png', () => {
            const result = getExportSummary.execute({ format: 'png' }, makeCtx());
            expect(result.success).toBe(true);
            expect(result.message).toContain('PNG');
            expect(result.data).toBeDefined();
            const data = result.data as any;
            expect(data.format).toBe('png');
            expect(data.variantCount).toBe(2);
        });

        it('should default to png format', () => {
            const result = getExportSummary.execute({}, makeCtx());
            const data = result.data as any;
            expect(data.format).toBe('png');
        });

        it('should handle svg format', () => {
            const result = getExportSummary.execute({ format: 'svg' }, makeCtx());
            expect(result.message).toContain('SVG');
        });

        it('should handle html5 format', () => {
            const result = getExportSummary.execute({ format: 'html5' }, makeCtx());
            expect(result.message).toContain('HTML5');
        });

        it('should fail when no creative set', () => {
            const result = getExportSummary.execute({}, makeCtx(null));
            expect(result.success).toBe(false);
        });

        it('should include variant dimensions in data', () => {
            const result = getExportSummary.execute({}, makeCtx());
            const data = result.data as any;
            expect(data.variants.some((v: string) => v.includes('300'))).toBe(true);
        });
    });

    describe('exportTools array', () => {
        it('should export 2 tools', () => {
            expect(exportTools).toHaveLength(2);
        });

        it('should all be export category', () => {
            for (const tool of exportTools) {
                expect(tool.category).toBe('export');
            }
        });
    });
});
