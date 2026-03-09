// ─────────────────────────────────────────────────
// modifyTools.ts — Modify Existing Elements
// ─────────────────────────────────────────────────
// AI changes properties of existing elements: fill, font, 
// position, size, opacity, visibility, zIndex.
// ─────────────────────────────────────────────────

import type { AceTool } from './toolTypes';

// ── Tools ──

export const setFill: AceTool = {
    name: 'set_fill',
    category: 'modify',
    description: 'Set the fill color of a shape or background element.',
    inputSchema: {
        type: 'object', required: ['id', 'color'],
        properties: {
            id: { type: 'string' },
            color: { type: 'string', description: 'Hex color (#rrggbb)' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, { fill: params.color });
        return { success: true, message: `Set fill of "${params.id}" to ${params.color}` };
    },
};

export const setFont: AceTool = {
    name: 'set_font',
    category: 'modify',
    description: 'Set font properties on a text element.',
    inputSchema: {
        type: 'object', required: ['id'],
        properties: {
            id: { type: 'string' },
            fontFamily: { type: 'string' },
            fontSize: { type: 'number' },
            fontWeight: { type: 'number' },
            color: { type: 'string' },
            letterSpacing: { type: 'number' },
            lineHeight: { type: 'number' },
        },
    },
    execute: (params, ctx) => {
        const patch: Record<string, unknown> = {};
        if (params.fontFamily !== undefined) patch.fontFamily = params.fontFamily;
        if (params.fontSize !== undefined) patch.fontSize = params.fontSize;
        if (params.fontWeight !== undefined) patch.fontWeight = params.fontWeight;
        if (params.color !== undefined) patch.color = params.color;
        if (params.letterSpacing !== undefined) patch.letterSpacing = params.letterSpacing;
        if (params.lineHeight !== undefined) patch.lineHeight = params.lineHeight;
        ctx.designActions.updateMasterElement(params.id as string, patch);
        return { success: true, message: `Updated font of "${params.id}"` };
    },
};

export const setText: AceTool = {
    name: 'set_text',
    category: 'modify',
    description: 'Set the text content of a text element.',
    inputSchema: {
        type: 'object', required: ['id', 'content'],
        properties: {
            id: { type: 'string' },
            content: { type: 'string' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, { content: params.content });
        return { success: true, message: `Set text of "${params.id}" to "${params.content}"` };
    },
};

export const moveNode: AceTool = {
    name: 'move_node',
    category: 'modify',
    description: 'Move an element to a new position (x, y).',
    inputSchema: {
        type: 'object', required: ['id', 'x', 'y'],
        properties: {
            id: { type: 'string' },
            x: { type: 'number' }, y: { type: 'number' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, {
            constraints: {
                horizontal: { anchor: 'left', offset: params.x },
                vertical: { anchor: 'top', offset: params.y },
            },
        });
        return { success: true, message: `Moved "${params.id}" to (${params.x}, ${params.y})` };
    },
};

export const resizeNode: AceTool = {
    name: 'resize_node',
    category: 'modify',
    description: 'Resize an element to new dimensions (w, h).',
    inputSchema: {
        type: 'object', required: ['id', 'w', 'h'],
        properties: {
            id: { type: 'string' },
            w: { type: 'number' }, h: { type: 'number' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, {
            constraints: {
                size: { widthMode: 'fixed', heightMode: 'fixed', width: params.w, height: params.h },
            },
        });
        return { success: true, message: `Resized "${params.id}" to ${params.w}x${params.h}` };
    },
};

export const setOpacity: AceTool = {
    name: 'set_opacity',
    category: 'modify',
    description: 'Set the opacity of an element (0.0 to 1.0).',
    inputSchema: {
        type: 'object', required: ['id', 'opacity'],
        properties: {
            id: { type: 'string' },
            opacity: { type: 'number', description: '0.0 (invisible) to 1.0 (opaque)' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, { opacity: params.opacity });
        return { success: true, message: `Set opacity of "${params.id}" to ${params.opacity}` };
    },
};

export const setVisible: AceTool = {
    name: 'set_visible',
    category: 'modify',
    description: 'Show or hide an element.',
    inputSchema: {
        type: 'object', required: ['id', 'visible'],
        properties: {
            id: { type: 'string' },
            visible: { type: 'boolean' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, { visible: params.visible });
        return { success: true, message: `Set visibility of "${params.id}" to ${params.visible}` };
    },
};

export const setZIndex: AceTool = {
    name: 'set_z_index',
    category: 'modify',
    description: 'Set the layer order (z-index) of an element.',
    inputSchema: {
        type: 'object', required: ['id', 'zIndex'],
        properties: {
            id: { type: 'string' },
            zIndex: { type: 'number' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, { zIndex: params.zIndex });
        return { success: true, message: `Set z-index of "${params.id}" to ${params.zIndex}` };
    },
};

export const modifyTools: AceTool[] = [setFill, setFont, setText, moveNode, resizeNode, setOpacity, setVisible, setZIndex];
