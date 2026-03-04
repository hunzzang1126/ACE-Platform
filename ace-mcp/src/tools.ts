// ─────────────────────────────────────────────────
// tools.ts — MCP-format tool schemas
// ─────────────────────────────────────────────────
// CRITICAL: param names MUST match commandExecutor.ts exactly.
//   - Colors: r/g/b (0-1 float), NOT hex 'fill'
//   - Dimensions: w/h, NOT width/height (for rect tools)
//   - Tool names MUST match commandExecutor switch cases exactly
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

/** All ACE tools in MCP inputSchema format — mirrors commandExecutor.ts */
export const ALL_TOOLS_SCHEMA: McpToolSchema[] = [
    // ── Shape Creation ──────────────────────────────
    {
        name: 'add_rect',
        description: 'Add a colored rectangle to the canvas. Returns the new node ID.',
        inputSchema: {
            type: 'object',
            required: ['x', 'y', 'w', 'h', 'r', 'g', 'b'],
            properties: {
                x: { type: 'number', description: 'X position (px)' },
                y: { type: 'number', description: 'Y position (px)' },
                w: { type: 'number', description: 'Width (px)', minimum: 1 },
                h: { type: 'number', description: 'Height (px)', minimum: 1 },
                r: { type: 'number', description: 'Red component (0.0–1.0)', minimum: 0, maximum: 1 },
                g: { type: 'number', description: 'Green component (0.0–1.0)', minimum: 0, maximum: 1 },
                b: { type: 'number', description: 'Blue component (0.0–1.0)', minimum: 0, maximum: 1 },
                a: { type: 'number', description: 'Alpha (0.0–1.0)', minimum: 0, maximum: 1, default: 1.0 },
            },
        },
    },
    {
        name: 'add_rounded_rect',
        description: 'Add a rounded rectangle (button shape). Returns the new node ID.',
        inputSchema: {
            type: 'object',
            required: ['x', 'y', 'w', 'h', 'r', 'g', 'b', 'radius'],
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number', minimum: 1 },
                h: { type: 'number', minimum: 1 },
                r: { type: 'number', minimum: 0, maximum: 1 },
                g: { type: 'number', minimum: 0, maximum: 1 },
                b: { type: 'number', minimum: 0, maximum: 1 },
                a: { type: 'number', minimum: 0, maximum: 1, default: 1.0 },
                radius: { type: 'number', description: 'Corner radius (px)', minimum: 0, default: 8 },
            },
        },
    },
    {
        name: 'add_ellipse',
        description: 'Add an ellipse or circle. Returns the new node ID.',
        inputSchema: {
            type: 'object',
            required: ['cx', 'cy', 'rx', 'ry', 'r', 'g', 'b'],
            properties: {
                cx: { type: 'number', description: 'Center X' },
                cy: { type: 'number', description: 'Center Y' },
                rx: { type: 'number', description: 'Horizontal radius', minimum: 1 },
                ry: { type: 'number', description: 'Vertical radius', minimum: 1 },
                r: { type: 'number', minimum: 0, maximum: 1 },
                g: { type: 'number', minimum: 0, maximum: 1 },
                b: { type: 'number', minimum: 0, maximum: 1 },
                a: { type: 'number', minimum: 0, maximum: 1, default: 1.0 },
            },
        },
    },

    // ── Text ──────────────────────────────────────
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
                color_hex: { type: 'string', description: 'Hex color e.g. #ffffff', default: '#ffffff' },
                width: { type: 'number', default: 200, description: 'Text box width (px)' },
                text_align: { type: 'string', enum: ['left', 'center', 'right'], default: 'left' },
            },
        },
    },

    // ── Animation ─────────────────────────────────
    {
        // IMPORTANT: Must match commandExecutor.ts case 'set_animation_preset'
        name: 'set_animation_preset',
        description: 'Apply an animation preset to a canvas element by node ID.',
        inputSchema: {
            type: 'object',
            required: ['node_id', 'preset'],
            properties: {
                node_id: { type: 'number', description: 'Element node ID (returned by add_* tools)' },
                preset: {
                    type: 'string',
                    enum: ['fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'none'],
                },
                duration: { type: 'number', default: 0.4 },
                delay: { type: 'number', default: 0 },
            },
        },
    },

    // ── Scene ─────────────────────────────────────
    {
        name: 'clear_scene',
        description: 'Remove all user-added elements from the canvas.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'analyze_scene',
        description: 'Get a text summary of all current canvas elements and their positions.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },

    // ── Compound ──────────────────────────────────
    {
        name: 'render_banner',
        description: 'Create a full banner layout declaratively. Define all elements in one call.',
        inputSchema: {
            type: 'object',
            required: ['elements'],
            properties: {
                elements: {
                    type: 'array',
                    description: 'Array of elements to create in order',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['rect', 'rounded_rect', 'ellipse', 'text'], description: 'Element type' },
                            x: { type: 'number' },
                            y: { type: 'number' },
                            w: { type: 'number' },
                            h: { type: 'number' },
                            // Color: use r/g/b (0-1) OR color_hex (for text)
                            r: { type: 'number', minimum: 0, maximum: 1 },
                            g: { type: 'number', minimum: 0, maximum: 1 },
                            b: { type: 'number', minimum: 0, maximum: 1 },
                            a: { type: 'number', minimum: 0, maximum: 1, default: 1.0 },
                            radius: { type: 'number', description: 'Corner radius for rounded_rect' },
                            // Text-specific
                            content: { type: 'string', description: 'Text content (required for type=text)' },
                            font_size: { type: 'number' },
                            font_weight: { type: 'string' },
                            color_hex: { type: 'string', description: 'Text color hex e.g. #ffffff' },
                            text_align: { type: 'string', enum: ['left', 'center', 'right'] },
                            // Animation
                            animation: { type: 'string', enum: ['fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'none'] },
                            anim_delay: { type: 'number', default: 0 },
                            anim_duration: { type: 'number', default: 0.4 },
                        },
                    },
                },
            },
        },
    },

    // ── Dashboard ─────────────────────────────────
    {
        name: 'create_creative_set',
        description: 'Create a new creative set (banner project).',
        inputSchema: {
            type: 'object',
            required: ['name'],
            properties: {
                name: { type: 'string' },
                preset: { type: 'string', description: 'e.g. "300x250", "728x90"', default: '300x250' },
            },
        },
    },

    // ── Effects ───────────────────────────────────
    {
        name: 'set_shadow',
        description: 'Add a drop shadow to a canvas element.',
        inputSchema: {
            type: 'object',
            required: ['node_id'],
            properties: {
                node_id: { type: 'number' },
                offset_x: { type: 'number', default: 2 },
                offset_y: { type: 'number', default: 2 },
                blur: { type: 'number', default: 4 },
                r: { type: 'number', minimum: 0, maximum: 1, default: 0 },
                g: { type: 'number', minimum: 0, maximum: 1, default: 0 },
                b: { type: 'number', minimum: 0, maximum: 1, default: 0 },
                a: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
            },
        },
    },
    {
        name: 'set_opacity',
        description: 'Set the opacity of a canvas element.',
        inputSchema: {
            type: 'object',
            required: ['node_id', 'opacity'],
            properties: {
                node_id: { type: 'number' },
                opacity: { type: 'number', minimum: 0, maximum: 1 },
            },
        },
    },
];
