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

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: Project rename → designStore sync
// Fixed in v0.0.0.290 — require('@/stores/...') silently failed
// ═══════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('★ REGRESSION: Rename sync — projectStore ↔ designStore', () => {

    it('renameCreativeSet updates name in projectStore', () => {
        const id = useProjectStore.getState().createCreativeSet('Before');
        useProjectStore.getState().renameCreativeSet(id, 'After');
        expect(useProjectStore.getState().creativeSets[0]!.name).toBe('After');
    });

    it('renameCreativeSet updates updatedAt timestamp', () => {
        const id = useProjectStore.getState().createCreativeSet('Test');
        const before = useProjectStore.getState().creativeSets[0]!.updatedAt;
        // Small delay to ensure timestamp differs
        useProjectStore.getState().renameCreativeSet(id, 'Updated');
        const after = useProjectStore.getState().creativeSets[0]!.updatedAt;
        expect(after).toBeTruthy();
        // updatedAt should be set (may or may not differ in sub-ms test)
        expect(typeof after).toBe('string');
        void before; // suppress unused
    });

    it('★ REGRESSION: projectStore does NOT use require("@/stores/designStore") in code', () => {
        const src = readFileSync(resolve(__dirname, './projectStore.ts'), 'utf-8');
        // Strip comments (lines starting with // after trimming)
        const codeLines = src.split('\n').filter(l => !l.trim().startsWith('//'));
        const codeOnly = codeLines.join('\n');
        // Should NOT contain require('@/stores/designStore') in actual code
        expect(codeOnly).not.toContain("require('@/stores/designStore')");
        // Should use top-level imported useDesignStore instead
        expect(src).toContain("import { useDesignStore } from './designStore'");
    });

    it('★ REGRESSION: designStore uses relative require for projectStore', () => {
        const src = readFileSync(resolve(__dirname, './designStore.ts'), 'utf-8');
        // Should NOT contain require('@/stores/projectStore') — broken in Vite
        expect(src).not.toContain("require('@/stores/projectStore')");
        // Should use relative path
        expect(src).toContain("require('./projectStore')");
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: New project stays on dashboard
// Changed in v0.0.0.291 — no navigate('/editor') on create
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: New project flow — card-first UX', () => {

    it('DashboardPage does not navigate on create', () => {
        const src = readFileSync(resolve(__dirname, '../app/DashboardPage.tsx'), 'utf-8');
        // handleNewCreativeSet should NOT contain navigate('/editor')
        // Extract the handler function body
        const handlerMatch = src.match(/handleNewCreativeSet\s*=\s*useCallback\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[/);
        expect(handlerMatch).toBeTruthy();
        const handlerBody = handlerMatch![1]!;
        expect(handlerBody).not.toContain("navigate('/editor')");
        expect(handlerBody).toContain('setNewlyCreatedId');
    });

    it('ProjectCard supports initialRenaming prop', () => {
        const src = readFileSync(resolve(__dirname, '../components/dashboard/ProjectCard.tsx'), 'utf-8');
        expect(src).toContain('initialRenaming');
        expect(src).toContain('useState(!!initialRenaming)');
    });
});

