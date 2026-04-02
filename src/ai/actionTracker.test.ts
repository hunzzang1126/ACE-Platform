// ─────────────────────────────────────────────────
// actionTracker.test.ts — User action tracking tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Capture subscribe callbacks ──
const editorSubscribers: Array<(state: any, prevState: any) => void> = [];
const designState = {
    creativeSet: {
        masterVariantId: 'v-1',
        variants: [{
            id: 'v-1',
            elements: [
                { id: 'el-1', name: 'Headline', type: 'text' },
                { id: 'el-2', name: 'Background', type: 'shape' },
            ],
        }],
    },
};

vi.mock('@/stores/editorStore', () => ({
    useEditorStore: {
        subscribe: (fn: (state: any, prev: any) => void) => {
            editorSubscribers.push(fn);
            return () => {};
        },
    },
}));

vi.mock('@/stores/designStore', () => ({
    useDesignStore: { getState: () => designState },
}));

const mockPushLastTouched = vi.fn();
const mockPushAction = vi.fn();

vi.mock('@/ai/smartContextBuilder', () => ({
    pushLastTouched: (...args: any[]) => mockPushLastTouched(...args),
    pushAction: (...args: any[]) => mockPushAction(...args),
}));

// Reset initialization state between tests
let trackerModule: typeof import('./actionTracker');

describe('actionTracker', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        editorSubscribers.length = 0;
        // Re-import to reset _initialized
        vi.resetModules();
        trackerModule = await import('./actionTracker');
    });

    describe('initActionTracker', () => {
        it('should subscribe to editorStore on first call', () => {
            trackerModule.initActionTracker();
            expect(editorSubscribers.length).toBe(1);
        });

        it('should not subscribe twice on repeated calls', () => {
            trackerModule.initActionTracker();
            trackerModule.initActionTracker();
            expect(editorSubscribers.length).toBe(1);
        });
    });

    describe('selection tracking', () => {
        beforeEach(() => {
            trackerModule.initActionTracker();
        });

        it('should push action when element is selected', () => {
            const subscriber = editorSubscribers[0]!;
            subscriber(
                { selectedElementIds: ['el-1'] },
                { selectedElementIds: [] },
            );
            expect(mockPushAction).toHaveBeenCalledWith(
                expect.stringContaining('Headline'),
            );
            expect(mockPushLastTouched).toHaveBeenCalledWith(
                'Headline', 0, 'user-selected',
            );
        });

        it('should not fire when selection array is same reference', () => {
            const subscriber = editorSubscribers[0]!;
            const sameIds = ['el-1'];
            subscriber(
                { selectedElementIds: sameIds },
                { selectedElementIds: sameIds },
            );
            expect(mockPushAction).not.toHaveBeenCalled();
        });

        it('should not fire when deselecting (empty array)', () => {
            const subscriber = editorSubscribers[0]!;
            subscriber(
                { selectedElementIds: [] },
                { selectedElementIds: ['el-1'] },
            );
            expect(mockPushAction).not.toHaveBeenCalled();
        });

        it('should track multiple newly selected elements', () => {
            const subscriber = editorSubscribers[0]!;
            subscriber(
                { selectedElementIds: ['el-1', 'el-2'] },
                { selectedElementIds: [] },
            );
            expect(mockPushAction).toHaveBeenCalledTimes(2);
            expect(mockPushLastTouched).toHaveBeenCalledTimes(2);
        });

        it('should not re-track already selected elements', () => {
            const subscriber = editorSubscribers[0]!;
            subscriber(
                { selectedElementIds: ['el-1', 'el-2'] },
                { selectedElementIds: ['el-1'] },
            );
            // Only el-2 is newly selected
            expect(mockPushAction).toHaveBeenCalledTimes(1);
            expect(mockPushAction).toHaveBeenCalledWith(
                expect.stringContaining('Background'),
            );
        });

        it('should include element type in pushed action', () => {
            const subscriber = editorSubscribers[0]!;
            subscriber(
                { selectedElementIds: ['el-1'] },
                { selectedElementIds: [] },
            );
            expect(mockPushAction).toHaveBeenCalledWith(
                expect.stringContaining('text'),
            );
        });
    });
});
