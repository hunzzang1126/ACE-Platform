// ─────────────────────────────────────────────────
// projectStoreExtended.test.ts — Uncovered actions
// ─────────────────────────────────────────────────
// Fills coverage gaps: UI state, sort, pagination, navigation

import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';

beforeEach(() => {
    useProjectStore.setState({
        creativeSets: [], folders: [], trash: [],
        currentFolderId: null, searchQuery: '', sortColumn: 'name',
        sortDirection: 'asc', viewMode: 'list', selectedIds: new Set(),
        currentPage: 1, itemsPerPage: 25,
    });
});

describe('projectStore — moveToFolder', () => {
    it('should move a creative set to a folder', () => {
        const csId = useProjectStore.getState().createCreativeSet('Banner');
        useProjectStore.getState().createFolder('Target');
        const folderId = useProjectStore.getState().folders[0].id;

        useProjectStore.getState().moveToFolder(csId, folderId);
        expect(useProjectStore.getState().creativeSets[0].folderId).toBe(folderId);
    });

    it('should move a creative set to root (null folder)', () => {
        const csId = useProjectStore.getState().createCreativeSet('In Folder');
        useProjectStore.setState((s: any) => { s.creativeSets[0].folderId = 'old-folder'; });

        useProjectStore.getState().moveToFolder(csId, null);
        expect(useProjectStore.getState().creativeSets[0].folderId).toBeUndefined();
    });

    it('should move a folder to another folder', () => {
        useProjectStore.getState().createFolder('Child');
        useProjectStore.getState().createFolder('Parent');
        const childId = useProjectStore.getState().folders[0].id;
        const parentId = useProjectStore.getState().folders[1].id;

        useProjectStore.getState().moveToFolder(childId, parentId);
        expect(useProjectStore.getState().folders[0].parentId).toBe(parentId);
    });
});

describe('projectStore — navigateToFolder', () => {
    it('should change currentFolderId', () => {
        useProjectStore.getState().navigateToFolder('folder-1');
        expect(useProjectStore.getState().currentFolderId).toBe('folder-1');
    });

    it('should reset page and clear selection', () => {
        useProjectStore.setState({ currentPage: 5, selectedIds: new Set(['a', 'b']) });
        useProjectStore.getState().navigateToFolder('folder-2');
        expect(useProjectStore.getState().currentPage).toBe(1);
        expect(useProjectStore.getState().selectedIds.size).toBe(0);
    });

    it('should navigate to root with null', () => {
        useProjectStore.getState().navigateToFolder('sub');
        useProjectStore.getState().navigateToFolder(null);
        expect(useProjectStore.getState().currentFolderId).toBeNull();
    });
});

describe('projectStore — Search + Sort + Pagination', () => {
    it('setSearchQuery resets page to 1', () => {
        useProjectStore.setState({ currentPage: 3 });
        useProjectStore.getState().setSearchQuery('banner');
        expect(useProjectStore.getState().searchQuery).toBe('banner');
        expect(useProjectStore.getState().currentPage).toBe(1);
    });

    it('setSort toggles direction on same column', () => {
        expect(useProjectStore.getState().sortDirection).toBe('asc');
        useProjectStore.getState().setSort('name');
        expect(useProjectStore.getState().sortDirection).toBe('desc');
    });

    it('setSort changes column with asc default', () => {
        useProjectStore.getState().setSort('createdAt');
        expect(useProjectStore.getState().sortColumn).toBe('createdAt');
        expect(useProjectStore.getState().sortDirection).toBe('asc');
    });

    it('setSort resets page to 1', () => {
        useProjectStore.setState({ currentPage: 3 });
        useProjectStore.getState().setSort('variantCount');
        expect(useProjectStore.getState().currentPage).toBe(1);
    });

    it('setCurrentPage updates page', () => {
        useProjectStore.getState().setCurrentPage(5);
        expect(useProjectStore.getState().currentPage).toBe(5);
    });

    it('setItemsPerPage updates count and resets page', () => {
        useProjectStore.setState({ currentPage: 3 });
        useProjectStore.getState().setItemsPerPage(50);
        expect(useProjectStore.getState().itemsPerPage).toBe(50);
        expect(useProjectStore.getState().currentPage).toBe(1);
    });
});

describe('projectStore — View Mode + Selection', () => {
    it('setViewMode changes to grid', () => {
        useProjectStore.getState().setViewMode('grid');
        expect(useProjectStore.getState().viewMode).toBe('grid');
    });

    it('setViewMode changes to compact', () => {
        useProjectStore.getState().setViewMode('compact');
        expect(useProjectStore.getState().viewMode).toBe('compact');
    });

    it('toggleSelection adds then removes', () => {
        useProjectStore.getState().toggleSelection('id-1');
        expect(useProjectStore.getState().selectedIds.has('id-1')).toBe(true);
        useProjectStore.getState().toggleSelection('id-1');
        expect(useProjectStore.getState().selectedIds.has('id-1')).toBe(false);
    });

    it('selectAll sets exact IDs', () => {
        useProjectStore.getState().selectAll(['a', 'b', 'c']);
        expect(useProjectStore.getState().selectedIds.size).toBe(3);
    });

    it('clearSelection empties all', () => {
        useProjectStore.getState().selectAll(['a', 'b']);
        useProjectStore.getState().clearSelection();
        expect(useProjectStore.getState().selectedIds.size).toBe(0);
    });
});

describe('projectStore — Rename Folder', () => {
    it('should update folder name', () => {
        useProjectStore.getState().createFolder('Old Name');
        const id = useProjectStore.getState().folders[0].id;

        useProjectStore.getState().renameFolder(id, 'New Name');
        const folder = useProjectStore.getState().folders[0];
        expect(folder.name).toBe('New Name');
    });

    it('should set updatedAt', () => {
        useProjectStore.getState().createFolder('Test');
        const id = useProjectStore.getState().folders[0].id;
        useProjectStore.getState().renameFolder(id, 'Renamed');
        expect(useProjectStore.getState().folders[0].updatedAt).toBeTruthy();
    });
});

describe('projectStore — Create in Current Folder', () => {
    it('creative set uses currentFolderId', () => {
        useProjectStore.setState({ currentFolderId: 'folder-x' });
        useProjectStore.getState().createCreativeSet('In Sub');
        expect(useProjectStore.getState().creativeSets[0].folderId).toBe('folder-x');
    });

    it('folder uses currentFolderId as parentId', () => {
        useProjectStore.setState({ currentFolderId: 'parent-1' });
        useProjectStore.getState().createFolder('Sub Folder');
        expect(useProjectStore.getState().folders[0].parentId).toBe('parent-1');
    });
});
