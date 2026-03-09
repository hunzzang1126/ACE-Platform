// ─────────────────────────────────────────────────
// exportTools.ts — Export Operations
// ─────────────────────────────────────────────────
// Note: Actual rendering uses the canvas engine. These 
// tools expose export capability to the AI agent for
// pipeline automation.
// ─────────────────────────────────────────────────

import type { AceTool, ToolContext } from './toolTypes';
import type { CreativeSet } from '@/schema/design.types';

export const listExportableVariants: AceTool = {
    name: 'list_exportable_variants',
    category: 'export',
    description: 'List all variants and their dimensions for export planning.',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        const cs = ctx.designActions.getCreativeSet() as CreativeSet | null;
        if (!cs) return { success: false, message: 'No active creative set' };

        const variants = cs.variants.map(v => ({
            id: v.id,
            name: v.preset.name,
            width: v.preset.width,
            height: v.preset.height,
            elementCount: v.elements.length,
        }));

        return {
            success: true,
            message: `${variants.length} variants ready for export`,
            data: { variants, creativeName: cs.name },
        };
    },
};

export const getExportSummary: AceTool = {
    name: 'get_export_summary',
    category: 'export',
    description: 'Get a summary of what will be exported: total variants, formats, estimated sizes.',
    inputSchema: {
        type: 'object',
        properties: {
            format: { type: 'string', enum: ['png', 'svg', 'html5'], description: 'Target export format' },
        },
    },
    execute: (params, ctx) => {
        const cs = ctx.designActions.getCreativeSet() as CreativeSet | null;
        if (!cs) return { success: false, message: 'No active creative set' };

        const format = (params.format as string) || 'png';
        const count = cs.variants.length;

        return {
            success: true,
            message: `Export plan: ${count} variants as ${format.toUpperCase()}`,
            data: {
                format,
                variantCount: count,
                variants: cs.variants.map(v => `${v.preset.name} (${v.preset.width}x${v.preset.height})`),
            },
        };
    },
};

export const exportTools: AceTool[] = [listExportableVariants, getExportSummary];
