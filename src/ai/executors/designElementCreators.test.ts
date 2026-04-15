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

import { handleAddText, handleAddShape, handleAddButton, handleSetAnimation, enforceSemanticZOrder } from './designElementCreators';

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

// ── enforceSemanticZOrder ──
describe('enforceSemanticZOrder', () => {
    it('should place background at the bottom (z=0)', () => {
        const els = [
            { name: 'headline', type: 'text', zIndex: 0 },
            { name: 'background', type: 'shape', zIndex: 1 },
        ];
        enforceSemanticZOrder(els);
        expect(els.find(e => e.name === 'background')!.zIndex).toBe(0);
        expect(els.find(e => e.name === 'headline')!.zIndex).toBe(1);
    });

    it('★ REGRESSION: CTA text must be above CTA button bg', () => {
        const els = [
            { name: 'background', type: 'shape', zIndex: 0 },
            { name: 'headline', type: 'text', zIndex: 1 },
            { name: 'cta_button', type: 'shape', zIndex: 3 },  // BUG: was above text
            { name: 'cta_label', type: 'text', zIndex: 2 },    // BUG: was below shape
        ];
        enforceSemanticZOrder(els);
        const ctaBg = els.find(e => e.name === 'cta_button')!;
        const ctaLabel = els.find(e => e.name === 'cta_label')!;
        expect(ctaLabel.zIndex).toBeGreaterThan(ctaBg.zIndex);
    });

    it('should place badges/tags at the top', () => {
        const els = [
            { name: 'background', type: 'shape', zIndex: 0 },
            { name: 'tag_text', type: 'text', zIndex: 1, role: 'tag' },
            { name: 'headline', type: 'text', zIndex: 2 },
        ];
        enforceSemanticZOrder(els);
        const tag = els.find(e => e.name === 'tag_text')!;
        const headline = els.find(e => e.name === 'headline')!;
        expect(tag.zIndex).toBeGreaterThan(headline.zIndex);
    });

    it('should handle full design layer stack correctly', () => {
        const els = [
            { name: 'cta_label', type: 'text', zIndex: 0 },
            { name: 'accent_bar', type: 'shape', zIndex: 1 },
            { name: 'cta_button', type: 'shape', zIndex: 2 },
            { name: 'headline', type: 'text', zIndex: 3 },
            { name: 'background', type: 'shape', zIndex: 4 },
            { name: 'tag_badge', type: 'text', zIndex: 5 },
        ];
        enforceSemanticZOrder(els);
        // Expected order: background(0) → accent(1) → headline(2) → cta_button(3) → cta_label(4) → tag(5)
        expect(els.find(e => e.name === 'background')!.zIndex).toBe(0);
        expect(els.find(e => e.name === 'accent_bar')!.zIndex).toBe(1);
        expect(els.find(e => e.name === 'headline')!.zIndex).toBe(2);
        expect(els.find(e => e.name === 'cta_button')!.zIndex).toBe(3);
        expect(els.find(e => e.name === 'cta_label')!.zIndex).toBe(4);
        expect(els.find(e => e.name === 'tag_badge')!.zIndex).toBe(5);
    });

    it('should handle empty array without error', () => {
        const els: { name: string; type: string; zIndex: number }[] = [];
        enforceSemanticZOrder(els);
        expect(els).toHaveLength(0);
    });

    it('should detect role-based background elements', () => {
        const els = [
            { name: 'Rectangle #1', type: 'shape', zIndex: 1, role: 'background' },
            { name: 'Title', type: 'text', zIndex: 0 },
        ];
        enforceSemanticZOrder(els);
        expect(els.find(e => e.name === 'Rectangle #1')!.zIndex).toBe(0);
        expect(els.find(e => e.name === 'Title')!.zIndex).toBe(1);
    });
});

