// ─────────────────────────────────────────────────
// useCanvasKeyboard — Keyboard shortcuts for the canvas editor
// Undo/Redo, Delete, Duplicate, Tool switching
// ─────────────────────────────────────────────────

import { useEffect } from 'react';
import type { Engine } from './canvasTypes';
import type { EditorTool } from '@/stores/editorStore';

interface KeyboardActions {
    engineRef: React.RefObject<Engine | null>;
    syncState: () => void;
    setTool: (tool: EditorTool) => void;
    addRect: (x?: number, y?: number) => number | null;
    addEllipse: (x?: number, y?: number) => number | null;
    duplicateSelected: () => number | null;
}

export function useCanvasKeyboard({
    engineRef, syncState, setTool, addRect, addEllipse, duplicateSelected,
}: KeyboardActions) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const engine = engineRef.current;
            if (!engine) return;

            // Don't intercept when typing in an input
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                engine.undo();
                syncState();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                engine.redo();
                syncState();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                duplicateSelected();
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                engine.delete_selected();
                syncState();
            }
            // Tool shortcuts (only without modifiers)
            else if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'v': setTool('select'); break;
                    case 's': setTool('shape'); break;
                    case 't': setTool('text'); break;
                    case 'i': setTool('image'); break;
                    case 'h': setTool('hand'); break;
                    case 'z': setTool('zoom'); break;
                    case 'r': e.preventDefault(); addRect(); setTool('select'); break;
                    case 'e': e.preventDefault(); addEllipse(); setTool('select'); break;
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [engineRef, syncState, setTool, addRect, addEllipse, duplicateSelected]);
}
