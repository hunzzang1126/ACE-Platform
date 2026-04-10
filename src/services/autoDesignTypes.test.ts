// ─────────────────────────────────────────────────
// autoDesignTypes — Schema Validation Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { RENDER_BANNER_TOOL, REARRANGE_BANNER_TOOL } from './autoDesignTypes';

describe('RENDER_BANNER_TOOL — Schema Integrity', () => {
    it('has required tool metadata', () => {
        expect(RENDER_BANNER_TOOL.name).toBe('render_banner');
        expect(RENDER_BANNER_TOOL.description).toBeDefined();
        expect(RENDER_BANNER_TOOL.description.length).toBeGreaterThan(10);
    });

    it('input_schema is valid JSON Schema object', () => {
        const schema = RENDER_BANNER_TOOL.input_schema;
        expect(schema.type).toBe('object');
        expect(schema.required).toContain('elements');
    });

    it('elements array accepts all element types', () => {
        const props = RENDER_BANNER_TOOL.input_schema.properties.elements.items.properties;
        expect(props.type.enum).toEqual(['rect', 'rounded_rect', 'ellipse', 'text']);
    });

    it('has all visual properties for shapes', () => {
        const props = RENDER_BANNER_TOOL.input_schema.properties.elements.items.properties;
        expect(props.x).toBeDefined();
        expect(props.y).toBeDefined();
        expect(props.w).toBeDefined();
        expect(props.h).toBeDefined();
        expect(props.r).toBeDefined(); // red
        expect(props.g).toBeDefined(); // green
        expect(props.b).toBeDefined(); // blue
        expect(props.a).toBeDefined(); // alpha
        expect(props.radius).toBeDefined();
    });

    it('has text-specific properties', () => {
        const props = RENDER_BANNER_TOOL.input_schema.properties.elements.items.properties;
        expect(props.content).toBeDefined();
        expect(props.font_size).toBeDefined();
        expect(props.font_weight).toBeDefined();
        expect(props.color_hex).toBeDefined();
        expect(props.text_align).toBeDefined();
    });

    it('has gradient properties', () => {
        const props = RENDER_BANNER_TOOL.input_schema.properties.elements.items.properties;
        expect(props.gradient_start_hex).toBeDefined();
        expect(props.gradient_end_hex).toBeDefined();
        expect(props.gradient_angle).toBeDefined();
    });

    it('has shadow properties', () => {
        const props = RENDER_BANNER_TOOL.input_schema.properties.elements.items.properties;
        expect(props.shadow_offset_x).toBeDefined();
        expect(props.shadow_offset_y).toBeDefined();
        expect(props.shadow_blur).toBeDefined();
        expect(props.shadow_opacity).toBeDefined();
    });

    it('has typography refinement properties', () => {
        const props = RENDER_BANNER_TOOL.input_schema.properties.elements.items.properties;
        expect(props.letter_spacing).toBeDefined();
        expect(props.line_height).toBeDefined();
    });

    it('has name property for element identification', () => {
        const props = RENDER_BANNER_TOOL.input_schema.properties.elements.items.properties;
        expect(props.name).toBeDefined();
        expect(props.name.type).toBe('string');
    });
});

describe('REARRANGE_BANNER_TOOL — Schema Integrity', () => {
    it('has required tool metadata', () => {
        expect(REARRANGE_BANNER_TOOL.name).toBe('rearrange_banner');
        expect(REARRANGE_BANNER_TOOL.description).toBeDefined();
    });

    it('requires patches array', () => {
        expect(REARRANGE_BANNER_TOOL.input_schema.required).toContain('patches');
    });

    it('patches require elementName', () => {
        const patchItem = REARRANGE_BANNER_TOOL.input_schema.properties.patches.items;
        expect(patchItem.required).toContain('elementName');
    });

    it('patches support position, size, font, and fill', () => {
        const props = REARRANGE_BANNER_TOOL.input_schema.properties.patches.items.properties;
        expect(props.elementName).toBeDefined();
        expect(props.x).toBeDefined();
        expect(props.y).toBeDefined();
        expect(props.w).toBeDefined();
        expect(props.h).toBeDefined();
        expect(props.fontSize).toBeDefined();
        expect(props.fill).toBeDefined();
    });

    it('supports additions array for new elements', () => {
        const additions = REARRANGE_BANNER_TOOL.input_schema.properties.additions;
        expect(additions).toBeDefined();
        expect(additions.type).toBe('array');
    });

    it('additions support same element types as render_banner (minus ellipse)', () => {
        const addProps = REARRANGE_BANNER_TOOL.input_schema.properties.additions.items.properties;
        expect(addProps.type.enum).toEqual(['rect', 'rounded_rect', 'text']);
    });
});
