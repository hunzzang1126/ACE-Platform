// ─────────────────────────────────────────────────
// designElementCreators.test.ts — Element creation handler tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddElementToMaster = vi.fn();
const mockState: any = {
    creativeSet: {
        masterVariantId: 'v-1',
        variants: [{
            id: 'v-1',
            preset: { width: 300, height: 250 },
            elements: [] as any[],
        }],
    },
    addElementToMaster: mockAddElementToMaster,
};

vi.mock('@/stores/designStore', () => ({
    useDesignStore: {
        getState: () => mockState,
        setState: (fn: any) => {
            if (typeof fn === 'function') {
                // Simulate immer — capture mutator to extract all new elements
                const draft = JSON.parse(JSON.stringify(mockState));
                fn(draft);
                const variants = draft.creativeSet?.variants;
                const originalLen = mockState.creativeSet.variants[0].elements.length;
                if (variants?.[0]?.elements?.length > originalLen) {
                    for (let i = originalLen; i < variants[0].elements.length; i++) {
                        mockAddElementToMaster(variants[0].elements[i]);
                    }
                }
            }
        },
    },
}));

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

vi.mock('@/hooks/useAnimationPresets', () => ({
    useAnimPresetStore: {
        getState: () => ({
            setPreset: vi.fn(),
            presets: [],
        }),
    },
}));

import { handleAddText, handleAddShape, handleAddButton, handleSetAnimation } from './designElementCreators';

describe('designElementCreators', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockState.creativeSet.variants[0].elements = [];
    });

    // ── handleAddText ──
    describe('handleAddText', () => {
        it('should fail without creative set', () => {
            const saved = mockState.creativeSet;
            mockState.creativeSet = null as any;
            const result = handleAddText({ content: 'Hello' });
            expect(result.success).toBe(false);
            mockState.creativeSet = saved;
        });

        it('should create text element with defaults', () => {
            const result = handleAddText({ content: 'Hello World' });
            expect(result.success).toBe(true);
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'text',
                    content: 'Hello World',
                    fontFamily: 'Inter',
                }),
            );
        });

        it('should skip duplicate text content', () => {
            mockState.creativeSet.variants[0].elements = [
                { type: 'text', content: 'Hello World', constraints: {} },
            ];
            const result = handleAddText({ content: 'Hello World' });
            expect(result.success).toBe(true);
            expect(result.message).toContain('skip duplicate');
            expect(mockAddElementToMaster).not.toHaveBeenCalled();
        });

        it('should use custom font params', () => {
            handleAddText({ content: 'X', fontSize: 48, fontWeight: 800, fontFamily: 'Roboto', color: '#ff0000' });
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({
                    fontSize: 48,
                    fontWeight: 800,
                    fontFamily: 'Roboto',
                    color: '#ff0000',
                }),
            );
        });

        it('should set role when provided', () => {
            handleAddText({ content: 'Title', role: 'headline' });
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'headline' }),
            );
        });
    });

    // ── handleAddShape ──
    describe('handleAddShape', () => {
        it('should fail without creative set', () => {
            const saved = mockState.creativeSet;
            mockState.creativeSet = null as any;
            const result = handleAddShape({ shapeType: 'rectangle' });
            expect(result.success).toBe(false);
            mockState.creativeSet = saved;
        });

        it('should create shape element', () => {
            const result = handleAddShape({ shapeType: 'rectangle', fill: '#ff6b35' });
            expect(result.success).toBe(true);
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'shape',
                    shapeType: 'rectangle',
                    fill: '#ff6b35',
                }),
            );
        });

        it('should default fill to #333333', () => {
            handleAddShape({});
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ fill: '#333333' }),
            );
        });

        it('should set role for background shapes', () => {
            handleAddShape({ role: 'background', fill: '#000' });
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'background' }),
            );
        });
    });

    // ── handleAddButton ──
    // Note: handleAddButton creates a shape (bg) + text combo, not a single 'button' type
    describe('handleAddButton', () => {
        it('should fail without creative set', () => {
            const saved = mockState.creativeSet;
            mockState.creativeSet = null as any;
            const result = handleAddButton({ text: 'Click' });
            expect(result.success).toBe(false);
            mockState.creativeSet = saved;
        });

        it('should create shape bg + text elements', () => {
            const result = handleAddButton({ text: 'Buy Now' });
            expect(result.success).toBe(true);
            // Creates 2 elements: shape bg + text label
            expect(mockAddElementToMaster).toHaveBeenCalledTimes(2);
            // First call = shape background
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'shape', shapeType: 'rectangle' }),
            );
            // Second call = text content
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'text', content: 'Buy Now' }),
            );
        });

        it('should default to gold background', () => {
            handleAddButton({});
            expect(mockAddElementToMaster).toHaveBeenCalledWith(
                expect.objectContaining({ fill: '#c9a84c' }),
            );
        });
    });

    // ── handleSetAnimation ──
    describe('handleSetAnimation', () => {
        it('should fail without creative set', () => {
            const saved = mockState.creativeSet;
            mockState.creativeSet = null as any;
            const result = handleSetAnimation({ elementId: 'el-1', preset: 'fadeIn' });
            expect(result.success).toBe(false);
            mockState.creativeSet = saved;
        });
    });
});
