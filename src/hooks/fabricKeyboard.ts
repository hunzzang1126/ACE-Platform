// ─────────────────────────────────────────────────
// fabricKeyboard — Keyboard shortcuts for Fabric.js canvas
// ─────────────────────────────────────────────────
// Arrow keys: 1px nudge (Shift: 10px)
// ⌘Z / ⌘Y: Undo / Redo
// Delete/Backspace: Remove selected
// ⌘D: Duplicate selected
// Tool shortcuts: V S T P H Z D
// ⌘0: Fit canvas to viewport
// ─────────────────────────────────────────────────

import { useEffect, useCallback } from 'react';
import { Canvas, FabricObject } from 'fabric';
import type { EditorTool } from '@/stores/editorStore';
import { isArtboard } from './fabricHelpers';

interface FabricKeyboardParams {
    fabricRef: React.RefObject<Canvas | null>;
    containerRef: React.RefObject<HTMLElement | null>;
    width: number;
    height: number;
    undo: () => void;
    redo: () => void;
    deleteSelected: () => void;
    duplicateSelected: () => number | null;
    setTool: (tool: EditorTool) => void;
    syncState: () => void;
    pushUndo: (label?: string) => void;
}

/** Arrow key nudging: 1px default, 10px with Shift */
function nudgeSelected(fc: Canvas, dx: number, dy: number): boolean {
    const active = fc.getActiveObjects();
    if (active.length === 0) return false;
    for (const obj of active) {
        if (isArtboard(obj)) continue;
        obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
        obj.setCoords();
    }
    fc.renderAll();
    return true;
}

export function useFabricKeyboard({
    fabricRef, containerRef, width, height,
    undo, redo, deleteSelected, duplicateSelected,
    setTool, syncState, pushUndo,
}: FabricKeyboardParams) {
    const handler = useCallback((e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

        const fc = fabricRef.current;
        if (!fc) return;

        // ── Undo / Redo ──
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault(); undo(); return;
        }
        if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
            e.preventDefault(); redo(); return;
        }

        // ── Duplicate ──
        if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
            e.preventDefault(); duplicateSelected(); return;
        }

        // ── Delete / Backspace ──
        if (e.key === 'Backspace' || e.key === 'Delete') {
            // Only intercept if NOT editing text inline
            const isEditingText = (fc as any).isEditing || fc.getActiveObject()?.isEditing;
            if (!isEditingText) {
                e.preventDefault(); deleteSelected(); return;
            }
        }

        // ── Fit to viewport ──
        if ((e.metaKey || e.ctrlKey) && e.key === '0') {
            e.preventDefault();
            const c = containerRef.current;
            const cw = c?.clientWidth ?? 1200;
            const ch = c?.clientHeight ?? 700;
            const fit = Math.min(cw / width * 0.85, ch / height * 0.85, 1);
            const vpt = fc.viewportTransform!;
            vpt[0] = fit; vpt[3] = fit;
            vpt[4] = (cw - width * fit) / 2; vpt[5] = (ch - height * fit) / 2;
            fc.setViewportTransform(vpt); fc.renderAll();
            return;
        }

        // ── Arrow keys: Nudge selected elements ──
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const step = e.shiftKey ? 10 : 1;
            let dx = 0, dy = 0;
            if (e.key === 'ArrowLeft') dx = -step;
            else if (e.key === 'ArrowRight') dx = step;
            else if (e.key === 'ArrowUp') dy = -step;
            else if (e.key === 'ArrowDown') dy = step;

            // Only nudge if something is selected (not editing text)
            const isEditingText = (fc as any).isEditing || fc.getActiveObject()?.isEditing;
            if (!isEditingText && nudgeSelected(fc, dx, dy)) {
                e.preventDefault();
                pushUndo('Nudge');
                syncState();
            }
            return;
        }

        // ── Tool shortcuts (no modifiers) ──
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            switch (e.key.toLowerCase()) {
                case 'v': setTool('select'); break;
                case 's': setTool('shape'); break;
                case 't': setTool('text'); break;
                case 'p': setTool('pen'); break;
                case 'h': setTool('hand'); break;
                case 'z': setTool('zoom'); break;
                case 'd': setTool('eyedropper'); break;
            }
        }
    }, [fabricRef, containerRef, width, height, undo, redo, deleteSelected, duplicateSelected, setTool, syncState, pushUndo]);

    useEffect(() => {
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handler]);
}
