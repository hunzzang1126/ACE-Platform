// ─────────────────────────────────────────────────
// agentSceneAnalysis.test.ts — Scene extraction, spatial reasoning tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('./agentTools', () => ({
    ALL_TOOLS: [
        { name: 'add_text', description: 'Add text', category: 'create' },
        { name: 'set_color', description: 'Set color', category: 'style' },
    ],
}));
vi.mock('./skillRegistry', () => ({ skillsToPromptSection: vi.fn().mockReturnValue('') }));
vi.mock('./smartContextBuilder', () => ({
    contextToPromptSection: vi.fn().mockReturnValue('## Mock Context'),
}));

import {
    extractSceneNodes,
    buildSceneRAG,
    detectSpatialRelations,
    resolveMention,
    inferDesignIntent,
    buildSystemPrompt,
    buildHealingPrompt,
} from './agentSceneAnalysis';

import type { SceneNodeInfo } from './agentContext';

// ── Node Factory ──

function makeNode(id: number, overrides: Partial<SceneNodeInfo> = {}): SceneNodeInfo {
    return {
        id, type: 'rect', x: 0, y: 0, width: 100, height: 50,
        color: '#ff0000', opacity: 1, zIndex: 0, label: `Element #${id}`,
        effects: { hasShadow: false, brightness: 1, contrast: 1, saturation: 1, hueRotate: 0, blendMode: 'normal' },
        animations: [],
        ...overrides,
    };
}

describe('agentSceneAnalysis', () => {

    // ── extractSceneNodes ──

    describe('extractSceneNodes', () => {
        it('should return empty array when engine has no get_all_nodes', () => {
            expect(extractSceneNodes({})).toEqual([]);
        });

        it('should return empty array when get_all_nodes returns null', () => {
            expect(extractSceneNodes({ get_all_nodes: () => null })).toEqual([]);
        });

        it('should parse JSON from engine', () => {
            const engine = {
                get_all_nodes: () => JSON.stringify([
                    { id: 1, type: 'rect', x: 10, y: 20, w: 100, h: 50, fill_r: 1, fill_g: 0, fill_b: 0, opacity: 0.8 },
                    { id: 2, type: 'text', x: 0, y: 0, w: 200, h: 30, name: 'Headline', content: 'Hello' },
                ]),
            };
            const nodes = extractSceneNodes(engine);
            expect(nodes).toHaveLength(2);
            expect(nodes[0].id).toBe(1);
            expect(nodes[0].type).toBe('rect');
            expect(nodes[0].x).toBe(10);
            expect(nodes[0].color).toContain('#ff0000');
        });

        it('should generate label from content for text nodes', () => {
            const engine = {
                get_all_nodes: () => JSON.stringify([
                    { id: 1, type: 'text', content: 'Buy Now', x: 0, y: 0, w: 100, h: 30 },
                ]),
            };
            const nodes = extractSceneNodes(engine);
            expect(nodes[0].label).toContain('Buy Now');
        });

        it('should handle malformed JSON gracefully', () => {
            const engine = { get_all_nodes: () => 'not json' };
            expect(extractSceneNodes(engine)).toEqual([]);
        });

        it('should convert fill_r/g/b to hex color', () => {
            const engine = {
                get_all_nodes: () => JSON.stringify([
                    { id: 1, fill_r: 0, fill_g: 1, fill_b: 0, x: 0, y: 0, w: 50, h: 50 },
                ]),
            };
            const nodes = extractSceneNodes(engine);
            expect(nodes[0].color).toBe('#00ff00');
        });
    });

    // ── detectSpatialRelations ──

    describe('detectSpatialRelations', () => {
        it('should detect overlapping nodes', () => {
            const nodes = [
                makeNode(1, { x: 0, y: 0, width: 100, height: 100 }),
                makeNode(2, { x: 50, y: 50, width: 100, height: 100 }),
            ];
            const rels = detectSpatialRelations(nodes);
            expect(rels.some(r => r.relation === 'overlapping')).toBe(true);
        });

        it('should detect horizontal alignment', () => {
            const nodes = [
                makeNode(1, { x: 0, y: 50, width: 50, height: 20 }),
                makeNode(2, { x: 100, y: 50, width: 50, height: 20 }),
            ];
            const rels = detectSpatialRelations(nodes);
            expect(rels.some(r => r.relation === 'aligned_h')).toBe(true);
        });

        it('should detect vertical alignment', () => {
            const nodes = [
                makeNode(1, { x: 50, y: 0, width: 50, height: 20 }),
                makeNode(2, { x: 50, y: 50, width: 50, height: 20 }),
            ];
            const rels = detectSpatialRelations(nodes);
            expect(rels.some(r => r.relation === 'aligned_v')).toBe(true);
        });

        it('should detect above/below relations', () => {
            const nodes = [
                makeNode(1, { x: 0, y: 0, width: 100, height: 30 }),
                makeNode(2, { x: 0, y: 50, width: 100, height: 30 }),
            ];
            const rels = detectSpatialRelations(nodes);
            expect(rels.some(r => r.relation === 'above')).toBe(true);
        });

        it('should detect left_of/right_of relations', () => {
            const nodes = [
                makeNode(1, { x: 0, y: 0, width: 50, height: 50 }),
                makeNode(2, { x: 100, y: 0, width: 50, height: 50 }),
            ];
            const rels = detectSpatialRelations(nodes);
            expect(rels.some(r => r.relation === 'left_of')).toBe(true);
        });

        it('should return empty for single node', () => {
            expect(detectSpatialRelations([makeNode(1)])).toEqual([]);
        });

        it('should include distance for positional relations', () => {
            const nodes = [
                makeNode(1, { x: 0, y: 0, width: 50, height: 50 }),
                makeNode(2, { x: 100, y: 0, width: 50, height: 50 }),
            ];
            const rels = detectSpatialRelations(nodes);
            const leftOf = rels.find(r => r.relation === 'left_of');
            expect(leftOf?.distance).toBe(50);
        });
    });

    // ── resolveMention ──

    describe('resolveMention', () => {
        const nodes = [
            makeNode(1, { label: 'Red Circle' }),
            makeNode(2, { label: 'Blue Rectangle', type: 'rect' }),
            makeNode(3, { label: 'Headline Text', type: 'text' }),
        ];

        it('should resolve exact label match', () => {
            expect(resolveMention('Red Circle', nodes)).toBe(1);
        });

        it('should be case-insensitive', () => {
            expect(resolveMention('red circle', nodes)).toBe(1);
        });

        it('should resolve partial match', () => {
            expect(resolveMention('Blue', nodes)).toBe(2);
        });

        it('should resolve by type', () => {
            expect(resolveMention('text', nodes)).toBe(3);
        });

        it('should resolve by numeric ID', () => {
            expect(resolveMention('node 2', nodes)).toBe(2);
        });

        it('should strip @ prefix', () => {
            expect(resolveMention('@Red Circle', nodes)).toBe(1);
        });

        it('should return null for unresolvable mention', () => {
            expect(resolveMention('nonexistent', nodes)).toBeNull();
        });
    });

    // ── inferDesignIntent ──

    describe('inferDesignIntent', () => {
        it('should describe empty canvas', () => {
            expect(inferDesignIntent([])).toContain('Empty canvas');
        });

        it('should describe single element', () => {
            expect(inferDesignIntent([makeNode(1)])).toContain('Single element');
        });

        it('should detect horizontal row', () => {
            const nodes = [
                makeNode(1, { x: 0, y: 50 }),
                makeNode(2, { x: 100, y: 50 }),
                makeNode(3, { x: 200, y: 50 }),
            ];
            expect(inferDesignIntent(nodes)).toContain('Horizontal row');
        });

        it('should detect vertical column', () => {
            const nodes = [
                makeNode(1, { x: 50, y: 0 }),
                makeNode(2, { x: 50, y: 60 }),
                makeNode(3, { x: 50, y: 120 }),
            ];
            expect(inferDesignIntent(nodes)).toContain('Vertical column');
        });

        it('should describe freeform layout', () => {
            const nodes = [
                makeNode(1, { x: 0, y: 0 }),
                makeNode(2, { x: 150, y: 75 }),
            ];
            expect(inferDesignIntent(nodes)).toContain('Freeform');
        });
    });

    // ── buildSceneRAG ──

    describe('buildSceneRAG', () => {
        it('should include canvas state header', () => {
            const engine = { node_count: () => 3, anim_playing: () => false, anim_time: () => 0, anim_duration: () => 2 };
            const result = buildSceneRAG(engine, []);
            expect(result).toContain('Canvas State');
            expect(result).toContain('Total elements: 3');
        });

        it('should list elements when provided', () => {
            const engine = { node_count: () => 1, anim_playing: () => false, anim_time: () => 0, anim_duration: () => 0 };
            const nodes = [makeNode(1, { label: 'My Rect', x: 10, y: 20, width: 100, height: 50 })];
            const result = buildSceneRAG(engine, nodes);
            expect(result).toContain('My Rect');
            expect(result).toContain('id=1');
        });
    });

    // ── buildSystemPrompt ──

    describe('buildSystemPrompt', () => {
        it('should include Glid AI identity', () => {
            const result = buildSystemPrompt({}, []);
            expect(result).toContain('Glid AI');
        });

        it('should mention empty canvas when no nodes', () => {
            const result = buildSystemPrompt({}, []);
            expect(result).toContain('EMPTY');
        });

        it('should mention existing elements when nodes present', () => {
            const result = buildSystemPrompt({}, [makeNode(1)]);
            expect(result).toContain('Canvas has elements');
        });

        it('should include single-round completion rule', () => {
            const result = buildSystemPrompt({}, []);
            expect(result).toContain('SINGLE-ROUND');
        });
    });

    // ── buildHealingPrompt ──

    describe('buildHealingPrompt', () => {
        it('should include canvas dimensions', () => {
            const result = buildHealingPrompt([], [], 300, 250, 65);
            expect(result).toContain('300x250');
        });

        it('should include score', () => {
            const result = buildHealingPrompt([], [], 300, 250, 65);
            expect(result).toContain('65/100');
        });

        it('should list issues', () => {
            const issues = [
                { type: 'overlap', severity: 'error', description: 'Headline overlaps CTA', element: 'Headline' },
            ];
            const result = buildHealingPrompt(issues, [], 300, 250, 65);
            expect(result).toContain('overlap');
            expect(result).toContain('Headline overlaps CTA');
        });

        it('should list scene elements', () => {
            const nodes = [makeNode(1, { label: 'My Element' })];
            const result = buildHealingPrompt([], nodes, 300, 250, 70);
            expect(result).toContain('My Element');
        });

        it('should include healing strategy', () => {
            const result = buildHealingPrompt([], [], 300, 250, 50);
            expect(result).toContain('Healing Strategy');
            expect(result).toContain('overlap');
            expect(result).toContain('contrast');
        });
    });
});
