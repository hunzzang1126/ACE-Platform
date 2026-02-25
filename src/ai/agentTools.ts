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
    description: string;
    enum?: string[];
    items?: { type: string };
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

export const ALL_TOOLS: ToolDefinition[] = [
    // Create
    add_rect, add_rounded_rect, add_ellipse, add_gradient_rect,
    // Style
    set_opacity, set_blend_mode,
    // Effects
    set_shadow, remove_shadow, set_brightness, set_contrast, set_saturation, set_hue_rotate,
    // Animation
    add_keyframe, set_duration, set_looping, anim_play, anim_pause, anim_stop, anim_seek, anim_set_speed,
    // Selection
    select_node, deselect_all,
    // Scene
    clear_scene, delete_selected,
    // Undo
    undo_action, redo_action,
    // Compound
    create_layout, animate_all, analyze_scene,
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
 * Get tool by name.
 */
export function getToolByName(name: string): ToolDefinition | undefined {
    return ALL_TOOLS.find(t => t.name === name);
}
