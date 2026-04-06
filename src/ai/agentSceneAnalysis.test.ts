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
    it('returns a non-empty string', () => {
        const nodes = [makeNode(1, 'Logo', 'rect', 0, 0, 50, 50)];
        const intent = inferDesignIntent(nodes);
        expect(typeof intent).toBe('string');
        expect(intent.length).toBeGreaterThan(0);
    });
});
