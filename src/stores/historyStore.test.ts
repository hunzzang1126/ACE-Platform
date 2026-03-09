// ─────────────────────────────────────────────────
// historyStore.test — Undo/redo history tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from './historyStore';

describe('historyStore', () => {
    beforeEach(() => {
        useHistoryStore.setState({
            undoStack: [],
            redoStack: [],
            maxSize: 50,
            isRestoring: false,
            canUndo: false,
            canRedo: false,
        });
    });

    it('pushes state onto undo stack', () => {
        const s = useHistoryStore.getState();
        s.pushState('Add rect', '{"objects":[]}');
        expect(useHistoryStore.getState().undoStack.length).toBe(1);
        expect(useHistoryStore.getState().canUndo).toBe(true);
    });

    it('clears redo on new push', () => {
        const s = useHistoryStore.getState();
        s.pushState('Step 1', '{"v":1}');
        s.pushState('Step 2', '{"v":2}');
        s.undo();
        expect(useHistoryStore.getState().canRedo).toBe(true);

        // New push should clear redo
        useHistoryStore.getState().pushState('Step 3', '{"v":3}');
        expect(useHistoryStore.getState().canRedo).toBe(false);
        expect(useHistoryStore.getState().redoStack.length).toBe(0);
    });

    it('undo returns previous state', () => {
        const s = useHistoryStore.getState();
        s.pushState('Step 1', '{"v":1}');
        s.pushState('Step 2', '{"v":2}');

        const entry = useHistoryStore.getState().undo();
        expect(entry).not.toBeNull();
        expect(entry!.canvasState).toBe('{"v":1}');
        expect(useHistoryStore.getState().canUndo).toBe(true);
    });

    it('undo returns null when stack is empty', () => {
        expect(useHistoryStore.getState().undo()).toBeNull();
    });

    it('redo returns undone state', () => {
        const s = useHistoryStore.getState();
        s.pushState('Step 1', '{"v":1}');
        s.pushState('Step 2', '{"v":2}');
        useHistoryStore.getState().undo();

        const entry = useHistoryStore.getState().redo();
        expect(entry).not.toBeNull();
        expect(entry!.canvasState).toBe('{"v":2}');
    });

    it('redo returns null when stack is empty', () => {
        expect(useHistoryStore.getState().redo()).toBeNull();
    });

    it('ring buffer limits undo stack size', () => {
        useHistoryStore.setState({ maxSize: 3 });
        const s = useHistoryStore.getState();
        s.pushState('A', '1');
        s.pushState('B', '2');
        s.pushState('C', '3');
        useHistoryStore.getState().pushState('D', '4');

        const stack = useHistoryStore.getState().undoStack;
        expect(stack.length).toBe(3);
        expect(stack[0]!.label).toBe('B'); // 'A' evicted
    });

    it('skips recording during restore', () => {
        const s = useHistoryStore.getState();
        s.setRestoring(true);
        s.pushState('Should skip', '{}');
        expect(useHistoryStore.getState().undoStack.length).toBe(0);

        useHistoryStore.getState().setRestoring(false);
        useHistoryStore.getState().pushState('Should record', '{}');
        expect(useHistoryStore.getState().undoStack.length).toBe(1);
    });

    it('clear empties both stacks', () => {
        const s = useHistoryStore.getState();
        s.pushState('A', '1');
        s.pushState('B', '2');
        useHistoryStore.getState().undo();
        useHistoryStore.getState().clear();

        expect(useHistoryStore.getState().undoStack.length).toBe(0);
        expect(useHistoryStore.getState().redoStack.length).toBe(0);
        expect(useHistoryStore.getState().canUndo).toBe(false);
        expect(useHistoryStore.getState().canRedo).toBe(false);
    });

    it('getUndoLabels returns label list', () => {
        const s = useHistoryStore.getState();
        s.pushState('Add rect', '1');
        s.pushState('Move element', '2');
        s.pushState('Change color', '3');

        const labels = useHistoryStore.getState().getUndoLabels();
        expect(labels).toEqual(['Add rect', 'Move element', 'Change color']);
    });

    it('preserves overlay state in entries', () => {
        const s = useHistoryStore.getState();
        s.pushState('With overlay', '{"canvas":true}', '{"overlays":[]}');
        const entry = useHistoryStore.getState().undoStack[0]!;
        expect(entry.overlayState).toBe('{"overlays":[]}');
    });

    it('full undo/redo cycle preserves state', () => {
        const s = useHistoryStore.getState();
        s.pushState('Step 1', '{"v":1}');
        s.pushState('Step 2', '{"v":2}');
        s.pushState('Step 3', '{"v":3}');

        // Undo all
        useHistoryStore.getState().undo(); // back to step 2
        useHistoryStore.getState().undo(); // back to step 1
        useHistoryStore.getState().undo(); // nothing to undo
        expect(useHistoryStore.getState().canUndo).toBe(false);
        expect(useHistoryStore.getState().canRedo).toBe(true);

        // Redo all
        useHistoryStore.getState().redo();
        useHistoryStore.getState().redo();
        useHistoryStore.getState().redo();
        expect(useHistoryStore.getState().canUndo).toBe(true);
        expect(useHistoryStore.getState().canRedo).toBe(false);
    });
});
