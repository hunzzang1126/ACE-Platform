// ─────────────────────────────────────────────────
// projectExecutor.test.ts — Project executor tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock stores ──
const mockCSData = [
    { id: 'cs-1', name: 'Hero Banner', variants: [{ preset: { width: 300, height: 250 } }], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'cs-2', name: 'Holiday Sale', variants: [{ preset: { width: 728, height: 90 } }], createdAt: '2026-01-02', updatedAt: '2026-01-02' },
];

const mockDesignStore = {
    creativeSet: {
        id: 'cs-1', name: 'Hero Banner', masterVariantId: 'v-1',
        variants: [
            { id: 'v-1', preset: { id: 'p1', name: '300×250', width: 300, height: 250, category: 'banner' }, elements: [] },
            { id: 'v-2', preset: { id: 'p2', name: '728×90', width: 728, height: 90, category: 'banner' }, elements: [] },
        ],
    },
    getAllCreativeSets: () => mockCSData,
    createCreativeSet: vi.fn().mockReturnValue('new-cs-id'),
    deleteCreativeSet: vi.fn(),
    deleteAllCreativeSets: vi.fn(),
    renameCreativeSet: vi.fn(),
    addVariant: vi.fn(),
    removeVariant: vi.fn(),
};

vi.mock('@/stores/designStore', () => ({
    useDesignStore: {
        getState: () => mockDesignStore,
        setState: vi.fn(),
    },
}));

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: {
        getState: () => ({
            creativeSets: [{ id: 'cs-1', name: 'Hero Banner', variantCount: 1, createdBy: 'Young An', createdAt: '2026-01-01' }],
            selectedIds: new Set(),
            renameCreativeSet: vi.fn(),
        }),
        setState: vi.fn(),
    },
}));

vi.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { executeProjectTool, syncProjectStoreFromDesign } from './projectExecutor';

describe('projectExecutor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── syncProjectStoreFromDesign ──

    describe('syncProjectStoreFromDesign', () => {
        it('should sync without throwing', () => {
            expect(() => syncProjectStoreFromDesign()).not.toThrow();
        });
    });

    // ── list_creative_sets ──

    describe('list_creative_sets', () => {
        it('should list all creative sets', () => {
            const result = executeProjectTool('list_creative_sets', {});
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('Found');
            expect(result?.data).toBeDefined();
        });
    });

    // ── create_creative_set ──

    describe('create_creative_set', () => {
        it('should create a creative set', () => {
            const result = executeProjectTool('create_creative_set', {
                name: 'New Campaign',
                width: 300,
                height: 250,
            });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('New Campaign');
            expect(result?.message).toContain('300×250');
            expect(mockDesignStore.createCreativeSet).toHaveBeenCalled();
        });
    });

    // ── delete_creative_set ──

    describe('delete_creative_set', () => {
        it('should delete matching creative sets', () => {
            const result = executeProjectTool('delete_creative_set', {
                name_query: 'Hero',
            });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('Deleted');
        });

        it('should fail when no match found', () => {
            // Override getAllCreativeSets to return nothing matching
            const origFn = mockDesignStore.getAllCreativeSets;
            mockDesignStore.getAllCreativeSets = () => [];
            const result = executeProjectTool('delete_creative_set', {
                name_query: 'ZZZZZ_nonexistent',
            });
            expect(result?.success).toBe(false);
            mockDesignStore.getAllCreativeSets = origFn;
        });
    });

    // ── delete_all_creative_sets ──

    describe('delete_all_creative_sets', () => {
        it('should delete all and return count', () => {
            const result = executeProjectTool('delete_all_creative_sets', {});
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('Deleted all');
            expect(mockDesignStore.deleteAllCreativeSets).toHaveBeenCalled();
        });
    });

    // ── rename_creative_set ──

    describe('rename_creative_set', () => {
        it('should rename matching creative set', () => {
            const result = executeProjectTool('rename_creative_set', {
                name_query: 'Hero',
                new_name: 'Super Hero Banner',
            });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('Super Hero Banner');
        });

        it('should fail when no match found', () => {
            const origFn = mockDesignStore.getAllCreativeSets;
            mockDesignStore.getAllCreativeSets = () => [];
            const result = executeProjectTool('rename_creative_set', {
                name_query: 'ZZZZZ',
                new_name: 'New Name',
            });
            expect(result?.success).toBe(false);
            mockDesignStore.getAllCreativeSets = origFn;
        });
    });

    // ── add_size ──

    describe('add_size', () => {
        it('should add a variant', () => {
            const result = executeProjectTool('add_size', { width: 160, height: 600 });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('160×600');
            expect(mockDesignStore.addVariant).toHaveBeenCalled();
        });

        it('should use custom name when provided', () => {
            const result = executeProjectTool('add_size', { width: 320, height: 50, name: 'Mobile Banner' });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('Mobile Banner');
        });
    });

    // ── remove_size ──

    describe('remove_size', () => {
        it('should remove matching variant', () => {
            const result = executeProjectTool('remove_size', { width: 728, height: 90 });
            expect(result?.success).toBe(true);
            expect(mockDesignStore.removeVariant).toHaveBeenCalled();
        });

        it('should prevent removing master variant', () => {
            const result = executeProjectTool('remove_size', { width: 300, height: 250 });
            expect(result?.success).toBe(false);
            expect(result?.message).toContain('master');
        });

        it('should fail when size not found', () => {
            const result = executeProjectTool('remove_size', { width: 999, height: 999 });
            expect(result?.success).toBe(false);
        });
    });

    // ── navigate_to ──

    describe('navigate_to', () => {
        const mockNavigate = vi.fn();

        it('should fail without navigate fn', () => {
            const result = executeProjectTool('navigate_to', { page: 'dashboard' });
            expect(result?.success).toBe(false);
        });

        it('should navigate to editor', () => {
            const result = executeProjectTool('navigate_to', { page: 'editor' }, mockNavigate);
            expect(result?.success).toBe(true);
            expect(mockNavigate).toHaveBeenCalledWith('/editor');
        });

        it('should navigate to detail with first variant by default', () => {
            const result = executeProjectTool('navigate_to', { page: 'detail' }, mockNavigate);
            expect(result?.success).toBe(true);
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/editor/detail/'));
        });

        it('should fail on unknown page', () => {
            const result = executeProjectTool('navigate_to', { page: 'unknown' }, mockNavigate);
            expect(result?.success).toBe(false);
        });
    });

    // ── Unknown tool ──

    describe('unknown tool', () => {
        it('should return null', () => {
            expect(executeProjectTool('bogus_tool', {})).toBeNull();
        });
    });
});
