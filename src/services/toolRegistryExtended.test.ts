// ─────────────────────────────────────────────────
// toolRegistryExtended.test.ts — executeTool, executeBatch, schemas
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import {
    ALL_TOOLS, getToolSchemas, getToolSchemasByCategory,
    findTool, executeTool, executeBatch, getToolSummary,
} from './toolRegistry';
import type { ToolContext } from './tools/toolTypes';

const mockCtx: ToolContext = {
    designStore: { getState: vi.fn().mockReturnValue({ creativeSet: null }) } as any,
    canvasRef: null,
};

describe('toolRegistry — getToolSchemas', () => {
    it('should return schemas for all tools', () => {
        const schemas = getToolSchemas();
        expect(schemas.length).toBe(ALL_TOOLS.length);
        expect(schemas.length).toBeGreaterThan(20);
    });

    it('each schema should have name and input_schema', () => {
        const schemas = getToolSchemas();
        for (const s of schemas) {
            expect(s.name).toBeTruthy();
            expect(s.input_schema).toBeDefined();
        }
    });
});

describe('toolRegistry — getToolSchemasByCategory', () => {
    it('should filter by read category', () => {
        const schemas = getToolSchemasByCategory('read');
        expect(schemas.length).toBeGreaterThan(0);
        // All should be read tools
        for (const s of schemas) {
            const tool = findTool(s.name);
            expect(tool?.category).toBe('read');
        }
    });

    it('should filter by create category', () => {
        const schemas = getToolSchemasByCategory('create');
        expect(schemas.length).toBeGreaterThan(0);
    });

    it('should return empty for unknown category', () => {
        const schemas = getToolSchemasByCategory('nonexistent' as any);
        expect(schemas).toHaveLength(0);
    });
});

describe('toolRegistry — findTool', () => {
    it('should find existing tools', () => {
        expect(findTool('get_page_tree')).toBeDefined();
        expect(findTool('create_shape')).toBeDefined();
        expect(findTool('set_fill')).toBeDefined();
    });

    it('should return undefined for unknown tool', () => {
        expect(findTool('nonexistentTool')).toBeUndefined();
    });
});

describe('toolRegistry — executeTool', () => {
    it('should return error for unknown tool', async () => {
        const result = await executeTool('fakeTool', {}, mockCtx);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Unknown tool');
        expect(result.message).toContain('fakeTool');
    });

    it('should execute existing tool', async () => {
        const result = await executeTool('get_page_tree', {}, mockCtx);
        expect(result).toBeDefined();
    });

    it('should catch tool execution errors', async () => {
        const result = await executeTool('get_node', {}, mockCtx);
        expect(result).toBeDefined();
    });
});

describe('toolRegistry — executeBatch', () => {
    it('should execute multiple operations', async () => {
        const result = await executeBatch([
            { tool: 'get_page_tree', params: {} },
            { tool: 'get_canvas_bounds', params: {} },
        ], mockCtx);
        expect(result.totalOps).toBe(2);
        expect(result.results).toHaveLength(2);
    });

    it('should report failed operations', async () => {
        const result = await executeBatch([
            { tool: 'fakeTool', params: {}, label: 'Bad Op' },
        ], mockCtx);
        expect(result.success).toBe(false);
        expect(result.failed).toBe(1);
        expect(result.message).toContain('Bad Op');
    });

    it('should cap at 25 operations', async () => {
        const ops = Array.from({ length: 30 }, (_, i) => ({
            tool: 'get_page_tree', params: {},
        }));
        const result = await executeBatch(ops, mockCtx);
        expect(result.totalOps).toBe(25);
    });

    it('should include labels in results', async () => {
        const result = await executeBatch([
            { tool: 'get_page_tree', params: {}, label: 'Read Tree' },
        ], mockCtx);
        expect(result.results[0].label).toBe('Read Tree');
    });
});

describe('toolRegistry — getToolSummary', () => {
    it('should return counts by category', () => {
        const summary = getToolSummary();
        expect(summary.total).toBe(ALL_TOOLS.length);
        expect(summary.read).toBeGreaterThan(0);
        expect(summary.create).toBeGreaterThan(0);
        expect(summary.modify).toBeGreaterThan(0);
    });
});
