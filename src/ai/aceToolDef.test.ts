// ─────────────────────────────────────────────────
// aceToolDef.test.ts — Tool definition framework tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    defineTool,
    toClaudeTools,
    toOpenAiTools,
    toMcpTools,
    findTool,
} from './aceToolDef';
import type { AceToolDef } from './aceToolDef';

// ── Test Data ──

const sampleTool = defineTool({
    name: 'add_shape',
    description: 'Add a shape to the canvas',
    params: {
        type: { type: 'string', description: 'Shape type', enum: ['rect', 'ellipse'], required: true },
        color: { type: 'string', description: 'Fill color hex', default: '#ff0000' },
        size: { type: 'number', minimum: 10, maximum: 1000 },
    },
});

const sampleToolWithArray = defineTool({
    name: 'batch_update',
    description: 'Update multiple elements',
    params: {
        updates: {
            type: 'array',
            description: 'List of updates',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'number', description: 'Element ID' },
                    color: { type: 'string', description: 'New color' },
                },
            },
        },
    },
});

const legacyTool = {
    name: 'legacy_action',
    description: 'Old-format tool',
    parameters: {
        type: 'object' as const,
        properties: {
            target: { type: 'string', description: 'Target element' },
        },
        required: ['target'],
    },
};

describe('aceToolDef', () => {

    // ── defineTool ──

    describe('defineTool', () => {
        it('should return the same def passed in', () => {
            const tool = defineTool({
                name: 'my_tool',
                description: 'A tool',
                params: {},
            });
            expect(tool.name).toBe('my_tool');
            expect(tool.description).toBe('A tool');
        });

        it('should preserve params schema', () => {
            expect(sampleTool.params.type.enum).toEqual(['rect', 'ellipse']);
            expect(sampleTool.params.color.default).toBe('#ff0000');
            expect(sampleTool.params.size.minimum).toBe(10);
        });
    });

    // ── toClaudeTools ──

    describe('toClaudeTools', () => {
        it('should convert AceToolDef to Claude format', () => {
            const result = toClaudeTools([sampleTool]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('add_shape');
            expect(result[0].description).toBe('Add a shape to the canvas');
            expect(result[0].input_schema).toBeDefined();
        });

        it('should build JSON Schema with type=object', () => {
            const result = toClaudeTools([sampleTool]);
            const schema = result[0].input_schema as any;
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
        });

        it('should include enum values in schema', () => {
            const result = toClaudeTools([sampleTool]);
            const schema = result[0].input_schema as any;
            expect(schema.properties.type.enum).toEqual(['rect', 'ellipse']);
        });

        it('should include min/max in schema', () => {
            const result = toClaudeTools([sampleTool]);
            const schema = result[0].input_schema as any;
            expect(schema.properties.size.minimum).toBe(10);
            expect(schema.properties.size.maximum).toBe(1000);
        });

        it('should mark required fields', () => {
            const result = toClaudeTools([sampleTool]);
            const schema = result[0].input_schema as any;
            expect(schema.required).toContain('type');
        });

        it('should handle legacy tool format', () => {
            const result = toClaudeTools([legacyTool as any]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('legacy_action');
            expect(result[0].input_schema).toBe(legacyTool.parameters);
        });

        it('should handle mixed old and new formats', () => {
            const result = toClaudeTools([sampleTool, legacyTool as any]);
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('add_shape');
            expect(result[1].name).toBe('legacy_action');
        });

        it('should handle array params with items schema', () => {
            const result = toClaudeTools([sampleToolWithArray]);
            const schema = result[0].input_schema as any;
            expect(schema.properties.updates.type).toBe('array');
            expect(schema.properties.updates.items).toBeDefined();
        });
    });

    // ── toOpenAiTools ──

    describe('toOpenAiTools', () => {
        it('should convert to OpenAI function format', () => {
            const result = toOpenAiTools([sampleTool]);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('function');
            expect(result[0].function.name).toBe('add_shape');
            expect(result[0].function.parameters).toBeDefined();
        });

        it('should handle legacy format', () => {
            const result = toOpenAiTools([legacyTool as any]);
            expect(result[0].function.parameters).toBe(legacyTool.parameters);
        });
    });

    // ── toMcpTools ──

    describe('toMcpTools', () => {
        it('should convert to MCP format with inputSchema', () => {
            const result = toMcpTools([sampleTool]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('add_shape');
            expect(result[0].inputSchema.type).toBe('object');
            expect(result[0].inputSchema.properties).toBeDefined();
        });

        it('should include required from legacy format', () => {
            const result = toMcpTools([legacyTool as any]);
            expect(result[0].inputSchema.required).toEqual(['target']);
        });

        it('should omit required when empty', () => {
            const tool = defineTool({ name: 'no_req', description: '', params: { a: { type: 'string' } } });
            const result = toMcpTools([tool]);
            expect(result[0].inputSchema.required).toBeUndefined();
        });
    });

    // ── findTool ──

    describe('findTool', () => {
        const registry = [sampleTool, sampleToolWithArray, legacyTool as any];

        it('should find tool by name', () => {
            const found = findTool(registry, 'add_shape');
            expect(found?.name).toBe('add_shape');
        });

        it('should find legacy tool by name', () => {
            const found = findTool(registry, 'legacy_action');
            expect(found?.name).toBe('legacy_action');
        });

        it('should return undefined for unknown name', () => {
            expect(findTool(registry, 'non_existent')).toBeUndefined();
        });

        it('should return undefined from empty registry', () => {
            expect(findTool([], 'anything')).toBeUndefined();
        });
    });
});
