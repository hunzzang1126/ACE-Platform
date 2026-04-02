// ─────────────────────────────────────────────────
// sceneGraphBuilder.test.ts — Scene graph construction tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/schema/constraints.types', () => ({
    resolveConstraints: vi.fn((c: any) => ({
        x: c?.horizontal?.offset ?? 0,
        y: c?.vertical?.offset ?? 0,
        width: c?.size?.width ?? 100,
        height: c?.size?.height ?? 50,
    })),
}));

import { buildSceneGraph } from './sceneGraphBuilder';
import type { SceneGraph } from './sceneGraphBuilder';
import type { BannerVariant } from '@/schema/design.types';

function makeVariant(elements: any[]): BannerVariant {
    return {
        id: 'v-1',
        preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'banner' },
        elements,
        locales: {},
    } as BannerVariant;
}

const baseElements = [
    { id: 'bg', name: 'Background', type: 'shape', role: 'background', fill: '#0a0e1a', borderRadius: 0, opacity: 1, visible: true, locked: false, zIndex: 0, constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 300, height: 250 } } },
    { id: 'hl', name: 'Headline', type: 'text', role: 'headline', color: '#ffffff', fontFamily: 'Inter', fontSize: 28, fontWeight: 700, opacity: 1, visible: true, locked: false, zIndex: 2, constraints: { horizontal: { anchor: 'left', offset: 20 }, vertical: { anchor: 'top', offset: 30 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 260, height: 40 } } },
    { id: 'cta', name: 'CTA', type: 'button', role: 'cta', backgroundColor: '#ff6b35', color: '#ffffff', fontFamily: 'Inter', fontSize: 14, borderRadius: 8, opacity: 1, visible: true, locked: false, zIndex: 3, constraints: { horizontal: { anchor: 'left', offset: 90 }, vertical: { anchor: 'top', offset: 190 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 120, height: 40 } } },
];

describe('sceneGraphBuilder', () => {
    describe('buildSceneGraph', () => {
        it('should return canvas dimensions', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            expect(sg.canvas.width).toBe(300);
            expect(sg.canvas.height).toBe(250);
        });

        it('should convert all elements to scene nodes', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            expect(sg.elements).toHaveLength(3);
        });

        it('should preserve element metadata', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            const hl = sg.elements.find(n => n.name === 'Headline');
            expect(hl).toBeDefined();
            expect(hl!.role).toBe('headline');
            expect(hl!.type).toBe('text');
            expect(hl!.zIndex).toBe(2);
        });

        it('should compute bounds from constraints', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            const cta = sg.elements.find(n => n.name === 'CTA')!;
            expect(cta.bounds.x).toBe(90);
            expect(cta.bounds.y).toBe(190);
            expect(cta.bounds.w).toBe(120);
            expect(cta.bounds.h).toBe(40);
        });

        it('should extract text style props', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            const hl = sg.elements.find(n => n.name === 'Headline')!;
            expect(hl.style.color).toBe('#ffffff');
            expect(hl.style.fontFamily).toBe('Inter');
            expect(hl.style.fontSize).toBe(28);
        });

        it('should extract shape style props', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            const bg = sg.elements.find(n => n.name === 'Background')!;
            expect(bg.style.fill).toBe('#0a0e1a');
        });

        it('should extract button style props', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            const cta = sg.elements.find(n => n.name === 'CTA')!;
            expect(cta.style.fill).toBe('#ff6b35');
            expect(cta.style.borderRadius).toBe(8);
        });
    });

    describe('relationships', () => {
        it('should compute edge distances', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            const hlRel = sg.relationships.find(r => r.elementName === 'Headline');
            expect(hlRel).toBeDefined();
            expect(hlRel!.distanceToEdge.left).toBe(20);
            expect(hlRel!.distanceToEdge.top).toBe(30);
        });

        it('should detect overlaps', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            // Headline (20,30,260,40) overlaps Background (0,0,300,250)
            const hlRel = sg.relationships.find(r => r.elementName === 'Headline')!;
            expect(hlRel.overlaps).toContain('Background');
        });

        it('should detect containment', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            // Headline is inside Background
            const hlRel = sg.relationships.find(r => r.elementName === 'Headline')!;
            expect(hlRel.containedBy).toBe('Background');
        });
    });

    describe('design tokens', () => {
        it('should extract unique colors', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            expect(sg.tokens.colors.length).toBeGreaterThan(0);
            const whiteToken = sg.tokens.colors.find(c => c.hex === '#ffffff');
            expect(whiteToken).toBeDefined();
        });

        it('should count color frequency', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            const whiteToken = sg.tokens.colors.find(c => c.hex === '#ffffff')!;
            expect(whiteToken.count).toBeGreaterThanOrEqual(2); // Headline + CTA text
        });

        it('should extract font families', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            expect(sg.tokens.fonts.length).toBeGreaterThan(0);
            const inter = sg.tokens.fonts.find(f => f.family === 'Inter');
            expect(inter).toBeDefined();
            expect(inter!.sizes).toContain(28);
        });

        it('should sort colors by frequency', () => {
            const sg = buildSceneGraph(makeVariant(baseElements));
            for (let i = 1; i < sg.tokens.colors.length; i++) {
                expect(sg.tokens.colors[i - 1].count).toBeGreaterThanOrEqual(sg.tokens.colors[i].count);
            }
        });
    });

    describe('edge cases', () => {
        it('should handle empty elements', () => {
            const sg = buildSceneGraph(makeVariant([]));
            expect(sg.elements).toHaveLength(0);
            expect(sg.relationships).toHaveLength(0);
            expect(sg.tokens.colors).toHaveLength(0);
        });

        it('should handle single element', () => {
            const sg = buildSceneGraph(makeVariant([baseElements[0]]));
            expect(sg.elements).toHaveLength(1);
            expect(sg.relationships[0].overlaps).toHaveLength(0);
        });
    });
});
