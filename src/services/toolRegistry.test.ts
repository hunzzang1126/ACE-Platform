// ─────────────────────────────────────────────────
// toolRegistry.test.ts — Tool Registry & Scene Graph Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { ALL_TOOLS, getToolSchemas, getToolSummary, findTool, executeTool } from '@/services/toolRegistry';
import { buildSceneGraph } from '@/services/sceneGraphBuilder';
import type { ToolContext } from '@/services/tools/toolTypes';
import type { BannerVariant } from '@/schema/design.types';

// ── Tool Registry Tests ──

describe('toolRegistry — ALL_TOOLS', () => {
    it('has 33 total tools', () => {
        expect(ALL_TOOLS.length).toBe(33);
    });

    it('all tools have unique names', () => {
        const names = ALL_TOOLS.map(t => t.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
    });

    it('every tool has name, category, description, inputSchema, execute', () => {
        for (const tool of ALL_TOOLS) {
            expect(tool.name).toBeTruthy();
            expect(tool.category).toBeTruthy();
            expect(tool.description).toBeTruthy();
            expect(tool.inputSchema).toBeDefined();
            expect(typeof tool.execute).toBe('function');
        }
    });

    it('covers all 7 categories', () => {
        const categories = new Set(ALL_TOOLS.map(t => t.category));
        expect(categories).toContain('read');
        expect(categories).toContain('create');
        expect(categories).toContain('modify');
        expect(categories).toContain('structure');
        expect(categories).toContain('analyze');
        expect(categories).toContain('sizing');
        expect(categories).toContain('export');
    });
});

describe('toolRegistry — getToolSchemas', () => {
    it('returns Claude-compatible schemas for all tools', () => {
        const schemas = getToolSchemas();
        expect(schemas.length).toBe(33);
        for (const s of schemas) {
            expect(s.name).toBeTruthy();
            expect(s.description).toBeTruthy();
            expect(s.input_schema).toBeDefined();
        }
    });
});

describe('toolRegistry — getToolSummary', () => {
    it('returns correct counts per category', () => {
        const summary = getToolSummary();
        expect(summary.read).toBe(5);
        expect(summary.create).toBe(6);
        expect(summary.modify).toBe(8);
        expect(summary.structure).toBe(4);
        expect(summary.analyze).toBe(4);
        expect(summary.sizing).toBe(4);
        expect(summary.export).toBe(2);
        expect(summary.total).toBe(33);
    });
});

describe('toolRegistry — findTool', () => {
    it('finds existing tool by name', () => {
        const tool = findTool('get_page_tree');
        expect(tool).toBeDefined();
        expect(tool!.category).toBe('read');
    });

    it('returns undefined for unknown tool', () => {
        expect(findTool('nonexistent_tool')).toBeUndefined();
    });
});

describe('toolRegistry — executeTool', () => {
    it('returns error for unknown tool', async () => {
        const ctx = {} as ToolContext;
        const result = await executeTool('fake_tool', {}, ctx);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Unknown tool');
    });

    it('executes getCanvasBounds tool', async () => {
        const ctx: ToolContext = {
            canvasW: 300,
            canvasH: 250,
            activeCreativeSetId: null,
            activeVariantId: null,
            brandKit: null,
            designActions: {} as ToolContext['designActions'],
            editorActions: {} as ToolContext['editorActions'],
        };
        const result = await executeTool('get_canvas_bounds', {}, ctx);
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('width', 300);
        expect(result.data).toHaveProperty('height', 250);
    });

    it('executes analyzeColors with no elements', async () => {
        const ctx: ToolContext = {
            canvasW: 300, canvasH: 250,
            activeCreativeSetId: 'cs1',
            activeVariantId: 'v1',
            brandKit: null,
            designActions: {
                getCreativeSet: () => ({
                    id: 'cs1', name: 'Test', masterVariantId: 'v1',
                    variants: [{ id: 'v1', preset: { width: 300, height: 250 }, elements: [] }],
                }),
            } as unknown as ToolContext['designActions'],
            editorActions: {} as ToolContext['editorActions'],
        };
        const result = await executeTool('analyze_colors', {}, ctx);
        expect(result.success).toBe(true);
    });
});

// ── Scene Graph Tests ──

describe('sceneGraphBuilder — buildSceneGraph', () => {
    function makeVariant(elements: unknown[]): BannerVariant {
        return {
            id: 'v1',
            preset: { id: 'p1', name: 'Test', width: 300, height: 250, category: 'display' },
            elements: elements as BannerVariant['elements'],
            backgroundColor: '#ffffff',
            overriddenElementIds: [],
            syncLocked: false,
        };
    }

    function makeShape(id: string, name: string, x: number, y: number, w: number, h: number, fill: string) {
        return {
            id, name, type: 'shape', shapeType: 'rectangle', fill,
            constraints: {
                horizontal: { anchor: 'left', offset: x },
                vertical: { anchor: 'top', offset: y },
                size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
                rotation: 0,
            },
            opacity: 1, visible: true, locked: false, zIndex: 0,
        };
    }

    function makeText(id: string, name: string, x: number, y: number, w: number, h: number) {
        return {
            id, name, type: 'text', content: 'Hello',
            fontFamily: 'Inter', fontSize: 24, fontWeight: 700,
            fontStyle: 'normal', color: '#ffffff', textAlign: 'left',
            lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
            constraints: {
                horizontal: { anchor: 'left', offset: x },
                vertical: { anchor: 'top', offset: y },
                size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
                rotation: 0,
            },
            opacity: 1, visible: true, locked: false, zIndex: 1,
        };
    }

    it('returns correct canvas dimensions', () => {
        const sg = buildSceneGraph(makeVariant([]));
        expect(sg.canvas.width).toBe(300);
        expect(sg.canvas.height).toBe(250);
    });

    it('converts elements to scene nodes with bounds', () => {
        const sg = buildSceneGraph(makeVariant([
            makeShape('s1', 'Background', 0, 0, 300, 250, '#0a0e1a'),
        ]));
        expect(sg.elements).toHaveLength(1);
        expect(sg.elements[0].bounds).toEqual({ x: 0, y: 0, w: 300, h: 250 });
        expect(sg.elements[0].style.fill).toBe('#0a0e1a');
    });

    it('detects overlapping elements', () => {
        const sg = buildSceneGraph(makeVariant([
            makeShape('s1', 'BG', 0, 0, 300, 250, '#000'),
            makeText('t1', 'Title', 10, 10, 200, 40),
        ]));
        expect(sg.relationships).toHaveLength(2);
        // BG overlaps Title, Title overlaps BG
        const bgRel = sg.relationships.find(r => r.elementName === 'BG');
        expect(bgRel!.overlaps).toContain('Title');
    });

    it('detects containment', () => {
        const sg = buildSceneGraph(makeVariant([
            makeShape('s1', 'Container', 0, 0, 300, 250, '#000'),
            makeShape('s2', 'Inner', 50, 50, 100, 100, '#fff'),
        ]));
        const innerRel = sg.relationships.find(r => r.elementName === 'Inner');
        expect(innerRel!.containedBy).toBe('Container');
    });

    it('computes edge distances', () => {
        const sg = buildSceneGraph(makeVariant([
            makeShape('s1', 'Box', 20, 30, 100, 80, '#000'),
        ]));
        const rel = sg.relationships[0];
        expect(rel.distanceToEdge.top).toBe(30);
        expect(rel.distanceToEdge.left).toBe(20);
        expect(rel.distanceToEdge.right).toBe(180); // 300 - 120
        expect(rel.distanceToEdge.bottom).toBe(140); // 250 - 110
    });

    it('extracts color tokens', () => {
        const sg = buildSceneGraph(makeVariant([
            makeShape('s1', 'BG', 0, 0, 300, 250, '#0a0e1a'),
            makeText('t1', 'Title', 10, 10, 200, 40),
        ]));
        expect(sg.tokens.colors.length).toBeGreaterThan(0);
        expect(sg.tokens.colors[0].hex).toBeTruthy();
    });

    it('extracts font tokens', () => {
        const sg = buildSceneGraph(makeVariant([
            makeText('t1', 'Title', 10, 10, 200, 40),
        ]));
        expect(sg.tokens.fonts).toHaveLength(1);
        expect(sg.tokens.fonts[0].family).toBe('Inter');
        expect(sg.tokens.fonts[0].sizes).toContain(24);
    });

    it('handles empty elements gracefully', () => {
        const sg = buildSceneGraph(makeVariant([]));
        expect(sg.elements).toHaveLength(0);
        expect(sg.relationships).toHaveLength(0);
        expect(sg.tokens.colors).toHaveLength(0);
    });
});
