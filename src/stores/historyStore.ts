// ─────────────────────────────────────────────────
// historyStore — Cross-component undo/redo history
// ─────────────────────────────────────────────────
// Ring-buffer-based command history pattern.
// Stores canvas snapshots for full state undo/redo.
// Exposed to all components (layer panel, AI agent, etc.)
// ─────────────────────────────────────────────────

import { create } from 'zustand';

// ── Types ────────────────────────────────────────

export interface HistoryEntry {
    /** Human-readable label for the action */
    label: string;
    /** Timestamp */
    timestamp: number;
    /** Serialized canvas state (Fabric.js JSON) */
    canvasState: string;
    /** Serialized overlay elements */
    overlayState?: string;
}

interface HistoryStore {
    /** Undo stack (most recent at end) */
    undoStack: HistoryEntry[];
    /** Redo stack (most recent at end) */
    redoStack: HistoryEntry[];
    /** Max history size (ring buffer) */
    maxSize: number;
    /** Whether currently restoring (skip recording) */
    isRestoring: boolean;

    /** Can undo */
    canUndo: boolean;
    /** Can redo */
    canRedo: boolean;

    // ── Actions ──
    /** Push a new state onto the undo stack */
    pushState: (label: string, canvasState: string, overlayState?: string) => void;
    /** Undo: pop from undo, push to redo, return state to restore */
    undo: () => HistoryEntry | null;
    /** Redo: pop from redo, push to undo, return state to restore */
    redo: () => HistoryEntry | null;
    /** Clear all history */
    clear: () => void;
    /** Set restoring flag (prevents recording during restore) */
    setRestoring: (v: boolean) => void;
    /** Get undo stack labels (for history panel display) */
    getUndoLabels: () => string[];
}

// ── Store ────────────────────────────────────────

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
    undoStack: [],
    redoStack: [],
    maxSize: 50,
    isRestoring: false,
    canUndo: false,
    canRedo: false,

    pushState: (label, canvasState, overlayState) => {
        if (get().isRestoring) return; // Don't record during restore

        set((state) => {
            const entry: HistoryEntry = {
                label,
                timestamp: Date.now(),
                canvasState,
                overlayState,
            };

            const newUndo = [...state.undoStack, entry];
            // Ring buffer: keep only maxSize entries
            if (newUndo.length > state.maxSize) {
                newUndo.splice(0, newUndo.length - state.maxSize);
            }

            return {
                undoStack: newUndo,
                redoStack: [], // Clear redo on new action
                canUndo: true,
                canRedo: false,
            };
        });
    },

    undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return null;

        const entry = state.undoStack[state.undoStack.length - 1]!;
        const newUndo = state.undoStack.slice(0, -1);
        const newRedo = [...state.redoStack, entry];

        set({
            undoStack: newUndo,
            redoStack: newRedo,
            canUndo: newUndo.length > 0,
            canRedo: true,
        });

        // Return the state to restore to (the one before the undone action)
        return newUndo.length > 0 ? newUndo[newUndo.length - 1]! : null;
    },

    redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return null;

        const entry = state.redoStack[state.redoStack.length - 1]!;
        const newRedo = state.redoStack.slice(0, -1);
        const newUndo = [...state.undoStack, entry];

        set({
            undoStack: newUndo,
            redoStack: newRedo,
            canUndo: true,
            canRedo: newRedo.length > 0,
        });

        return entry;
    },

    clear: () => set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false }),

    setRestoring: (v) => set({ isRestoring: v }),

    getUndoLabels: () => get().undoStack.map(e => e.label),
}));
