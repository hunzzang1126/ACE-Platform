// ─────────────────────────────────────────────────
// cloudSync.test.ts — Cloud sync: merge, folders, assets
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSB = {
    from: vi.fn(),
    storage: { from: vi.fn() },
};

const { mockGetSupabase, mockIsCloudEnabled } = vi.hoisted(() => ({
    mockGetSupabase: vi.fn(() => mockSB),
    mockIsCloudEnabled: vi.fn(() => true),
}));

vi.mock('./supabaseClient', () => ({
    getSupabase: mockGetSupabase,
    isCloudEnabled: mockIsCloudEnabled,
}));
vi.mock('./cloudSyncProjects', () => ({
    pushProject: vi.fn(),
    pushProjectDebounced: vi.fn(),
    pullProjects: vi.fn().mockResolvedValue([]),
    pullAllProjectsRaw: vi.fn(),
    trashProject: vi.fn(),
    restoreProject: vi.fn(),
    deleteProjectPermanently: vi.fn(),
    pushCreativeSet: vi.fn(),
    pushCreativeSetDebounced: vi.fn(),
    pullCreativeSet: vi.fn(),
    pullAllCreativeSets: vi.fn().mockResolvedValue({}),
    deleteCreativeSetCloud: vi.fn(),
}));

import { mergeByTimestamp, pushFolder, pullFolders, deleteFolderCloud, fullSync } from './cloudSync';

describe('mergeByTimestamp', () => {
    it('should keep newer item when both exist', () => {
        const local = [{ id: '1', updatedAt: '2024-01-01T00:00:00Z', name: 'old' }];
        const cloud = [{ id: '1', updatedAt: '2024-06-01T00:00:00Z', name: 'new' }];
        const merged = mergeByTimestamp(local, cloud);
        expect(merged).toHaveLength(1);
        expect(merged[0].name).toBe('new');
    });

    it('should keep local item when it is newer', () => {
        const local = [{ id: '1', updatedAt: '2024-12-01T00:00:00Z', name: 'local-new' }];
        const cloud = [{ id: '1', updatedAt: '2024-01-01T00:00:00Z', name: 'cloud-old' }];
        const merged = mergeByTimestamp(local, cloud);
        expect(merged[0].name).toBe('local-new');
    });

    it('should merge items from both sources', () => {
        const local = [{ id: '1', updatedAt: '2024-01-01T00:00:00Z', name: 'A' }];
        const cloud = [{ id: '2', updatedAt: '2024-01-01T00:00:00Z', name: 'B' }];
        const merged = mergeByTimestamp(local, cloud);
        expect(merged).toHaveLength(2);
    });

    it('should handle empty arrays', () => {
        expect(mergeByTimestamp([], [])).toEqual([]);
        expect(mergeByTimestamp([{ id: '1', updatedAt: '2024-01-01T00:00:00Z' }], [])).toHaveLength(1);
    });
});

describe('pushFolder', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should do nothing when no supabase', async () => {
        mockGetSupabase.mockReturnValueOnce(null);
        await pushFolder('u-1', { id: 'f-1', name: 'Folder', createdAt: '', updatedAt: '' });
        expect(mockSB.from).not.toHaveBeenCalled();
    });

    it('should upsert folder', async () => {
        const upsert = vi.fn().mockResolvedValue({ error: null });
        mockSB.from.mockReturnValue({ upsert });
        await pushFolder('u-1', { id: 'f-1', name: 'Test', createdAt: '', updatedAt: '' });
        expect(mockSB.from).toHaveBeenCalledWith('folders');
    });
});

describe('pullFolders', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return empty when no supabase', async () => {
        mockGetSupabase.mockReturnValueOnce(null);
        expect(await pullFolders('u-1')).toEqual([]);
    });

    it('should map DB rows to Folder objects', async () => {
        const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
                data: [{ id: 'f-1', user_id: 'u-1', name: 'My Folder', parent_id: null, created_at: '2024-01-01', updated_at: '2024-01-01' }],
                error: null,
            }),
        };
        mockSB.from.mockReturnValue(chain);
        const folders = await pullFolders('u-1');
        expect(folders).toHaveLength(1);
        expect(folders[0].name).toBe('My Folder');
    });
});

describe('fullSync', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return null when cloud not enabled', async () => {
        mockIsCloudEnabled.mockReturnValueOnce(false);
        expect(await fullSync('u-1')).toBeNull();
    });
});
