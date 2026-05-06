// ─────────────────────────────────────────────────
// fabricKeyboard.test.ts — Tests for keyboard shortcuts
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
    const full = path.join(SRC_DIR, relPath);
    if (!fs.existsSync(full)) return '';
    return fs.readFileSync(full, 'utf-8');
}

describe('fabricKeyboard', () => {
    const source = readSrc('hooks/fabricKeyboard.ts');

    describe('Arrow key nudging', () => {
        it('should handle ArrowUp key', () => {
            expect(source).toContain('ArrowUp');
        });

        it('should handle ArrowDown key', () => {
            expect(source).toContain('ArrowDown');
        });

        it('should handle ArrowLeft key', () => {
            expect(source).toContain('ArrowLeft');
        });

        it('should handle ArrowRight key', () => {
            expect(source).toContain('ArrowRight');
        });

        it('should use 1px default step', () => {
            // Default step is 1, Shift step is 10
            expect(source).toContain('e.shiftKey ? 10 : 1');
        });

        it('should push undo after nudge', () => {
            expect(source).toContain("pushUndo('Nudge')");
        });

        it('should call syncState after nudge', () => {
            expect(source).toContain('syncState()');
        });

        it('should not nudge when editing text', () => {
            expect(source).toContain('isEditingText');
        });
    });

    describe('Undo/Redo shortcuts', () => {
        it('should handle ⌘Z for undo', () => {
            expect(source).toContain("e.key === 'z' && !e.shiftKey");
            expect(source).toContain('undo()');
        });

        it('should handle ⌘Y for redo', () => {
            expect(source).toContain("e.key === 'y'");
            expect(source).toContain('redo()');
        });

        it('should handle ⌘⇧Z for redo', () => {
            expect(source).toContain("e.shiftKey && e.key === 'z'");
        });
    });

    describe('Delete/Duplicate shortcuts', () => {
        it('should handle Delete/Backspace', () => {
            expect(source).toContain("'Backspace'");
            expect(source).toContain("'Delete'");
            expect(source).toContain('deleteSelected()');
        });

        it('should handle ⌘D for duplicate', () => {
            expect(source).toContain("e.key === 'd'");
            expect(source).toContain('duplicateSelected()');
        });

        it('should not delete when editing text inline', () => {
            // isEditingText check before delete
            expect(source).toContain('isEditingText');
        });
    });

    describe('Tool shortcuts', () => {
        it('should handle V for select', () => {
            expect(source).toContain("case 'v': setTool('select')");
        });

        it('should handle T for text', () => {
            expect(source).toContain("case 't': setTool('text')");
        });

        it('should handle H for hand', () => {
            expect(source).toContain("case 'h': setTool('hand')");
        });
    });

    describe('Input guard', () => {
        it('should skip when typing in INPUT', () => {
            expect(source).toContain("tag === 'INPUT'");
        });

        it('should skip when typing in TEXTAREA', () => {
            expect(source).toContain("tag === 'TEXTAREA'");
        });

        it('should skip contentEditable elements', () => {
            expect(source).toContain('isContentEditable');
        });
    });

    describe('Fit viewport', () => {
        it('should handle ⌘0 for fit', () => {
            expect(source).toContain("e.key === '0'");
        });
    });
});

describe('fabricCanvasEvents — Alt+Drag duplicate', () => {
    const evSource = readSrc('hooks/fabricCanvasEvents.ts');

    it('should have Alt+Drag clone handler', () => {
        expect(evSource).toContain('Alt+Drag = Duplicate');
    });

    it('should check for altKey', () => {
        expect(evSource).toContain('e.altKey');
    });

    it('should clone the target object', () => {
        expect(evSource).toContain('target.clone()');
    });

    it('should assign new glidId to clone', () => {
        expect(evSource).toContain('__glidId = id');
    });

    it('should set clone as active object', () => {
        expect(evSource).toContain('fc.setActiveObject(cloned)');
    });

    it('should not clone artboard', () => {
        expect(evSource).toContain('isArtboard(target)');
    });
});

describe('useFabricCanvas integration', () => {
    const fabricSource = readSrc('hooks/useFabricCanvas.ts');

    it('should import useFabricKeyboard', () => {
        expect(fabricSource).toContain("import { useFabricKeyboard } from './fabricKeyboard'");
    });

    it('should call useFabricKeyboard with required params', () => {
        expect(fabricSource).toContain('useFabricKeyboard({');
        expect(fabricSource).toContain('deleteSelected');
        expect(fabricSource).toContain('duplicateSelected');
        expect(fabricSource).toContain('pushUndo');
    });

    it('should NOT have inline keyboard handler (extracted)', () => {
        // The old inline handler had window.addEventListener directly
        // Now it's delegated to fabricKeyboard.ts
        expect(fabricSource).not.toContain("window.addEventListener('keydown', handler)");
    });
});
