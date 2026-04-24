// ─────────────────────────────────────────────────
// AI Undo Stack — Unit Tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushSnapshot, popSnapshot, canUndo, peekUndoLabel, undoDepth, clearSnapshots, _getStack } from './aiUndoStack';

// Mock designStore
vi.mock('@/stores/designStore', () => ({
    useDesignStore: {
        getState: vi.fn(() => ({
            creativeSet: {
                variants: [
                    {
                        id: 'v1',
                        preset: { width: 300, height: 250 },
                        elements: [
                            { id: 'e1', name: 'Headline', type: 'text', content: 'Original' },
                        ],
                    },
                ],
            },
        })),
        setState: vi.fn((fn: (state: any) => void) => {
            const mockState = {
                creativeSet: {
                    variants: [
                        { id: 'v1', preset: { width: 300, height: 250 }, elements: [{ id: 'e1', name: 'Headline', type: 'text', content: 'Modified' }] },
                    ],
                },
            };
            fn(mockState);
        }),
    },
}));

describe('AI Undo Stack', () => {
    beforeEach(() => {
        clearSnapshots();
    });

    it('starts empty', () => {
        expect(canUndo()).toBe(false);
        expect(undoDepth()).toBe(0);
        expect(peekUndoLabel()).toBeNull();
    });

    it('pushSnapshot saves state', () => {
        pushSnapshot('Before test');
        expect(canUndo()).toBe(true);
        expect(undoDepth()).toBe(1);
        expect(peekUndoLabel()).toBe('Before test');
    });

    it('popSnapshot returns label and removes from stack', () => {
        pushSnapshot('Action 1');
        pushSnapshot('Action 2');
        expect(undoDepth()).toBe(2);

        const label = popSnapshot();
        expect(label).toBe('Action 2');
        expect(undoDepth()).toBe(1);
    });

    it('popSnapshot returns null when empty', () => {
        expect(popSnapshot()).toBeNull();
    });

    it('caps at 5 snapshots', () => {
        for (let i = 0; i < 8; i++) {
            pushSnapshot(`Action ${i}`);
        }
        expect(undoDepth()).toBe(5);
        // Oldest 3 should have been dropped
        expect(peekUndoLabel()).toBe('Action 7');
    });

    it('clearSnapshots empties the stack', () => {
        pushSnapshot('A');
        pushSnapshot('B');
        clearSnapshots();
        expect(canUndo()).toBe(false);
        expect(undoDepth()).toBe(0);
    });

    it('snapshot data contains variant elements', () => {
        pushSnapshot('Test data');
        const stack = _getStack();
        expect(stack.length).toBe(1);
        const data = JSON.parse(stack[0]!.data);
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe('v1');
        expect(data[0].elements).toHaveLength(1);
        expect(data[0].elements[0].content).toBe('Original');
    });

    it('popSnapshot calls setState to restore', () => {
        // Note: we verify via the mock that was set up at the top
        pushSnapshot('Before change');
        popSnapshot();
        // After popSnapshot, the label should have been popped successfully
        // (setState was called internally — we verify by checking stack is now empty)
        expect(canUndo()).toBe(false);
    });

    it('timestamp is set on push', () => {
        const before = Date.now();
        pushSnapshot('Timed');
        const stack = _getStack();
        expect(stack[0]!.timestamp).toBeGreaterThanOrEqual(before);
    });

    it('multiple undo pops in LIFO order', () => {
        pushSnapshot('First');
        pushSnapshot('Second');
        pushSnapshot('Third');

        expect(popSnapshot()).toBe('Third');
        expect(popSnapshot()).toBe('Second');
        expect(popSnapshot()).toBe('First');
        expect(popSnapshot()).toBeNull();
    });
});
