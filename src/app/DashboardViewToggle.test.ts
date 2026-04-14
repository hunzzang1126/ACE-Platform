// ─────────────────────────────────────────────────
// DashboardViewToggle.test.ts — Grid/List view + image persistence
// ─────────────────────────────────────────────────
// Covers: viewMode toggle, list view CSS class, image idbRef passing
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const dashSrc = readFileSync(resolve(__dirname, './DashboardPage.tsx'), 'utf-8');
const cardSrc = readFileSync(resolve(__dirname, '../components/dashboard/ProjectCard.tsx'), 'utf-8');
const sidebarSrc = readFileSync(resolve(__dirname, '../components/editor/EditorSidebar.tsx'), 'utf-8');

// ══════════════════════════════════════════════════
// Dashboard — View mode toggle
// ══════════════════════════════════════════════════
describe('DashboardPage — view mode toggle', () => {
    it('has viewMode state with grid and list options', () => {
        expect(dashSrc).toContain("'grid' | 'list'");
    });

    it('persists viewMode to localStorage', () => {
        expect(dashSrc).toContain("localStorage.setItem('ace-dashboard-view'");
        expect(dashSrc).toContain("localStorage.getItem('ace-dashboard-view'");
    });

    it('renders toggle buttons for grid and list', () => {
        expect(dashSrc).toContain('dashboard-view-toggle__btn');
        expect(dashSrc).toContain("t('dash.gridView')");
        expect(dashSrc).toContain("t('dash.listView')");
    });

    it('conditionally applies project-list or project-grid class', () => {
        expect(dashSrc).toContain("viewMode === 'list' ? 'project-list' : 'project-grid'");
    });

    it('passes viewMode to ProjectCard', () => {
        expect(dashSrc).toContain('viewMode={viewMode}');
    });
});

// ══════════════════════════════════════════════════
// ProjectCard — List view support
// ══════════════════════════════════════════════════
describe('ProjectCard — list view rendering', () => {
    it('accepts viewMode prop with default grid', () => {
        expect(cardSrc).toContain("viewMode = 'grid'");
    });

    it('renders project-list-row class in list mode', () => {
        expect(cardSrc).toContain('project-list-row');
    });

    it('shows name, sizes, date columns in list view', () => {
        expect(cardSrc).toContain('project-list-row__name');
        expect(cardSrc).toContain('project-list-row__sizes');
        expect(cardSrc).toContain('project-list-row__date');
    });

    it('has kebab menu in list view', () => {
        expect(cardSrc).toContain('project-list-row__menu');
    });

    it('supports rename in list view', () => {
        // List view render block should include rename input
        expect(cardSrc).toContain('project-list-row__name');
        // The list view block has rename support via shared renaming state
        expect(cardSrc).toContain('project-card__rename');
    });

    it('uses ProjectThumbnail for grid preview', () => {
        expect(cardSrc).toContain("viewMode === 'grid'");
        // ProjectThumbnail renders real design data instead of generic rectangles
        expect(cardSrc).toContain("ProjectThumbnail");
    });

    it('supports context menu in list mode', () => {
        expect(cardSrc).toContain('onContextMenu={handleContextMenu}');
    });
});

// ══════════════════════════════════════════════════
// EditorSidebar — Image persistence (idbRef)
// ══════════════════════════════════════════════════
describe('EditorSidebar — ★ REGRESSION: image idbRef persistence', () => {
    it('passes entry.idbRef to addImage', () => {
        expect(sidebarSrc).toContain('entry.idbRef');
    });

    it('★ REGRESSION: does NOT pass only blobUrl without idbRef', () => {
        // The old bug: addImage(0, 0, blobUrl, entry.width, entry.height)
        // Should now have 6 args with idbRef at the end
        const addImageCall = sidebarSrc.match(/actions\.addImage\([^)]+\)/);
        expect(addImageCall).not.toBeNull();
        expect(addImageCall![0]).toContain('entry.idbRef');
    });

    it('has DATA INTEGRITY comment explaining the fix', () => {
        expect(sidebarSrc).toContain('DATA INTEGRITY');
    });
});
