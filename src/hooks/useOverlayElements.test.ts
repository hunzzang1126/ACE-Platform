// ─────────────────────────────────────────────────
// useOverlayElements.test.ts — HTML overlay CRUD tests
// ─────────────────────────────────────────────────
// Covers: OverlayElement interface, addText, addImage, addVideo,
// updateElement, deleteElement, selection, reorder, lock, visibility
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useOverlayElements.ts'), 'utf-8');

describe('useOverlayElements — OverlayElement interface', () => {
    it('defines OverlayElement type with id, type, name, position', () => {
        expect(src).toContain('export interface OverlayElement');
        expect(src).toContain("type: 'text' | 'image' | 'video'");
        expect(src).toContain('x: number');
        expect(src).toContain('w: number');
    });

    it('supports text properties (fontSize, fontFamily, fontWeight, color)', () => {
        expect(src).toContain('fontSize?: number');
        expect(src).toContain('fontFamily?: string');
        expect(src).toContain('fontWeight?: string');
        expect(src).toContain('color?: string');
    });

    it('supports image properties (src, objectFit, naturalWidth)', () => {
        expect(src).toContain('src?: string');
        expect(src).toContain('objectFit?:');
        expect(src).toContain('naturalWidth?: number');
    });

    it('supports video properties', () => {
        expect(src).toContain("type: 'text' | 'image' | 'video'");
    });
});

describe('useOverlayElements — CRUD operations', () => {
    it('exports useOverlayElements hook', () => {
        expect(src).toContain('export function useOverlayElements');
    });

    it('has addText function', () => {
        expect(src).toContain('addText');
    });

    it('has addImage or triggerImageUpload function', () => {
        const hasMethod = src.includes('addImage') || src.includes('triggerImageUpload');
        expect(hasMethod).toBe(true);
    });

    it('has updateElement function', () => {
        expect(src).toContain('updateElement');
    });

    it('has deleteElement function', () => {
        expect(src).toContain('deleteElement');
    });
});

describe('useOverlayElements — selection & reorder', () => {
    it('has selectOverlay function', () => {
        expect(src).toContain('selectOverlay');
    });

    it('has moveUp function', () => {
        expect(src).toContain('moveUp');
    });

    it('has moveDown function', () => {
        expect(src).toContain('moveDown');
    });

    it('has reorderTo function', () => {
        expect(src).toContain('reorderTo');
    });
});

describe('useOverlayElements — lock & visibility', () => {
    it('has toggleLock function', () => {
        expect(src).toContain('toggleLock');
    });

    it('has toggleVisibility function', () => {
        expect(src).toContain('toggleVisibility');
    });

    it('OverlayElement has locked and visible properties', () => {
        expect(src).toContain('locked');
        expect(src).toContain('visible');
    });
});

describe('useOverlayElements — duplicate & rename', () => {
    it('has duplicateOverlay function', () => {
        expect(src).toContain('duplicateOverlay');
    });

    it('has renameOverlay function', () => {
        expect(src).toContain('renameOverlay');
    });
});

describe('useOverlayElements — restore', () => {
    it('has restoreElements function for save/load cycle', () => {
        expect(src).toContain('restoreElements');
    });

    it('has clearOverlays function', () => {
        expect(src).toContain('clearOverlays');
    });
});

describe('useOverlayElements — zIndex management', () => {
    it('has setZIndex function', () => {
        expect(src).toContain('setZIndex');
    });
});

describe('useOverlayElements — video save integration', () => {
    it('saves video blobs for persistence', () => {
        expect(src).toContain('saveVideoBlob');
    });

    it('integrates with upload library', () => {
        expect(src).toContain('saveToUploadLibrary');
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Image upload = gallery only (v464)
// triggerImageUpload must NOT create overlay elements.
// Images go to gallery → user clicks → Fabric engine adds to canvas.
// ═════════════════════════════════════════════════
describe('★ REGRESSION: triggerImageUpload is gallery-only', () => {
    it('triggerImageUpload calls saveToUploadLibrary (gallery)', () => {
        // Extract the triggerImageUpload function body
        const fnStart = src.indexOf('const triggerImageUpload');
        const fnBody = src.slice(fnStart, fnStart + 800);
        expect(fnBody).toContain('saveToUploadLibrary');
    });

    it('triggerImageUpload does NOT call addImage (no canvas placement)', () => {
        // The triggerImageUpload body should not reference addImage
        const fnStart = src.indexOf('const triggerImageUpload');
        const fnBody = src.slice(fnStart, fnStart + 800);
        expect(fnBody).not.toContain('addImage(');
    });

    it('triggerImageUpload supports multiple files (input.multiple)', () => {
        const fnStart = src.indexOf('const triggerImageUpload');
        const fnBody = src.slice(fnStart, fnStart + 800);
        expect(fnBody).toContain('multiple = true');
    });

    it('triggerImageUpload has no x/y position parameters', () => {
        // Should be () => not (x, y) =>
        const fnStart = src.indexOf('const triggerImageUpload');
        const signature = src.slice(fnStart, fnStart + 100);
        expect(signature).toContain('useCallback(() =>');
    });
});
