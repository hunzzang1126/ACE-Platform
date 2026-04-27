// ─────────────────────────────────────────────────
// agentFlowStoreSync.test.ts — Store sync regression tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ★ Must use vi.hoisted for variables used inside vi.mock factory
const { mockSetState, mockGetState } = vi.hoisted(() => ({
    mockSetState: vi.fn(),
    mockGetState: vi.fn(() => ({
        creativeSet: {
            id: 'test-cs',
            masterVariantId: 'v1',
            variants: [
                { id: 'v1', preset: { width: 300, height: 250 }, elements: [] },
            ],
        },
    })),
}));

vi.mock('@/stores/designStore', () => ({
    useDesignStore: {
        getState: mockGetState,
        setState: mockSetState,
    },
}));

vi.mock('uuid', () => ({ v4: () => `test-${Math.random().toString(36).slice(2, 8)}` }));
vi.mock('@/engine/constraintUtils', () => ({
    absoluteToConstraints: (x: number, y: number, w: number, h: number) => ({
        horizontal: { type: 'left', offset: x },
        vertical: { type: 'top', offset: y },
        width: { type: 'fixed', value: w },
        height: { type: 'fixed', value: h },
    }),
}));

import { syncElementsToStore } from './agentFlowStoreSync';
import type { RenderElement } from '@/services/autoDesignTypes';

const palette = {
    gradientStart: '#6366F1',
    gradientEnd: '#2DD4BF',
    typography: { primaryFont: 'Inter', secondaryFont: 'Outfit' },
};

function extractElements(setState: ReturnType<typeof vi.fn>) {
    const updater = setState.mock.calls[0][0];
    const state = {
        creativeSet: { variants: [{ id: 'v1', elements: [] as any[] }] },
    };
    updater(state);
    return state.creativeSet.variants[0].elements;
}

describe('agentFlowStoreSync', () => {
    beforeEach(() => {
        mockSetState.mockClear();
    });

    it('should sync text elements with correct properties', () => {
        const elements: RenderElement[] = [
            {
                name: 'headline', type: 'text' as any,
                x: 50, y: 80, w: 200, h: 40,
                content: 'Hello World', font_size: 32, font_weight: '700',
                font_family: 'Inter', color_hex: '#FFFFFF', text_align: 'center',
            },
        ];

        syncElementsToStore(elements, 300, 250, palette);
        const els = extractElements(mockSetState);
        expect(els).toHaveLength(1);
        expect(els[0].type).toBe('text');
        expect(els[0].content).toBe('Hello World');
        expect(els[0].color).toBe('#FFFFFF');
        expect(els[0].fontSize).toBe(32);
    });

    it('★ REGRESSION: CTA button should preserve float RGB color (not #333333)', () => {
        // CTA buttons from Carbon use float RGB (0-1 range), NOT gradient_start_hex.
        // Previously, ALL non-gradient shapes were saved as fill='#333333' — CTA turned black.
        const elements: RenderElement[] = [
            {
                name: 'cta_button', type: 'rounded_rect' as any,
                x: 80, y: 180, w: 140, h: 44,
                r: 0.39, g: 0.40, b: 0.95, a: 1,
                radius: 22,
            },
        ];

        syncElementsToStore(elements, 300, 250, palette);
        const els = extractElements(mockSetState);
        const el = els[0];
        expect(el.type).toBe('shape');
        // Must NOT be #333333 (the old hardcoded default)
        expect(el.fill).not.toBe('#333333');
        // Should be blue: 0.39*255≈99(0x63), 0.40*255≈102(0x66), 0.95*255≈242(0xf2)
        expect(el.fill).toBe('#6366f2');
    });

    it('should preserve gradient colors for gradient shapes', () => {
        const elements: RenderElement[] = [
            {
                name: 'background', type: 'rect' as any,
                x: 0, y: 0, w: 300, h: 250,
                gradient_start_hex: '#6366F1', gradient_end_hex: '#2DD4BF', gradient_angle: 135,
            },
        ];

        syncElementsToStore(elements, 300, 250, palette);
        const els = extractElements(mockSetState);
        expect(els[0].fill).toBe('#6366F1');
        expect(els[0].gradientStart).toBe('#6366F1');
        expect(els[0].gradientEnd).toBe('#2DD4BF');
    });

    it('should handle image elements with src', () => {
        const elements: RenderElement[] = [
            { name: 'ai_background', type: 'image' as any, x: 0, y: 0, w: 300, h: 250, src: 'https://example.com/bg.jpg' } as any,
        ];

        syncElementsToStore(elements, 300, 250, palette);
        const els = extractElements(mockSetState);
        expect(els[0].type).toBe('image');
        expect(els[0].src).toBe('https://example.com/bg.jpg');
        expect(els[0].role).toBe('background');
    });

    it('should preserve overlay opacity (text_overlay a=0.35)', () => {
        const elements: RenderElement[] = [
            { name: 'text_overlay', type: 'rect' as any, x: 10, y: 20, w: 280, h: 200, r: 0, g: 0, b: 0, a: 0.35, radius: 6 },
        ];

        syncElementsToStore(elements, 300, 250, palette);
        const els = extractElements(mockSetState);
        expect(els[0].opacity).toBe(0.35);
        expect(els[0].fill).toBe('#000000');
    });

    it('should assign z-indices in order', () => {
        const elements: RenderElement[] = [
            { name: 'bg', type: 'rect' as any, x: 0, y: 0, w: 300, h: 250, gradient_start_hex: '#111', gradient_end_hex: '#222' },
            { name: 'headline', type: 'text' as any, x: 50, y: 80, w: 200, h: 40, content: 'Hi', font_size: 24, color_hex: '#FFF' },
        ];

        syncElementsToStore(elements, 300, 250, palette);
        const els = extractElements(mockSetState);
        expect(els[0].zIndex).toBe(0);
        expect(els[1].zIndex).toBe(1);
    });
});
