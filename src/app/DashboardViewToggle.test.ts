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

    it('persists viewMode to localStorage on change', () => {
        expect(dashSrc).toContain("localStorage.setItem('ace-dashboard-view'");
    });

    it('reads viewMode from localStorage (user preference)', () => {
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

    it('uses simple icon for grid preview (no heavy thumbnail)', () => {
        // ProjectThumbnail was removed for clean minimal cards
        expect(cardSrc).not.toContain('ProjectThumbnail');
        expect(cardSrc).toContain('project-card__preview-size');
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

    it('passes canvas dimensions for fill-to-page default', () => {
        expect(sidebarSrc).toContain('actions.canvasWidth');
        expect(sidebarSrc).toContain('actions.canvasHeight');
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION: Simplified project cards (v0.0.0.617)
// Heavy ProjectThumbnail replaced with minimal icon + size label
// ══════════════════════════════════════════════════
const cssSrc = readFileSync(resolve(__dirname, '../styles/dashboard.css'), 'utf-8');

describe('★ REGRESSION: Simplified project cards (v0.0.0.617)', () => {
    it('ProjectCard does NOT import ProjectThumbnail', () => {
        expect(cardSrc).not.toContain("import { ProjectThumbnail }");
        expect(cardSrc).not.toContain("from './ProjectThumbnail'");
    });

    it('grid card uses SVG icon instead of rendered thumbnail', () => {
        // Should have inline SVG for the layout icon
        expect(cardSrc).toContain('<svg');
        expect(cardSrc).toContain('project-card__preview');
    });

    it('grid card shows size count in preview area', () => {
        expect(cardSrc).toContain('project-card__preview-size');
        // Pluralization logic
        expect(cardSrc).toContain("variantCount !== 1 ? 's' : ''");
    });

    it('grid card does NOT have preview-more badge (removed)', () => {
        expect(cardSrc).not.toContain('project-card__preview-more');
    });
});

describe('★ REGRESSION: Dashboard CSS — minimal card preview', () => {
    it('preview area is 120px tall (compact)', () => {
        expect(cssSrc).toContain('height: 120px');
    });

    it('preview uses flex column for icon + label stack', () => {
        // The preview class should have flex-direction: column
        const previewBlock = cssSrc.substring(
            cssSrc.indexOf('.project-card__preview {'),
            cssSrc.indexOf('}', cssSrc.indexOf('.project-card__preview {')) + 1
        );
        expect(previewBlock).toContain('flex-direction: column');
        expect(previewBlock).toContain('align-items: center');
        expect(previewBlock).toContain('justify-content: center');
    });

    it('has preview-size class for the size label', () => {
        expect(cssSrc).toContain('.project-card__preview-size');
    });

    it('does NOT have old preview-grid or preview-rect classes', () => {
        expect(cssSrc).not.toContain('.project-card__preview-grid');
        expect(cssSrc).not.toContain('.project-card__preview-rect');
    });

    it('does NOT have old preview-more badge styles', () => {
        expect(cssSrc).not.toContain('.project-card__preview-more');
    });
});

describe('DashboardPage — localStorage bidirectional persistence', () => {
    it('reads from localStorage on mount', () => {
        expect(dashSrc).toContain("localStorage.getItem('ace-dashboard-view')");
    });

    it('writes to localStorage on change', () => {
        expect(dashSrc).toContain("localStorage.setItem('ace-dashboard-view', mode)");
    });

    it('defaults to grid when no localStorage value', () => {
        // The fallback is || 'grid'
        expect(dashSrc).toContain("|| 'grid'");
    });
});
