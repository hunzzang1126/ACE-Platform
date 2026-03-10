// ─────────────────────────────────────────────────
// AI Agent Tools — Full WASM Engine + Dashboard Coverage
// ─────────────────────────────────────────────────
// Every engine capability + dashboard action as an AI-callable tool.
// Tool schemas follow OpenAI function-calling format.

import { DASHBOARD_TOOLS } from './dashboardTools';

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

// ── Create ────────────────────────────────────────

const add_rect: ToolDefinition = {
    name: 'add_rect',
    description: 'Add a colored rectangle to the canvas. Returns the new node ID.',
    parameters: {
        type: 'object',
        properties: {
            x: { type: 'number', description: 'X position (left edge)' },
            y: { type: 'number', description: 'Y position (top edge)' },
            w: { type: 'number', description: 'Width in pixels', minimum: 1 },
            h: { type: 'number', description: 'Height in pixels', minimum: 1 },
            r: { type: 'number', description: 'Red (0.0–1.0)', minimum: 0, maximum: 1 },
            g: { type: 'number', description: 'Green (0.0–1.0)', minimum: 0, maximum: 1 },
            b: { type: 'number', description: 'Blue (0.0–1.0)', minimum: 0, maximum: 1 },
            a: { type: 'number', description: 'Alpha (0.0–1.0)', minimum: 0, maximum: 1, default: 1.0 },
        },
        required: ['x', 'y', 'w', 'h', 'r', 'g', 'b'],
    },
    category: 'create',
};

const add_rounded_rect: ToolDefinition = {
    name: 'add_rounded_rect',
    description: 'Add a rounded rectangle with corner radius. Returns the new node ID.',
    parameters: {
        type: 'object',
        properties: {
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            w: { type: 'number', description: 'Width', minimum: 1 },
            h: { type: 'number', description: 'Height', minimum: 1 },
            r: { type: 'number', description: 'Red (0–1)', minimum: 0, maximum: 1 },
            g: { type: 'number', description: 'Green (0–1)', minimum: 0, maximum: 1 },
            b: { type: 'number', description: 'Blue (0–1)', minimum: 0, maximum: 1 },
            a: { type: 'number', description: 'Alpha (0–1)', minimum: 0, maximum: 1, default: 1.0 },
            radius: { type: 'number', description: 'Corner radius in pixels', minimum: 0 },
        },
        required: ['x', 'y', 'w', 'h', 'r', 'g', 'b', 'radius'],
    },
    category: 'create',
};

const add_ellipse: ToolDefinition = {
    name: 'add_ellipse',
    description: 'Add an ellipse (or circle if rx == ry). Returns the new node ID.',
    parameters: {
        type: 'object',
        properties: {
            cx: { type: 'number', description: 'Center X' },
            cy: { type: 'number', description: 'Center Y' },
            rx: { type: 'number', description: 'Horizontal radius', minimum: 1 },
            ry: { type: 'number', description: 'Vertical radius', minimum: 1 },
            r: { type: 'number', description: 'Red (0–1)', minimum: 0, maximum: 1 },
            g: { type: 'number', description: 'Green (0–1)', minimum: 0, maximum: 1 },
            b: { type: 'number', description: 'Blue (0–1)', minimum: 0, maximum: 1 },
            a: { type: 'number', description: 'Alpha (0–1)', minimum: 0, maximum: 1, default: 1.0 },
        },
        required: ['cx', 'cy', 'rx', 'ry', 'r', 'g', 'b'],
    },
    category: 'create',
};

const add_gradient_rect: ToolDefinition = {
    name: 'add_gradient_rect',
    description: 'Add a gradient-filled rectangle. Returns the new node ID.',
    parameters: {
        type: 'object',
        properties: {
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            w: { type: 'number', description: 'Width', minimum: 1 },
            h: { type: 'number', description: 'Height', minimum: 1 },
            r1: { type: 'number', description: 'Start color red (0–1)' },
            g1: { type: 'number', description: 'Start color green (0–1)' },
            b1: { type: 'number', description: 'Start color blue (0–1)' },
            a1: { type: 'number', description: 'Start color alpha (0–1)' },
            r2: { type: 'number', description: 'End color red (0–1)' },
            g2: { type: 'number', description: 'End color green (0–1)' },
            b2: { type: 'number', description: 'End color blue (0–1)' },
            a2: { type: 'number', description: 'End color alpha (0–1)' },
            angle_deg: { type: 'number', description: 'Gradient angle in degrees (0=left-to-right, 90=top-to-bottom)' },
        },
        required: ['x', 'y', 'w', 'h', 'r1', 'g1', 'b1', 'a1', 'r2', 'g2', 'b2', 'a2', 'angle_deg'],
    },
    category: 'create',
};

// ── Style ─────────────────────────────────────────

const set_opacity: ToolDefinition = {
    name: 'set_opacity',
    description: 'Set the opacity of a node.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID to modify' },
            opacity: { type: 'number', description: 'Opacity (0.0 = transparent, 1.0 = opaque)', minimum: 0, maximum: 1 },
        },
        required: ['node_id', 'opacity'],
    },
    category: 'style',
};

const set_blend_mode: ToolDefinition = {
    name: 'set_blend_mode',
    description: 'Set the blend mode of a node.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID' },
            mode: {
                type: 'string',
                description: 'Blend mode name',
                enum: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color_dodge', 'color_burn', 'hard_light', 'soft_light', 'difference', 'exclusion'],
            },
        },
        required: ['node_id', 'mode'],
    },
    category: 'style',
};

// ── Effects ───────────────────────────────────────

const set_shadow: ToolDefinition = {
    name: 'set_shadow',
    description: 'Add or update a drop shadow on a node.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID' },
            offset_x: { type: 'number', description: 'Shadow horizontal offset' },
            offset_y: { type: 'number', description: 'Shadow vertical offset' },
            blur: { type: 'number', description: 'Shadow blur radius', minimum: 0 },
            r: { type: 'number', description: 'Shadow color red (0–1)' },
            g: { type: 'number', description: 'Shadow color green (0–1)' },
            b: { type: 'number', description: 'Shadow color blue (0–1)' },
            a: { type: 'number', description: 'Shadow color alpha (0–1)', default: 0.5 },
        },
        required: ['node_id', 'offset_x', 'offset_y', 'blur', 'r', 'g', 'b'],
    },
    category: 'effects',
};

const remove_shadow: ToolDefinition = {
    name: 'remove_shadow',
    description: 'Remove the drop shadow from a node.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID' },
        },
        required: ['node_id'],
    },
    category: 'effects',
};

const set_brightness: ToolDefinition = {
    name: 'set_brightness',
    description: 'Set brightness filter on a node. 1.0 = normal, <1 darker, >1 brighter.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID' },
            brightness: { type: 'number', description: 'Brightness multiplier', minimum: 0, maximum: 3 },
        },
        required: ['node_id', 'brightness'],
    },
    category: 'effects',
};

const set_contrast: ToolDefinition = {
    name: 'set_contrast',
    description: 'Set contrast filter on a node. 1.0 = normal.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID' },
            contrast: { type: 'number', description: 'Contrast multiplier', minimum: 0, maximum: 3 },
        },
        required: ['node_id', 'contrast'],
    },
    category: 'effects',
};

const set_saturation: ToolDefinition = {
    name: 'set_saturation',
    description: 'Set saturation filter. 0.0 = grayscale, 1.0 = normal, >1 oversaturated.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID' },
            saturation: { type: 'number', description: 'Saturation multiplier', minimum: 0, maximum: 3 },
        },
        required: ['node_id', 'saturation'],
    },
    category: 'effects',
};

const set_hue_rotate: ToolDefinition = {
    name: 'set_hue_rotate',
    description: 'Rotate the hue of a node by degrees.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID' },
            degrees: { type: 'number', description: 'Hue rotation in degrees (0–360)' },
        },
        required: ['node_id', 'degrees'],
    },
    category: 'effects',
};

// ── Animation ─────────────────────────────────────

const add_keyframe: ToolDefinition = {
    name: 'add_keyframe',
    description: 'Add a keyframe to animate a node property over time.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID to animate' },
            property: {
                type: 'string',
                description: 'Property to animate',
                enum: ['x', 'y', 'width', 'height', 'rotation', 'opacity'],
            },
            time: { type: 'number', description: 'Time in seconds', minimum: 0 },
            value: { type: 'number', description: 'Target value at this time' },
            easing: {
                type: 'string',
                description: 'Easing function',
                enum: ['linear', 'ease', 'ease_in', 'ease_out', 'ease_in_out', 'bounce', 'spring'],
            },
        },
        required: ['node_id', 'property', 'time', 'value', 'easing'],
    },
    category: 'animation',
};

const set_duration: ToolDefinition = {
    name: 'set_duration',
    description: 'Set the animation timeline duration in seconds.',
    parameters: {
        type: 'object',
        properties: {
            duration: { type: 'number', description: 'Duration in seconds', minimum: 0.1 },
        },
        required: ['duration'],
    },
    category: 'animation',
};

const set_looping: ToolDefinition = {
    name: 'set_looping',
    description: 'Enable or disable animation looping.',
    parameters: {
        type: 'object',
        properties: {
            looping: { type: 'boolean', description: 'true to loop, false for one-shot' },
        },
        required: ['looping'],
    },
    category: 'animation',
};

const anim_play: ToolDefinition = {
    name: 'anim_play',
    description: 'Play the animation timeline.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'animation',
};

const anim_pause: ToolDefinition = {
    name: 'anim_pause',
    description: 'Pause the animation.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'animation',
};

const anim_stop: ToolDefinition = {
    name: 'anim_stop',
    description: 'Stop animation and reset to beginning.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'animation',
};

const anim_seek: ToolDefinition = {
    name: 'anim_seek',
    description: 'Seek to a specific time in the animation.',
    parameters: {
        type: 'object',
        properties: {
            time: { type: 'number', description: 'Time in seconds to seek to', minimum: 0 },
        },
        required: ['time'],
    },
    category: 'animation',
};

const anim_set_speed: ToolDefinition = {
    name: 'anim_set_speed',
    description: 'Set playback speed multiplier (0.5 = half speed, 2.0 = double).',
    parameters: {
        type: 'object',
        properties: {
            speed: { type: 'number', description: 'Speed multiplier', minimum: 0.1, maximum: 10 },
        },
        required: ['speed'],
    },
    category: 'animation',
};

// ── Selection ─────────────────────────────────────

const select_node: ToolDefinition = {
    name: 'select_node',
    description: 'Select a single node (clears previous selection).',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Node ID to select' },
        },
        required: ['node_id'],
    },
    category: 'selection',
};

const deselect_all: ToolDefinition = {
    name: 'deselect_all',
    description: 'Deselect all nodes.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'selection',
};

// ── Scene ─────────────────────────────────────────

const clear_scene: ToolDefinition = {
    name: 'clear_scene',
    description: 'Remove all elements from the canvas.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'scene',
};

const delete_selected: ToolDefinition = {
    name: 'delete_selected',
    description: 'Delete currently selected nodes.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'scene',
};

// ── Undo ──────────────────────────────────────────

const undo_action: ToolDefinition = {
    name: 'undo',
    description: 'Undo the last action.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'undo',
};

const redo_action: ToolDefinition = {
    name: 'redo',
    description: 'Redo the last undone action.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'undo',
};

// ── Compound Tools (Multi-step, virtual) ──────────

const create_layout: ToolDefinition = {
    name: 'create_layout',
    description: 'Create multiple elements in a grid or row/column layout. AI decomposes into individual add_* calls.',
    parameters: {
        type: 'object',
        properties: {
            pattern: { type: 'string', description: 'Layout pattern', enum: ['row', 'column', 'grid', 'circle'] },
            count: { type: 'number', description: 'Number of elements', minimum: 1, maximum: 50 },
            element_type: { type: 'string', description: 'Element type', enum: ['rect', 'rounded_rect', 'ellipse'] },
            start_x: { type: 'number', description: 'Starting X position' },
            start_y: { type: 'number', description: 'Starting Y position' },
            spacing: { type: 'number', description: 'Gap between elements', default: 20 },
            element_width: { type: 'number', description: 'Width of each element', default: 50 },
            element_height: { type: 'number', description: 'Height of each element', default: 50 },
            color_scheme: { type: 'string', description: 'Color scheme', enum: ['rainbow', 'monochrome', 'gradient', 'random'], default: 'rainbow' },
        },
        required: ['pattern', 'count', 'element_type'],
    },
    category: 'compound',
};

const animate_all: ToolDefinition = {
    name: 'animate_all',
    description: 'Apply an animation to all nodes or a list of nodes.',
    parameters: {
        type: 'object',
        properties: {
            animation_type: { type: 'string', description: 'Animation type', enum: ['fade_in', 'slide_in', 'bounce', 'rotate', 'pulse', 'wave'] },
            node_ids: { type: 'array', items: { type: 'number' }, description: 'Node IDs to animate. Omit to animate all.' },
            duration: { type: 'number', description: 'Animation duration in seconds', default: 2.0 },
            stagger: { type: 'number', description: 'Stagger delay between elements in seconds', default: 0.1 },
        },
        required: ['animation_type'],
    },
    category: 'compound',
};

const analyze_scene: ToolDefinition = {
    name: 'analyze_scene',
    description: 'Analyze the current canvas and return a detailed description of all elements, their positions, relationships, and design suggestions.',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'compound',
};

// ── All Tools Registry ────────────────────────────

// ── Text & Image ─────────────────────────────────

const add_text: ToolDefinition = {
    name: 'add_text',
    description: 'Add a text element to the canvas. Returns the new element ID. Use for headlines, subtext, CTA labels, body copy.',
    parameters: {
        type: 'object',
        properties: {
            x: { type: 'number', description: 'X position (left edge)' },
            y: { type: 'number', description: 'Y position (top edge)' },
            content: { type: 'string', description: 'Text string to display' },
            font_size: { type: 'number', description: 'Font size in pixels', minimum: 6, default: 18 },
            font_family: { type: 'string', description: 'Font family e.g. "Inter", "Georgia", "system-ui"', default: 'Inter, system-ui, sans-serif' },
            font_weight: { type: 'string', description: 'Font weight: "400" (normal), "700" (bold), "900" (black)', default: '400' },
            color_hex: { type: 'string', description: 'Text color as hex e.g. "#ffffff" or "#1a1a2e"', default: '#000000' },
            width: { type: 'number', description: 'Box width in pixels (text wraps inside). Default 200.', minimum: 20, default: 200 },
            text_align: { type: 'string', description: 'Text alignment', enum: ['left', 'center', 'right'], default: 'left' },
            line_height: { type: 'number', description: 'Line height multiplier (e.g. 1.2)', minimum: 0.8, default: 1.2 },
        },
        required: ['x', 'y', 'content'],
    },
    category: 'create',
};

const set_animation_preset: ToolDefinition = {
    name: 'set_animation_preset',
    description: 'Apply a named animation preset to an element (Fabric/overlay node). Presets define how elements enter the scene. Use to make banners dynamic.',
    parameters: {
        type: 'object',
        properties: {
            node_id: { type: 'number', description: 'Engine node ID returned by add_rect, add_text, etc.' },
            preset: {
                type: 'string',
                description: 'Animation preset name',
                enum: ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'descend'],
            },
            duration: { type: 'number', description: 'Duration of the entrance animation in seconds', minimum: 0.1, default: 0.4 },
            delay: { type: 'number', description: 'Start delay (stagger) in seconds from timeline start', minimum: 0, default: 0 },
        },
        required: ['node_id', 'preset'],
    },
    category: 'animation',
};

const render_banner: ToolDefinition = {
    name: 'render_banner',
    description: 'Create a complete banner layout in one call. Describe all elements declaratively. The engine sequences through the array and creates each element. Use this instead of multiple add_rect + add_text calls.',
    parameters: {
        type: 'object',
        properties: {
            elements: {
                type: 'array',
                description: 'Array of elements to create. Each element must have a "type" field.',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['rect', 'rounded_rect', 'gradient_rect', 'ellipse', 'text'], description: 'Element type' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        r: { type: 'number', description: 'Red 0-1 (shapes)' },
                        g: { type: 'number', description: 'Green 0-1 (shapes)' },
                        b: { type: 'number', description: 'Blue 0-1 (shapes)' },
                        a: { type: 'number', description: 'Alpha 0-1', default: 1 },
                        radius: { type: 'number', description: 'Corner radius (rounded_rect only)' },
                        content: { type: 'string', description: 'Text string (text only)' },
                        font_size: { type: 'number', description: 'Font size px (text only)' },
                        font_weight: { type: 'string', description: '400|700|900 (text only)' },
                        color_hex: { type: 'string', description: 'Text color hex (text only)' },
                        width: { type: 'number', description: 'Text box width (text only)' },
                        animation: { type: 'string', description: 'Animation preset (optional)', enum: ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'descend'] },
                        anim_delay: { type: 'number', description: 'Animation stagger delay in seconds', default: 0 },
                        anim_duration: { type: 'number', description: 'Animation duration in seconds', default: 0.4 },
                    },
                },
            },
        },
        required: ['elements'],
    },
    category: 'compound',
};

// ── Image Generation (Atomic) ─────────────────────

const generate_image: ToolDefinition = {
    name: 'generate_image',
    description: 'Generate an image using AI (NANO Banana 2.0 / Imagen). Returns a data URL that can be used with set_canvas_background or add_image_layer. Use this when the user wants a background image, product photo, or any visual element.',
    parameters: {
        type: 'object',
        properties: {
            prompt: { type: 'string', description: 'Detailed description of the image to generate. Be specific about mood, lighting, composition, and subject.' },
            style: {
                type: 'string',
                description: 'Visual style hint',
                enum: ['realistic', 'illustration', 'abstract', 'minimal', 'photography'],
                default: 'photography',
            },
        },
        required: ['prompt'],
    },
    category: 'create',
};

const set_canvas_background: ToolDefinition = {
    name: 'set_canvas_background',
    description: 'Set an image as the full canvas background. The image fills the entire canvas (0,0 to canvasW,canvasH). Use after generate_image to place the result as background. Pass the image_url returned by generate_image.',
    parameters: {
        type: 'object',
        properties: {
            image_url: { type: 'string', description: 'Data URL of the image (from generate_image result)' },
        },
        required: ['image_url'],
    },
    category: 'create',
};

const add_image_layer: ToolDefinition = {
    name: 'add_image_layer',
    description: 'Add an image as a new layer at a specific position and size. Use for product images, logos, or decorative elements — NOT for backgrounds (use set_canvas_background for that).',
    parameters: {
        type: 'object',
        properties: {
            image_url: { type: 'string', description: 'Data URL of the image (from generate_image result)' },
            x: { type: 'number', description: 'X position (left edge)', default: 0 },
            y: { type: 'number', description: 'Y position (top edge)', default: 0 },
            w: { type: 'number', description: 'Width in pixels. Omit to auto-size.' },
            h: { type: 'number', description: 'Height in pixels. Omit to auto-size.' },
            name: { type: 'string', description: 'Layer name for identification', default: 'image' },
        },
        required: ['image_url'],
    },
    category: 'create',
};

// ── Full Design Pipeline (Meta-Tool) ──────────────

const generate_full_design: ToolDefinition = {
    name: 'generate_full_design',
    description: 'Generate a complete creative design from scratch. This is a high-level tool that runs the full AI pipeline: color palette selection, layout template, copy generation, and element rendering. Use this when the user wants to create an entirely NEW design (e.g. "create a nike ad", "design a summer sale banner"). For modifications to existing designs, use individual tools instead.',
    parameters: {
        type: 'object',
        properties: {
            prompt: { type: 'string', description: 'Full design brief describing what to create' },
        },
        required: ['prompt'],
    },
    category: 'compound',
};

export const ALL_TOOLS: ToolDefinition[] = [
    // Create
    add_rect, add_rounded_rect, add_ellipse, add_gradient_rect,
    // Text
    add_text,
    // Style
    set_opacity, set_blend_mode,
    // Effects
    set_shadow, remove_shadow, set_brightness, set_contrast, set_saturation, set_hue_rotate,
    // Animation
    add_keyframe, set_duration, set_looping, anim_play, anim_pause, anim_stop, anim_seek, anim_set_speed,
    set_animation_preset,
    // Selection
    select_node, deselect_all,
    // Scene
    clear_scene, delete_selected,
    // Undo
    undo_action, redo_action,
    // Compound
    create_layout, animate_all, analyze_scene, render_banner,
    // Image Generation (Atomic)
    generate_image, set_canvas_background, add_image_layer,
    // Full Design Pipeline
    generate_full_design,
    // Dashboard (app-level)
    ...DASHBOARD_TOOLS,
];


/**
 * Convert tool definitions to OpenAI function-calling format.
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
 * Convert tool definitions to Claude tool-calling format.
 * Claude uses `input_schema` instead of `parameters`.
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
 * Get tool by name.
 */
export function getToolByName(name: string): ToolDefinition | undefined {
    return ALL_TOOLS.find(t => t.name === name);
}
