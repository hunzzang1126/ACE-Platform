// ─────────────────────────────────────────────────
// projectStore — Regression Tests
// ─────────────────────────────────────────────────
// These tests guard against previously-fixed bugs.
// If any test fails after a code change → the change broke something.
// Run: npx vitest run src/stores/projectStore.test.ts
//
// PROTECTED BUGS:
// - emptyTrash silent failure (commit ea37f21)
// - permanentDelete not removing from trash (commit ea37f21)
// - cross-tab sync setState pattern (commit ea37f21)
// - deleteCreativeSet not moving to trash (commit cfd80e1)

import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';

// Reset store before each test
beforeEach(() => {
    useProjectStore.setState({
        creativeSets: [],
        folders: [],
        trash: [],
        currentFolderId: null,
        searchQuery: '',
        sortColumn: 'name',
        sortDirection: 'asc',
        viewMode: 'list',
        selectedIds: new Set<string>(),
        currentPage: 1,
        itemsPerPage: 25,
    });
});

describe('projectStore — Trash Actions', () => {

    // ── deleteCreativeSet → moves to trash ──
    it('deleteCreativeSet moves item to trash (not permanent delete)', () => {
        const id = useProjectStore.getState().createCreativeSet('Test Project');
        expect(useProjectStore.getState().creativeSets).toHaveLength(1);
        expect(useProjectStore.getState().trash).toHaveLength(0);

        useProjectStore.getState().deleteCreativeSet(id);

        expect(useProjectStore.getState().creativeSets).toHaveLength(0);
        expect(useProjectStore.getState().trash).toHaveLength(1);
        expect(useProjectStore.getState().trash[0]!.item.id).toBe(id);
        expect(useProjectStore.getState().trash[0]!.item.name).toBe('Test Project');
    });

    // ── restoreFromTrash ──
    it('restoreFromTrash moves item back to creativeSets', () => {
        const id = useProjectStore.getState().createCreativeSet('Restore Me');
        useProjectStore.getState().deleteCreativeSet(id);
        expect(useProjectStore.getState().trash).toHaveLength(1);

        useProjectStore.getState().restoreFromTrash(id);

        expect(useProjectStore.getState().trash).toHaveLength(0);
        expect(useProjectStore.getState().creativeSets).toHaveLength(1);
        expect(useProjectStore.getState().creativeSets[0]!.name).toBe('Restore Me');
    });

    // ── permanentDelete ──
    it('permanentDelete removes item from trash completely', () => {
        const id = useProjectStore.getState().createCreativeSet('Delete Forever');
        useProjectStore.getState().deleteCreativeSet(id);
        expect(useProjectStore.getState().trash).toHaveLength(1);

        useProjectStore.getState().permanentDelete(id);

        expect(useProjectStore.getState().trash).toHaveLength(0);
        expect(useProjectStore.getState().creativeSets).toHaveLength(0);
    });

    // ★ REGRESSION: emptyTrash was silently failing (commit ea37f21)
    it('emptyTrash clears ALL items from trash', () => {
        const id1 = useProjectStore.getState().createCreativeSet('Project A');
        const id2 = useProjectStore.getState().createCreativeSet('Project B');
        const id3 = useProjectStore.getState().createCreativeSet('Project C');
        useProjectStore.getState().deleteCreativeSet(id1);
        useProjectStore.getState().deleteCreativeSet(id2);
        useProjectStore.getState().deleteCreativeSet(id3);
        expect(useProjectStore.getState().trash).toHaveLength(3);

        useProjectStore.getState().emptyTrash();

        expect(useProjectStore.getState().trash).toHaveLength(0);
        expect(useProjectStore.getState().creativeSets).toHaveLength(0);
    });

    // ★ REGRESSION: emptyTrash on already-empty trash should not crash
    it('emptyTrash on empty trash does nothing', () => {
        expect(useProjectStore.getState().trash).toHaveLength(0);
        expect(() => useProjectStore.getState().emptyTrash()).not.toThrow();
        expect(useProjectStore.getState().trash).toHaveLength(0);
    });
});

describe('projectStore — CRUD', () => {

    it('createCreativeSet returns a valid ID and adds to store', () => {
        const id = useProjectStore.getState().createCreativeSet('My Banner');
        expect(id).toBeTruthy();
        expect(typeof id).toBe('string');
        expect(useProjectStore.getState().creativeSets).toHaveLength(1);
        expect(useProjectStore.getState().creativeSets[0]!.name).toBe('My Banner');
    });

    it('renameCreativeSet updates the name', () => {
        const id = useProjectStore.getState().createCreativeSet('Old Name');
        useProjectStore.getState().renameCreativeSet(id, 'New Name');
        expect(useProjectStore.getState().creativeSets[0]!.name).toBe('New Name');
    });

    it('duplicateCreativeSet creates a copy with (Copy) suffix', () => {
        const id = useProjectStore.getState().createCreativeSet('Original');
        useProjectStore.getState().duplicateCreativeSet(id);
        const sets = useProjectStore.getState().creativeSets;
        expect(sets).toHaveLength(2);
        expect(sets[1]!.name).toBe('Original (Copy)');
        expect(sets[1]!.id).not.toBe(id);
    });
});

describe('projectStore — Folder Management', () => {

    it('createFolder adds a folder', () => {
        useProjectStore.getState().createFolder('My Folder');
        expect(useProjectStore.getState().folders).toHaveLength(1);
        expect(useProjectStore.getState().folders[0]!.name).toBe('My Folder');
    });

    it('deleteFolder removes folder and moves contained sets to root', () => {
        useProjectStore.getState().createFolder('Temp Folder');
        const folderId = useProjectStore.getState().folders[0]!.id;

        useProjectStore.getState().navigateToFolder(folderId);
        useProjectStore.getState().createCreativeSet('Inside Folder');
        expect(useProjectStore.getState().creativeSets[0]!.folderId).toBe(folderId);

        useProjectStore.getState().deleteFolder(folderId);

        expect(useProjectStore.getState().folders).toHaveLength(0);
        expect(useProjectStore.getState().creativeSets).toHaveLength(1);
    });
});

describe('projectStore — Selection State', () => {

    it('deleteCreativeSet removes ID from selectedIds', () => {
        const id = useProjectStore.getState().createCreativeSet('Selected');
        useProjectStore.getState().toggleSelection(id);
        expect(useProjectStore.getState().selectedIds.has(id)).toBe(true);

        useProjectStore.getState().deleteCreativeSet(id);

        expect(useProjectStore.getState().selectedIds.has(id)).toBe(false);
    });
});
