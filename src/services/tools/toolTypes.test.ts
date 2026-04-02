// ─────────────────────────────────────────────────
// toolTypes.test.ts — Tool type contracts + toClaudeSchema
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { toClaudeSchema } from './toolTypes';
import type { AceTool } from './toolTypes';

describe('toolTypes', () => {
    describe('toClaudeSchema', () => {
        const sampleTool: AceTool = {
            name: 'test_tool',
            category: 'read',
            description: 'A test tool',
            inputSchema: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'string' } },
            },
            execute: () => ({ success: true, message: 'ok' }),
        };

        it('should convert tool to Claude schema format', () => {
            const schema = toClaudeSchema(sampleTool);
            expect(schema.name).toBe('test_tool');
            expect(schema.description).toBe('A test tool');
            expect(schema.input_schema).toBe(sampleTool.inputSchema);
        });

        it('should preserve input_schema reference', () => {
            const schema = toClaudeSchema(sampleTool);
            expect(schema.input_schema).toBe(sampleTool.inputSchema);
        });

        it('should not include execute function in output', () => {
            const schema = toClaudeSchema(sampleTool);
            expect((schema as any).execute).toBeUndefined();
        });

        it('should not include category in output', () => {
            const schema = toClaudeSchema(sampleTool);
            expect((schema as any).category).toBeUndefined();
        });
    });
});
