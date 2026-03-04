// ─────────────────────────────────────────────────
// tools.ts — MCP-format tool schemas
// ─────────────────────────────────────────────────
// These mirror ALL_TOOLS from the main ACE app but in
// MCP inputSchema format (JSON Schema with required array).
//
// Generated from aceToolDef.toMcpTools() pattern.
// ─────────────────────────────────────────────────

export interface McpToolSchema {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}

/** Core canvas tools available via MCP */
export const ALL_TOOLS_SCHEMA: McpToolSchema[] = [
    // ── Shape Creation ──
    {
        name: 'add_rect',
        description: 'Add a rectangle to the canvas.',
        inputSchema: {
            type: 'object',
            properties: {
                x: { type: 'number', description: 'X position (px)' },
                y: { type: 'number', description: 'Y position (px)' },
                width: { type: 'number', description: 'Width (px)', default: 200 },
                height: { type: 'number', description: 'Height (px)', default: 120 },
                fill: { type: 'string', description: 'Hex color e.g. #ff0000', default: '#3b82f6' },
                opacity: { type: 'number', minimum: 0, maximum: 1, default: 1 },
                role: {
                    type: 'string',
                    description: 'Semantic role for Smart Sizing',
                    enum: ['background', 'logo', 'headline', 'subtext', 'cta', 'decoration', 'image'],
                },
            },
        },
    },
    {
        name: 'add_rounded_rect',
        description: 'Add a rounded rectangle (button shape) to the canvas.',
        inputSchema: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number', default: 160 },
                height: { type: 'number', default: 44 },
                radius: { type: 'number', description: 'Corner radius (px)', default: 8 },
                fill: { type: 'string', default: '#238636' },
                opacity: { type: 'number', minimum: 0, maximum: 1, default: 1 },
                role: { type: 'string', enum: ['background', 'cta', 'decoration', 'accent'] },
            },
        },
    },

    // ── Text ──
    {
        name: 'add_text',
        description: 'Add a text element to the canvas.',
        inputSchema: {
            type: 'object',
            required: ['content'],
            properties: {
                content: { type: 'string', description: 'Text content' },
                x: { type: 'number', default: 60 },
                y: { type: 'number', default: 60 },
                font_size: { type: 'number', default: 18 },
                font_family: { type: 'string', default: 'Inter, system-ui, sans-serif' },
                font_weight: { type: 'string', default: '400' },
                color_hex: { type: 'string', default: '#ffffff' },
                width: { type: 'number', default: 200 },
                text_align: { type: 'string', enum: ['left', 'center', 'right'], default: 'left' },
                role: { type: 'string', enum: ['headline', 'subtext', 'cta', 'logo', 'decoration'] },
            },
        },
    },

    // ── Animation ──
    {
        name: 'set_animation',
        description: 'Apply an animation preset to a canvas element by name.',
        inputSchema: {
            type: 'object',
            required: ['element_name', 'preset'],
            properties: {
                element_name: { type: 'string', description: 'Element label or ID' },
                preset: {
                    type: 'string',
                    enum: ['fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'none'],
                    description: 'Animation preset name',
                },
                duration: { type: 'number', default: 0.4 },
                delay: { type: 'number', default: 0 },
            },
        },
    },

    // ── Scene ──
    {
        name: 'get_canvas_state',
        description: 'Get the current canvas state as JSON (elements, sizes, etc.).',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'clear_canvas',
        description: 'Remove all elements from the canvas.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },

    // ── Dashboard ──
    {
        name: 'create_creative_set',
        description: 'Create a new creative set (banner project) on the dashboard.',
        inputSchema: {
            type: 'object',
            required: ['name'],
            properties: {
                name: { type: 'string', description: 'Name for the creative set' },
                preset: {
                    type: 'string',
                    description: 'Canvas size preset e.g. "728x90", "300x250"',
                    default: '300x250',
                },
            },
        },
    },

    // ── Compound ──
    {
        name: 'render_banner',
        description: 'Create a full banner layout declaratively with multiple elements in one call.',
        inputSchema: {
            type: 'object',
            required: ['elements'],
            properties: {
                elements: {
                    type: 'array',
                    description: 'Array of elements to create',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['rect', 'rounded_rect', 'ellipse', 'text'] },
                            x: { type: 'number' },
                            y: { type: 'number' },
                            w: { type: 'number' },
                            h: { type: 'number' },
                            fill: { type: 'string' },
                            content: { type: 'string' },
                            font_size: { type: 'number' },
                            font_weight: { type: 'string' },
                            color_hex: { type: 'string' },
                            animation: { type: 'string' },
                            anim_delay: { type: 'number' },
                            role: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
];
