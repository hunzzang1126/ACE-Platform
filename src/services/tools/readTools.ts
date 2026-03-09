// ─────────────────────────────────────────────────
// readTools.ts — Query Design State
// ─────────────────────────────────────────────────
// AI reads current canvas state: scene graph, elements,
// selection, canvas bounds.
// ─────────────────────────────────────────────────

import type { AceTool, ToolContext, ToolResult } from './toolTypes';
import type { CreativeSet, BannerVariant, DesignElement } from '@/schema/design.types';

// ── Helpers ──

function getActiveVariant(ctx: ToolContext): BannerVariant | null {
    const cs = ctx.designActions.getCreativeSet() as CreativeSet | null;
    if (!cs || !ctx.activeVariantId) return null;
    return cs.variants.find(v => v.id === ctx.activeVariantId) ?? null;
}

function elementToSummary(el: DesignElement) {
    const base = {
        id: el.id,
        name: el.name,
        type: el.type,
        zIndex: el.zIndex,
        visible: el.visible,
        locked: el.locked,
        opacity: el.opacity,
        role: el.role ?? null,
    };

    // Add type-specific fields
    if (el.type === 'text') {
        return { ...base, content: el.content, fontFamily: el.fontFamily, fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color, textAlign: el.textAlign };
    }
    if (el.type === 'shape') {
        return { ...base, shapeType: el.shapeType, fill: el.fill, borderRadius: el.borderRadius };
    }
    if (el.type === 'image') {
        return { ...base, src: '[image]', fit: el.fit };
    }
    if (el.type === 'button') {
        return { ...base, label: el.label, backgroundColor: el.backgroundColor, borderRadius: el.borderRadius };
    }
    return base;
}

// ── Tools ──

export const getPageTree: AceTool = {
    name: 'get_page_tree',
    category: 'read',
    description: 'Get the full design tree: all elements with their properties, relationships, and design tokens. This is the primary way to understand what is currently on the canvas.',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        const variant = getActiveVariant(ctx);
        if (!variant) return { success: false, message: 'No active variant' };

        const elements = variant.elements.map(elementToSummary);

        return {
            success: true,
            message: `Page tree: ${elements.length} elements on ${ctx.canvasW}x${ctx.canvasH} canvas`,
            data: {
                canvas: { width: ctx.canvasW, height: ctx.canvasH },
                backgroundColor: variant.backgroundColor,
                elements,
            },
        };
    },
};

export const getNode: AceTool = {
    name: 'get_node',
    category: 'read',
    description: 'Get detailed information about a specific element by its ID.',
    inputSchema: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', description: 'Element ID' } },
    },
    execute: (params, ctx) => {
        const variant = getActiveVariant(ctx);
        if (!variant) return { success: false, message: 'No active variant' };

        const id = params.id as string;
        const el = variant.elements.find(e => e.id === id);
        if (!el) return { success: false, message: `Element "${id}" not found` };

        return { success: true, message: `Found element "${el.name}"`, data: elementToSummary(el) };
    },
};

export const findNodes: AceTool = {
    name: 'find_nodes',
    category: 'read',
    description: 'Search for elements by name, type, or role. Returns matching elements.',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Partial name match (case-insensitive)' },
            type: { type: 'string', description: 'Element type: text, shape, image, button, group, video' },
            role: { type: 'string', description: 'Layout role: headline, subheadline, cta, background, etc.' },
        },
    },
    execute: (params, ctx) => {
        const variant = getActiveVariant(ctx);
        if (!variant) return { success: false, message: 'No active variant' };

        let results = variant.elements;

        if (params.name) {
            const nameQuery = (params.name as string).toLowerCase();
            results = results.filter(e => e.name.toLowerCase().includes(nameQuery));
        }
        if (params.type) {
            results = results.filter(e => e.type === params.type);
        }
        if (params.role) {
            results = results.filter(e => e.role === params.role);
        }

        return {
            success: true,
            message: `Found ${results.length} matching elements`,
            data: results.map(elementToSummary),
        };
    },
};

export const getSelection: AceTool = {
    name: 'get_selection',
    category: 'read',
    description: 'Get the currently selected element on canvas.',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        const selectedId = ctx.editorActions.getSelectedElementId();
        if (!selectedId) return { success: true, message: 'Nothing selected', data: null };

        const variant = getActiveVariant(ctx);
        if (!variant) return { success: false, message: 'No active variant' };

        const el = variant.elements.find(e => e.id === selectedId);
        if (!el) return { success: true, message: 'Selected element not found in variant', data: null };

        return { success: true, message: `Selected: "${el.name}"`, data: elementToSummary(el) };
    },
};

export const getCanvasBounds: AceTool = {
    name: 'get_canvas_bounds',
    category: 'read',
    description: 'Get canvas dimensions and safe zones.',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        const pad = Math.max(10, Math.round(Math.min(ctx.canvasW, ctx.canvasH) * 0.05));
        return {
            success: true,
            message: `Canvas: ${ctx.canvasW}x${ctx.canvasH}, safe padding: ${pad}px`,
            data: {
                width: ctx.canvasW,
                height: ctx.canvasH,
                safePadding: pad,
                safeArea: { x: pad, y: pad, w: ctx.canvasW - 2 * pad, h: ctx.canvasH - 2 * pad },
            },
        };
    },
};

export const readTools: AceTool[] = [getPageTree, getNode, findNodes, getSelection, getCanvasBounds];
