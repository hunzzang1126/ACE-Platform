// ─────────────────────────────────────────────────
// Group Removal Regression Tests
// ─────────────────────────────────────────────────
// ★ REGRESSION GUARD: Group feature was removed in v412.
// These tests ensure group code never re-enters the codebase.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '..');

/** Read a source file's content */
function readSrc(relPath: string): string {
    const full = path.join(SRC_DIR, relPath);
    if (!fs.existsSync(full)) return '';
    return fs.readFileSync(full, 'utf-8');
}

describe('★ REGRESSION: Group feature removal (v412)', () => {
    it('fabricEngineShim must NOT contain group_elements method', () => {
        const content = readSrc('hooks/fabricEngineShim.ts');
        expect(content).not.toContain('group_elements');
        expect(content).not.toContain('ungroup');
    });

    it('fabricEngineShim must NOT import Group from fabric', () => {
        const content = readSrc('hooks/fabricEngineShim.ts');
        // Should not have "Group" in the fabric import line
        const importLine = content.split('\n').find(l => l.includes("from 'fabric'"));
        expect(importLine).toBeDefined();
        expect(importLine).not.toContain('Group');
    });

    it('canvasTypes interface must NOT have groupSelected or ungroupSelected', () => {
        const content = readSrc('hooks/canvasTypes.ts');
        expect(content).not.toContain('groupSelected');
        expect(content).not.toContain('ungroupSelected');
    });

    it('useCanvasKeyboard must NOT have Cmd+G group shortcut', () => {
        const content = readSrc('hooks/useCanvasKeyboard.ts');
        expect(content).not.toContain('groupSelected');
        expect(content).not.toContain('ungroupSelected');
    });

    it('canvasEngineActions must NOT export groupSelected', () => {
        const content = readSrc('hooks/canvasEngineActions.ts');
        expect(content).not.toContain('groupSelected');
        expect(content).not.toContain('ungroupSelected');
    });

    it('CanvasContextMenu must NOT have Group/Ungroup menu items', () => {
        const content = readSrc('components/editor/CanvasContextMenu.tsx');
        expect(content).not.toContain("'Group'");
        expect(content).not.toContain("'Ungroup'");
    });

    it('ContextToolbar must NOT have Make a Group button', () => {
        const content = readSrc('components/editor/ContextToolbar.tsx');
        expect(content).not.toContain('Make a Group');
        expect(content).not.toContain('groupSelected');
    });

    it('elementConverters must NOT export engineNodeToGroupElement', () => {
        const content = readSrc('engine/elementConverters.ts');
        expect(content).not.toContain('engineNodeToGroupElement');
    });

    it('fabricHelpers must NOT import Group from fabric', () => {
        const content = readSrc('hooks/fabricHelpers.ts');
        const importLine = content.split('\n').find(l => l.includes("from 'fabric'"));
        expect(importLine).toBeDefined();
        expect(importLine).not.toContain('Group');
    });

    it('useAutoDesign must NOT call group_elements', () => {
        const content = readSrc('hooks/useAutoDesign.ts');
        expect(content).not.toContain('group_elements');
    });

    it('useCanvasSync must NOT have restoreGroup function', () => {
        const content = readSrc('hooks/useCanvasSync.ts');
        expect(content).not.toContain('restoreGroup');
    });
});

describe('★ REGRESSION: Dead code cleanup (v412)', () => {
    it('PendingPage.tsx must not exist', () => {
        const exists = fs.existsSync(path.join(SRC_DIR, 'app/PendingPage.tsx'));
        expect(exists).toBe(false);
    });

    it('App.tsx must not import PendingPage', () => {
        const content = readSrc('app/App.tsx');
        expect(content).not.toContain('PendingPage');
    });

    it('App.tsx must not have /pending route', () => {
        const content = readSrc('app/App.tsx');
        expect(content).not.toContain('/pending');
    });
});
