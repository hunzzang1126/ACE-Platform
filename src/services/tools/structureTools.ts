// ─────────────────────────────────────────────────
// structureTools.ts — Structure Operations
// ─────────────────────────────────────────────────
// Delete, rename, reorder elements.
// ─────────────────────────────────────────────────

import type { AceTool } from './toolTypes';

export const deleteNode: AceTool = {
    name: 'delete_node',
    category: 'structure',
    description: 'Delete an element from the canvas.',
    inputSchema: {
        type: 'object', required: ['id'],
        properties: { id: { type: 'string' } },
    },
    execute: (params, ctx) => {
        ctx.designActions.removeElementFromMaster(params.id as string);
        return { success: true, message: `Deleted element "${params.id}"`, sideEffects: [`Deleted "${params.id}"`] };
    },
};

export const renameNode: AceTool = {
    name: 'rename_node',
    category: 'structure',
    description: 'Rename an element (changes the layer name).',
    inputSchema: {
        type: 'object', required: ['id', 'name'],
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, { name: params.name });
        return { success: true, message: `Renamed "${params.id}" to "${params.name}"` };
    },
};

export const setRole: AceTool = {
    name: 'set_role',
    category: 'structure',
    description: 'Set the semantic role of an element for Smart Sizing (headline, subheadline, cta, background, hero, decoration, badge, logo).',
    inputSchema: {
        type: 'object', required: ['id', 'role'],
        properties: {
            id: { type: 'string' },
            role: { type: 'string', enum: ['headline', 'subheadline', 'cta', 'body', 'background', 'hero', 'decoration', 'badge', 'logo', 'image', 'spacer'] },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, { role: params.role });
        return { success: true, message: `Set role of "${params.id}" to "${params.role}"` };
    },
};

export const setLocked: AceTool = {
    name: 'set_locked',
    category: 'structure',
    description: 'Lock or unlock an element (prevents accidental edits).',
    inputSchema: {
        type: 'object', required: ['id', 'locked'],
        properties: {
            id: { type: 'string' },
            locked: { type: 'boolean' },
        },
    },
    execute: (params, ctx) => {
        ctx.designActions.updateMasterElement(params.id as string, { locked: params.locked });
        return { success: true, message: `${params.locked ? 'Locked' : 'Unlocked'} "${params.id}"` };
    },
};

export const structureTools: AceTool[] = [deleteNode, renameNode, setRole, setLocked];
