// ─────────────────────────────────────────────────
// agentSceneAnalysis.test.ts — Scene analysis pure functions
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/stores/designStore', () => ({
    useDesignStore: { getState: () => ({ creativeSet: null }) },
}));

import {
    detectSpatialRelations,
    resolveMention,
    inferDesignIntent,
} from './agentSceneAnalysis';
import type { SceneNodeInfo } from './agentContext';

const makeNode = (id: number, name: string, type: SceneNodeInfo['type'], x: number, y: number, w: number, h: number): SceneNodeInfo => ({
    id, type, x, y, width: w, height: h,
    color: '#ff0000', opacity: 1, zIndex: id, label: name,
    effects: { hasShadow: false, brightness: 1, contrast: 1, saturation: 1, hueRotate: 0, blendMode: 'normal' },
    animations: [],
});

describe('detectSpatialRelations', () => {
    it('returns empty for empty nodes', () => {
        expect(detectSpatialRelations([])).toEqual([]);
    });

    it('detects overlap between overlapping nodes', () => {
        const nodes = [
            makeNode(1, 'A', 'rect', 0, 0, 100, 100),
            makeNode(2, 'B', 'rect', 50, 50, 100, 100),
        ];
        const rels = detectSpatialRelations(nodes);
        const hasOverlap = rels.some(r => r.relation === 'overlapping');
        expect(hasOverlap).toBe(true);
    });

    it('does not detect overlap for distant nodes', () => {
        const nodes = [
            makeNode(1, 'A', 'rect', 0, 0, 50, 50),
            makeNode(2, 'B', 'rect', 200, 200, 50, 50),
        ];
        const rels = detectSpatialRelations(nodes);
        const hasOverlap = rels.some(r => r.relation === 'overlapping');
        expect(hasOverlap).toBe(false);
    });

    it('detects aligned_h for horizontally aligned nodes', () => {
        const nodes = [
            makeNode(1, 'A', 'rect', 0, 50, 100, 100),
            makeNode(2, 'B', 'rect', 200, 50, 100, 100),
        ];
        const rels = detectSpatialRelations(nodes);
        const hasAligned = rels.some(r => r.relation === 'aligned_h');
        expect(hasAligned).toBe(true);
    });
});

describe('resolveMention', () => {
    const nodes = [
        makeNode(1, 'Headline', 'text', 0, 0, 200, 40),
        makeNode(2, 'CTA Button', 'rect', 0, 100, 120, 40),
        makeNode(3, 'Background', 'rect', 0, 0, 300, 250),
    ];

    it('resolves by exact name', () => {
        expect(resolveMention('Headline', nodes)).toBe(1);
    });

    it('resolves case-insensitive', () => {
        expect(resolveMention('headline', nodes)).toBe(1);
    });

    it('returns null for no match', () => {
        expect(resolveMention('nonexistent', nodes)).toBeNull();
    });
});

describe('inferDesignIntent', () => {
    it('returns empty canvas message', () => {
        expect(inferDesignIntent([])).toContain('Empty canvas');
    });

    it('returns single element message', () => {
        const nodes = [makeNode(1, 'Logo', 'rect', 0, 0, 50, 50)];
        expect(inferDesignIntent(nodes)).toContain('Single element');
    });

    it('detects horizontal row', () => {
        const nodes = [
            makeNode(1, 'A', 'rect', 0, 50, 80, 40),
            makeNode(2, 'B', 'rect', 100, 50, 80, 40),
            makeNode(3, 'C', 'rect', 200, 50, 80, 40),
        ];
        expect(inferDesignIntent(nodes)).toContain('Horizontal row');
    });

    it('detects vertical column', () => {
        const nodes = [
            makeNode(1, 'A', 'rect', 50, 0, 80, 40),
            makeNode(2, 'B', 'rect', 50, 60, 80, 40),
            makeNode(3, 'C', 'rect', 50, 120, 80, 40),
        ];
        expect(inferDesignIntent(nodes)).toContain('Vertical column');
    });

    it('detects grid layout', () => {
        const nodes = [
            makeNode(1, 'A', 'rect', 0, 0, 50, 50),
            makeNode(2, 'B', 'rect', 100, 0, 50, 50),
            makeNode(3, 'C', 'rect', 200, 0, 50, 50),
            makeNode(4, 'D', 'rect', 0, 100, 50, 50),
            makeNode(5, 'E', 'rect', 100, 100, 50, 50),
            makeNode(6, 'F', 'rect', 200, 100, 50, 50),
            makeNode(7, 'G', 'rect', 0, 200, 50, 50),
            makeNode(8, 'H', 'rect', 100, 200, 50, 50),
            makeNode(9, 'I', 'rect', 200, 200, 50, 50),
        ];
        expect(inferDesignIntent(nodes)).toContain('Grid');
    });

    it('detects freeform layout', () => {
        const nodes = [
            makeNode(1, 'A', 'rect', 10, 20, 50, 50),
            makeNode(2, 'B', 'rect', 150, 80, 50, 50),
        ];
        expect(inferDesignIntent(nodes)).toContain('Freeform');
    });
});
