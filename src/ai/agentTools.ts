// ─────────────────────────────────────────────────
// AI Agent Tools v2 — Eval-First (6 Essential Tools)
// ─────────────────────────────────────────────────
// Paradigm shift: 35+ narrow tools → 6 essential + eval.
// execute_dynamic_action is the PRIMARY tool.
// Only tools that need async APIs or special orchestration remain.

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, ToolParam>;
        required: string[];
    };
    category: 'create' | 'transform' | 'style' | 'effects' | 'animation' | 'selection' | 'scene' | 'undo' | 'compound';
}

interface ToolParam {
    type: string;
    description?: string;
    enum?: string[];
    items?: { type: string; properties?: Record<string, ToolParam> };
    minimum?: number;
    maximum?: number;
    default?: unknown;
}

// ── 1. Full Design Pipeline ───────────────────────

const generate_full_design: ToolDefinition = {
    name: 'generate_full_design',
    description: 'Generate a complete creative design from scratch. Runs the full AI pipeline: color palette, layout, copy, rendering. Use when user wants to CREATE a new design from an empty canvas. For modifications, use execute_dynamic_action instead.',
    parameters: {
        type: 'object',
        properties: {
            prompt: { type: 'string', description: 'Design brief describing what to create' },
        },
        required: ['prompt'],
    },
    category: 'compound',
};

// ── 2. Replace Background Image ───────────────────

const replace_background_image: ToolDefinition = {
    name: 'replace_background_image',
    description: 'Replace the background image with a new AI-generated one. Deletes existing background, generates a new image matching canvas size, places at z-index 0. Use when user says "change background", "different image", "new background".',
    parameters: {
        type: 'object',
        properties: {
            prompt: { type: 'string', description: 'Description of the new background image' },
            style: {
                type: 'string',
                description: 'Visual style',
                enum: ['realistic', 'illustration', 'abstract', 'minimal', 'photography'],
                default: 'photography',
            },
        },
        required: ['prompt'],
    },
    category: 'create',
};

// ── 3. Generate Image ─────────────────────────────

const generate_image: ToolDefinition = {
    name: 'generate_image',
    description: 'Generate an AI image. Returns a data URL. Use for backgrounds, product photos, or visual elements.',
    parameters: {
        type: 'object',
        properties: {
            prompt: { type: 'string', description: 'Detailed image description' },
            style: {
                type: 'string',
                description: 'Visual style',
                enum: ['realistic', 'illustration', 'abstract', 'minimal', 'photography'],
                default: 'photography',
            },
        },
        required: ['prompt'],
    },
    category: 'create',
};

// ── 4. Add Text (constraint-aware) ────────────────

const add_text: ToolDefinition = {
    name: 'add_text',
    description: 'Add a text element with auto-collision avoidance and deduplication. Use for adding new text (headline, subline, body). For modifying existing text, use execute_dynamic_action.',
    parameters: {
        type: 'object',
        properties: {
            content: { type: 'string', description: 'Text string' },
            y: { type: 'number', description: 'Y position' },
            fontSize: { type: 'number', description: 'Font size px', default: 24 },
            color: { type: 'string', description: 'Text color hex', default: '#ffffff' },
            fontFamily: { type: 'string', description: 'Font family', default: 'Inter' },
            fontWeight: { type: 'number', description: 'Font weight', default: 700 },
            align: { type: 'string', description: 'Horizontal alignment', enum: ['left', 'center', 'right'], default: 'center' },
            name: { type: 'string', description: 'Element name for identification' },
            role: { type: 'string', description: 'Semantic role (headline, subline, body, cta, legal)' },
        },
        required: ['content'],
    },
    category: 'create',
};

// ── 5. Add Button (compound creation) ─────────────

const add_button: ToolDefinition = {
    name: 'add_button',
    description: 'Add a CTA button (shape + text). Auto-collision aware. Use add_button for new CTAs. For modifying an existing button, use execute_dynamic_action.',
    parameters: {
        type: 'object',
        properties: {
            text: { type: 'string', description: 'Button label (e.g. "Shop Now")', default: 'Shop Now' },
            y: { type: 'number', description: 'Y position', default: 200 },
            bgColor: { type: 'string', description: 'Background color hex', default: '#c9a84c' },
            textColor: { type: 'string', description: 'Text color hex', default: '#ffffff' },
            fontSize: { type: 'number', description: 'Font size', default: 14 },
            borderRadius: { type: 'number', description: 'Corner radius', default: 6 },
            name: { type: 'string', description: 'Element name', default: 'CTA Button' },
        },
        required: [],
    },
    category: 'create',
};

// ── 6. Execute Dynamic Action (PRIMARY TOOL) ──────

const execute_dynamic_action: ToolDefinition = {
    name: 'execute_dynamic_action',
    description: 'Run JavaScript code with full access to designStore and projectStore. This is the PRIMARY tool for ALL modifications: changing colors, fonts, positions, sizes, opacity, animations, batch operations, translations, deletions, and any element manipulation. See STORE API in system prompt for available methods.',
    parameters: {
        type: 'object',
        properties: {
            description: { type: 'string', description: 'What this code does (shown to user)' },
            code: { type: 'string', description: 'JavaScript code to execute. Has access to: designStore, useDesignStore, useProjectStore, uuid' },
        },
        required: ['description', 'code'],
    },
    category: 'compound',
};

// ── 7. Analyze Scene (read-only) ──────────────────

const analyze_scene: ToolDefinition = {
    name: 'analyze_scene',
    description: 'Read the current canvas state. Returns all elements with their properties. Use BEFORE execute_dynamic_action when you need exact element IDs or current values.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'compound',
};

// ── All Tools Registry ────────────────────────────

export const ALL_TOOLS: ToolDefinition[] = [
    generate_full_design,
    replace_background_image,
    generate_image,
    add_text,
    add_button,
    execute_dynamic_action,
    analyze_scene,
];

/**
 * Convert tools to Anthropic/Claude format (input_schema).
 */
export function getToolsForClaude(): Array<{
    name: string;
    description: string;
    input_schema: object;
}> {
    return ALL_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
    }));
}

/**
 * Convert tools to OpenAI function-calling format.
 */
export function getToolsForApi(): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: object };
}> {
    return ALL_TOOLS.map(t => ({
        type: 'function' as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));
}

/**
 * Get tool by name.
 */
export function getToolByName(name: string): ToolDefinition | undefined {
    return ALL_TOOLS.find(t => t.name === name);
}
