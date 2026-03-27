// ─────────────────────────────────────────────────
// autoDesignTypes — Types + Tool Schemas for Auto Design
// ─────────────────────────────────────────────────

export interface RenderElement {
    type: 'rect' | 'rounded_rect' | 'ellipse' | 'text';
    x: number; y: number; w: number; h: number;
    r?: number; g?: number; b?: number; a?: number;
    radius?: number;
    gradient_start_hex?: string; gradient_end_hex?: string; gradient_angle?: number;
    content?: string; font_size?: number; font_weight?: string;
    color_hex?: string; text_align?: string;
    letter_spacing?: number; line_height?: number;
    shadow_offset_x?: number; shadow_offset_y?: number;
    shadow_blur?: number; shadow_opacity?: number;
    name?: string;
}

export interface RearrangePatch {
    elementName: string;
    x?: number; y?: number; w?: number; h?: number;
    fontSize?: number; fill?: string;
}

export interface FromScratchResult { mode: 'from_scratch'; elements: RenderElement[]; }
export interface AssetContextResult { mode: 'asset_context'; patches: RearrangePatch[]; additions?: RenderElement[]; }
export type AutoDesignResult = FromScratchResult | AssetContextResult;

export interface CanvasElementInfo {
    id: number; name: string; type: string;
    x: number; y: number; w: number; h: number;
}

export const RENDER_BANNER_TOOL = {
    name: 'render_banner',
    description: 'Create a professional creative layout with layered composition. Generate 8-15 elements across structure, content, action, and polish layers.',
    input_schema: {
        type: 'object',
        required: ['elements'],
        properties: {
            elements: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['rect', 'rounded_rect', 'ellipse', 'text'] },
                        name: { type: 'string', description: 'Descriptive name: background, accent_bar, headline, subheadline, cta_button, cta_label, divider, tag_badge, brand_mark, etc.' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        r: { type: 'number' }, g: { type: 'number' },
                        b: { type: 'number' }, a: { type: 'number' },
                        radius: { type: 'number' },
                        content: { type: 'string' },
                        font_size: { type: 'number' }, font_weight: { type: 'string' },
                        color_hex: { type: 'string' }, text_align: { type: 'string' },
                        letter_spacing: { type: 'number', description: 'px. Tight for headlines (-0.5 to -1.5), wide for labels (+1 to +3).' },
                        line_height: { type: 'number', description: 'Multiplier. 1.0–1.15 headlines, 1.3–1.6 body.' },
                        gradient_start_hex: { type: 'string' }, gradient_end_hex: { type: 'string' }, gradient_angle: { type: 'number' },
                        shadow_offset_x: { type: 'number', description: 'Drop shadow offset X. 2-5 for subtle depth.' },
                        shadow_offset_y: { type: 'number', description: 'Drop shadow offset Y. 3-8 for depth.' },
                        shadow_blur: { type: 'number', description: 'Shadow blur radius. 6-15 for soft shadow.' },
                        shadow_opacity: { type: 'number', description: 'Shadow opacity 0.0-0.5. 0.2-0.3 for subtle.' },
                    },
                },
            },
        },
    },
};

export const REARRANGE_BANNER_TOOL = {
    name: 'rearrange_banner',
    description: 'Reorganize existing elements into a polished layout. Move, resize, recolor existing elements and add new ones.',
    input_schema: {
        type: 'object',
        required: ['patches'],
        properties: {
            patches: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['elementName'],
                    properties: {
                        elementName: { type: 'string' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        fontSize: { type: 'number' }, fill: { type: 'string' },
                    },
                },
            },
            additions: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['rect', 'rounded_rect', 'text'] },
                        name: { type: 'string' },
                        x: { type: 'number' }, y: { type: 'number' },
                        w: { type: 'number' }, h: { type: 'number' },
                        r: { type: 'number' }, g: { type: 'number' },
                        b: { type: 'number' }, a: { type: 'number' },
                        radius: { type: 'number' }, content: { type: 'string' },
                        font_size: { type: 'number' }, font_weight: { type: 'string' },
                        color_hex: { type: 'string' }, text_align: { type: 'string' },
                        letter_spacing: { type: 'number' }, line_height: { type: 'number' },
                    },
                },
            },
        },
    },
};
