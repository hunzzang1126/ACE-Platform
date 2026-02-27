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

// ── Element Editing ─────────────────────────────

const list_elements: ToolDefinition = {
    name: 'list_elements',
    description: 'List all design elements in the current creative set (across all size variants). Returns element IDs, names, types, and content.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'scene',
};

const update_element_text: ToolDefinition = {
    name: 'update_element_text',
    description: 'Update the text content of a text or button element across ALL sizes. Use for language translation, copy changes, etc. Matches by element name (partial match supported).',
    parameters: {
        type: 'object',
        properties: {
            element_name: { type: 'string', description: 'Name or partial name of the element to update (e.g. "Headline", "CTA")' },
            new_text: { type: 'string', description: 'New text content' },
        },
        required: ['element_name', 'new_text'],
    },
    category: 'create',
};

const update_element_property: ToolDefinition = {
    name: 'update_element_property',
    description: 'Update a property (color, fontSize, fontFamily, backgroundColor, fill, opacity, etc.) on an element across ALL sizes. Matches by element name.',
    parameters: {
        type: 'object',
        properties: {
            element_name: { type: 'string', description: 'Name or partial name of the element' },
            property: { type: 'string', description: 'Property to change (e.g. "color", "fill", "fontSize", "fontFamily", "backgroundColor", "opacity", "label")' },
            value: { type: 'string', description: 'New value (string or number as string)' },
        },
        required: ['element_name', 'property', 'value'],
    },
    category: 'create',
};

// ── Dynamic / Catch-All Tools ───────────────────

const set_custom_style: ToolDefinition = {
    name: 'set_custom_style',
    description: 'Apply ANY custom CSS style(s) to an element across all sizes. Use this for effects not covered by other tools — glow, blur, text-shadow, gradient backgrounds, borders, transforms, filters, etc. The styles are applied as inline CSS.',
    parameters: {
        type: 'object',
        properties: {
            element_name: { type: 'string', description: 'Name or partial name of the element to style' },
            styles: {
                type: 'object',
                description: 'CSS properties as key-value pairs. Use camelCase keys (e.g. boxShadow, textShadow, filter, backgroundImage, border, transform). Values are CSS strings.',
            },
        },
        required: ['element_name', 'styles'],
    },
    category: 'create',
};

const execute_dynamic_action: ToolDefinition = {
    name: 'execute_dynamic_action',
    description: 'Execute a custom JavaScript action on the design. Use when no existing tool can accomplish the request. Write JS code that will be evaluated with access to: `designStore` (Zustand store with creativeSet, variants, elements), `document`, `window`. Return a result string. Use this for complex multi-step operations, batch updates, conditional logic, or any capability not covered by other tools.',
    parameters: {
        type: 'object',
        properties: {
            description: { type: 'string', description: 'Human-readable description of what this action does' },
            code: { type: 'string', description: 'JavaScript code to execute. Must return a string result. Has access to designStore (Zustand), document, window.' },
        },
        required: ['description', 'code'],
    },
    category: 'create',
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
    list_elements,
    update_element_text,
    update_element_property,
    set_custom_style,
    execute_dynamic_action,
];

export const DASHBOARD_TOOL_NAMES = new Set(DASHBOARD_TOOLS.map(t => t.name));
