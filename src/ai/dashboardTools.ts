// ─────────────────────────────────────────────────
// Dashboard Tools — AI Agent tools for app-level actions
// CRUD creative sets, manage variants, navigate
// ─────────────────────────────────────────────────

import type { ToolDefinition } from './agentTools';

// ── Creative Set Management ──────────────────────

const list_creative_sets: ToolDefinition = {
    name: 'list_creative_sets',
    description: 'List all creative sets in the workspace. Returns names, IDs, variant counts.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'scene',
};

const create_creative_set: ToolDefinition = {
    name: 'create_creative_set',
    description: 'Create a new creative set with a name and initial master size.',
    parameters: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Name for the creative set' },
            width: { type: 'number', description: 'Master variant width in pixels' },
            height: { type: 'number', description: 'Master variant height in pixels' },
        },
        required: ['name', 'width', 'height'],
    },
    category: 'create',
};

const delete_creative_set: ToolDefinition = {
    name: 'delete_creative_set',
    description: 'Delete a creative set by name (supports partial match). Example: "delete sets starting with 2012".',
    parameters: {
        type: 'object',
        properties: {
            name_query: { type: 'string', description: 'Full or partial name to match' },
        },
        required: ['name_query'],
    },
    category: 'scene',
};

const rename_creative_set: ToolDefinition = {
    name: 'rename_creative_set',
    description: 'Rename a creative set.',
    parameters: {
        type: 'object',
        properties: {
            name_query: { type: 'string', description: 'Current name or partial match' },
            new_name: { type: 'string', description: 'New name' },
        },
        required: ['name_query', 'new_name'],
    },
    category: 'scene',
};

// ── Variant / Size Management ────────────────────

const add_size: ToolDefinition = {
    name: 'add_size',
    description: 'Add a new size/variant to the current creative set.',
    parameters: {
        type: 'object',
        properties: {
            width: { type: 'number', description: 'Width in pixels' },
            height: { type: 'number', description: 'Height in pixels' },
            name: { type: 'string', description: 'Display name (optional, auto-generated if omitted)' },
        },
        required: ['width', 'height'],
    },
    category: 'create',
};

const remove_size: ToolDefinition = {
    name: 'remove_size',
    description: 'Remove a size/variant from the current creative set by dimensions.',
    parameters: {
        type: 'object',
        properties: {
            width: { type: 'number', description: 'Width of the variant to remove' },
            height: { type: 'number', description: 'Height of the variant to remove' },
        },
        required: ['width', 'height'],
    },
    category: 'scene',
};

// ── Navigation ───────────────────────────────────

const navigate_to: ToolDefinition = {
    name: 'navigate_to',
    description: 'Navigate to a specific page: "dashboard", "editor", or "detail" (opens a variant for editing).',
    parameters: {
        type: 'object',
        properties: {
            page: { type: 'string', description: 'Target page', enum: ['dashboard', 'editor', 'detail'] },
            variant_query: { type: 'string', description: 'For "detail": size like "300x250" or variant name' },
        },
        required: ['page'],
    },
    category: 'scene',
};

// ── Bulk Operations ─────────────────────────────

const delete_all_creative_sets: ToolDefinition = {
    name: 'delete_all_creative_sets',
    description: 'Delete ALL creative sets in the workspace. Use when the user wants a clean slate.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'scene',
};

// ── Export Registry ──────────────────────────────

export const DASHBOARD_TOOLS: ToolDefinition[] = [
    list_creative_sets,
    create_creative_set,
    delete_creative_set,
    delete_all_creative_sets,
    rename_creative_set,
    add_size,
    remove_size,
    navigate_to,
];

export const DASHBOARD_TOOL_NAMES = new Set(DASHBOARD_TOOLS.map(t => t.name));
