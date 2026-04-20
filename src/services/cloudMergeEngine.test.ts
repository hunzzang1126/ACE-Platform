// ─────────────────────────────────────────────────
// cloudMergeEngine.test.ts — Bidirectional merge tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mergeProjectLists } from './cloudMergeEngine';
import type { CloudProjectRow, MergeResult } from './cloudMergeEngine';
import type { CreativeSetSummary } from '@/schema/design.types';

// ── Factories ──

function makeLocal(overrides?: Partial<CreativeSetSummary>): CreativeSetSummary {
    return {
        id: 'proj-1',
        name: 'Local Project',
        variantCount: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
        createdBy: 'user-1',
        ...overrides,
    };
}

function makeCloud(overrides?: Partial<CloudProjectRow>): CloudProjectRow {
    return {
        id: 'proj-1',
        name: 'Cloud Project',
        folder_id: null,
        variant_count: 2,
        updated_at: '2024-06-01T00:00:00Z',
        deleted_at: null,
        ...overrides,
    };
}

// ══════════════════════════════════════════════════
// Core merge logic
// ══════════════════════════════════════════════════

describe('mergeProjectLists — core', () => {
    it('returns empty result for two empty lists', () => {
        const result = mergeProjectLists([], []);
        expect(result.merged).toEqual([]);
        expect(result.added).toBe(0);
        expect(result.updated).toBe(0);
        expect(result.conflicts).toEqual([]);
    });

    it('keeps all local items when cloud is empty', () => {
        const local = [makeLocal({ id: 'a' }), makeLocal({ id: 'b' })];
        const result = mergeProjectLists(local, []);
        expect(result.merged).toHaveLength(2);
        expect(result.added).toBe(0);
    });

    it('adds all cloud items when local is empty', () => {
        const cloud = [makeCloud({ id: 'c1' }), makeCloud({ id: 'c2' })];
        const result = mergeProjectLists([], cloud);
        expect(result.merged).toHaveLength(2);
        expect(result.added).toBe(2);
    });
});

// ══════════════════════════════════════════════════
// Conflict resolution (last-write-wins)
// ══════════════════════════════════════════════════

describe('mergeProjectLists — conflict resolution', () => {
    it('keeps local when local is newer', () => {
        const local = [makeLocal({ id: 'proj-1', name: 'Local Name', updatedAt: '2024-07-01T00:00:00Z' })];
        const cloud = [makeCloud({ id: 'proj-1', name: 'Cloud Name', updated_at: '2024-06-01T00:00:00Z' })];
        const result = mergeProjectLists(local, cloud);
        expect(result.merged[0]!.name).toBe('Local Name');
        expect(result.updated).toBe(0);
    });

    it('updates local when cloud is newer', () => {
        const local = [makeLocal({ id: 'proj-1', name: 'Old Name', updatedAt: '2024-06-01T00:00:00Z' })];
        const cloud = [makeCloud({ id: 'proj-1', name: 'New Name', updated_at: '2024-08-01T00:00:00Z' })];
        const result = mergeProjectLists(local, cloud);
        expect(result.merged[0]!.name).toBe('New Name');
        expect(result.updated).toBe(1);
    });

    it('keeps local when timestamps are equal', () => {
        const ts = '2024-06-15T12:00:00Z';
        const local = [makeLocal({ id: 'proj-1', name: 'Local', updatedAt: ts })];
        const cloud = [makeCloud({ id: 'proj-1', name: 'Cloud', updated_at: ts })];
        const result = mergeProjectLists(local, cloud);
        expect(result.merged[0]!.name).toBe('Local'); // tie → local wins
    });

    it('logs conflict message when cloud overwrites local', () => {
        const local = [makeLocal({ id: 'p1', updatedAt: '2024-01-01T00:00:00Z' })];
        const cloud = [makeCloud({ id: 'p1', name: 'Newer', updated_at: '2024-12-01T00:00:00Z' })];
        const result = mergeProjectLists(local, cloud);
        expect(result.conflicts.length).toBeGreaterThan(0);
        expect(result.conflicts[0]).toContain('Updated');
    });
});

// ══════════════════════════════════════════════════
// Deletion handling
// ══════════════════════════════════════════════════

describe('mergeProjectLists — deletion', () => {
    it('removes locally when cloud has deleted_at', () => {
        const local = [makeLocal({ id: 'del-1', name: 'To Delete' })];
        const cloud = [makeCloud({ id: 'del-1', deleted_at: '2024-07-01T00:00:00Z' })];
        const result = mergeProjectLists(local, cloud);
        expect(result.merged).toHaveLength(0);
        expect(result.deletedLocally).toBe(1);
    });

    it('does not add deleted cloud items as new', () => {
        const cloud = [makeCloud({ id: 'del-2', deleted_at: '2024-07-01T00:00:00Z' })];
        const result = mergeProjectLists([], cloud);
        expect(result.merged).toHaveLength(0);
        expect(result.added).toBe(0);
    });

    it('logs deletion conflict message', () => {
        const local = [makeLocal({ id: 'del-3', name: 'My Lost Project' })];
        const cloud = [makeCloud({ id: 'del-3', deleted_at: '2024-08-01T00:00:00Z' })];
        const result = mergeProjectLists(local, cloud);
        expect(result.conflicts).toContainEqual(expect.stringContaining('Deleted'));
    });
});

// ══════════════════════════════════════════════════
// Mixed scenarios
// ══════════════════════════════════════════════════

describe('mergeProjectLists — mixed scenarios', () => {
    it('handles a realistic multi-device scenario', () => {
        const local = [
            makeLocal({ id: 'shared', name: 'SharedProject', updatedAt: '2024-03-01T00:00:00Z' }),
            makeLocal({ id: 'local-only', name: 'OnlyLocal' }),
        ];
        const cloud = [
            makeCloud({ id: 'shared', name: 'SharedProject - Updated', updated_at: '2024-09-01T00:00:00Z' }),
            makeCloud({ id: 'cloud-only', name: 'OnlyCloud' }),
            makeCloud({ id: 'deleted-one', deleted_at: '2024-05-01T00:00:00Z' }),
        ];

        const result = mergeProjectLists(local, cloud);

        // shared → updated from cloud (newer)
        expect(result.merged.find(m => m.id === 'shared')?.name).toBe('SharedProject - Updated');
        // local-only → preserved
        expect(result.merged.find(m => m.id === 'local-only')).toBeDefined();
        // cloud-only → added
        expect(result.merged.find(m => m.id === 'cloud-only')).toBeDefined();
        // deleted-one → not in merged
        expect(result.merged.find(m => m.id === 'deleted-one')).toBeUndefined();

        expect(result.added).toBe(1);
        expect(result.updated).toBe(1);
    });

    it('preserves createdBy from local when cloud updates', () => {
        const local = [makeLocal({ id: 'p1', createdBy: 'original-user', updatedAt: '2024-01-01T00:00:00Z' })];
        const cloud = [makeCloud({ id: 'p1', updated_at: '2024-12-01T00:00:00Z' })];
        const result = mergeProjectLists(local, cloud);
        expect(result.merged[0]!.createdBy).toBe('original-user');
    });

    it('sets createdBy to "cloud" for new cloud-only items', () => {
        const cloud = [makeCloud({ id: 'new-cloud' })];
        const result = mergeProjectLists([], cloud);
        expect(result.merged[0]!.createdBy).toBe('cloud');
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION GUARDS
// ══════════════════════════════════════════════════

describe('★ REGRESSION: mergeProjectLists safety', () => {
    it('★ REGRESSION: never mutates the input local array', () => {
        const local = [makeLocal({ id: 'a' })];
        const originalLength = local.length;
        mergeProjectLists(local, [makeCloud({ id: 'b' })]);
        expect(local).toHaveLength(originalLength);
    });

    it('★ REGRESSION: never mutates the input cloud array', () => {
        const cloud = [makeCloud({ id: 'a' })];
        const originalLength = cloud.length;
        mergeProjectLists([makeLocal({ id: 'b' })], cloud);
        expect(cloud).toHaveLength(originalLength);
    });

    it('★ REGRESSION: handles undefined/null folder_id gracefully', () => {
        const cloud = [makeCloud({ id: 'p1', folder_id: null })];
        const result = mergeProjectLists([], cloud);
        expect(result.merged[0]!.folderId).toBeUndefined();
    });
});
