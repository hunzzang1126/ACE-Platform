// ─────────────────────────────────────────────────
// Tool Parameter Validator — Unit Tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { validateToolParams, isValidHex, sanitizeHex, clampNumber } from './toolParamValidator';

describe('Tool Parameter Validator', () => {
    describe('isValidHex', () => {
        it('accepts valid 6-digit hex', () => {
            expect(isValidHex('#FF0000')).toBe(true);
            expect(isValidHex('#2DD4BF')).toBe(true);
        });
        it('accepts valid 3-digit hex', () => {
            expect(isValidHex('#F00')).toBe(true);
        });
        it('rejects invalid hex', () => {
            expect(isValidHex('red')).toBe(false);
            expect(isValidHex('FF0000')).toBe(false); // missing #
            expect(isValidHex('#GGGGGG')).toBe(false);
            expect(isValidHex('')).toBe(false);
            expect(isValidHex(123)).toBe(false);
        });
    });

    describe('sanitizeHex', () => {
        it('passes through valid hex', () => {
            expect(sanitizeHex('#FF0000')).toBe('#FF0000');
        });
        it('auto-fixes missing #', () => {
            expect(sanitizeHex('FF0000')).toBe('#FF0000');
            expect(sanitizeHex('2DD4BF')).toBe('#2DD4BF');
        });
        it('returns null for unfixable values', () => {
            expect(sanitizeHex('red')).toBeNull();
            expect(sanitizeHex(123)).toBeNull();
        });
    });

    describe('clampNumber', () => {
        it('clamps to range', () => {
            expect(clampNumber(150, 0, 100, 50)).toBe(100);
            expect(clampNumber(-10, 0, 100, 50)).toBe(0);
            expect(clampNumber(50, 0, 100, 50)).toBe(50);
        });
        it('returns fallback for non-numbers', () => {
            expect(clampNumber('abc', 0, 100, 50)).toBe(50);
            expect(clampNumber(undefined, 0, 100, 42)).toBe(42);
        });
    });

    describe('generate_image', () => {
        it('passes valid params', () => {
            const result = validateToolParams('generate_image', {
                prompt: 'A beautiful sunset',
                style: 'photography',
            });
            expect(result.valid).toBe(true);
        });
        it('rejects empty prompt', () => {
            const result = validateToolParams('generate_image', { prompt: '' });
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('prompt');
        });
        it('fixes invalid style to default', () => {
            const result = validateToolParams('generate_image', {
                prompt: 'test prompt',
                style: 'invalid_style',
            });
            expect(result.valid).toBe(true);
            expect(result.sanitized.style).toBe('photography');
        });
    });

    describe('update_element_text', () => {
        it('passes valid params', () => {
            const result = validateToolParams('update_element_text', {
                element_name: 'headline',
                new_text: 'New Title',
            });
            expect(result.valid).toBe(true);
        });
        it('rejects missing element_name', () => {
            const result = validateToolParams('update_element_text', { new_text: 'test' });
            expect(result.valid).toBe(false);
        });
        it('rejects missing new_text', () => {
            const result = validateToolParams('update_element_text', { element_name: 'headline' });
            expect(result.valid).toBe(false);
        });
    });

    describe('update_element_property', () => {
        it('passes valid params', () => {
            const result = validateToolParams('update_element_property', {
                element_name: 'headline',
                property: 'color',
                value: '#FF0000',
            });
            expect(result.valid).toBe(true);
        });
        it('auto-fixes hex missing #', () => {
            const result = validateToolParams('update_element_property', {
                element_name: 'headline',
                property: 'fill',
                value: '2DD4BF',
            });
            expect(result.valid).toBe(true);
            expect(result.sanitized.value).toBe('#2DD4BF');
        });
        it('rejects invalid hex color', () => {
            const result = validateToolParams('update_element_property', {
                element_name: 'headline',
                property: 'color',
                value: 'not-a-color',
            });
            expect(result.valid).toBe(false);
        });
        it('clamps fontSize to valid range', () => {
            const result = validateToolParams('update_element_property', {
                element_name: 'headline',
                property: 'fontSize',
                value: '99999',
            });
            expect(result.valid).toBe(true);
            expect(Number(result.sanitized.value)).toBe(999);
        });
        it('clamps opacity to 0-1', () => {
            const result = validateToolParams('update_element_property', {
                element_name: 'headline',
                property: 'opacity',
                value: '2.5',
            });
            expect(result.valid).toBe(true);
            expect(Number(result.sanitized.value)).toBe(1);
        });
    });

    describe('execute_dynamic_action', () => {
        it('passes valid code', () => {
            const result = validateToolParams('execute_dynamic_action', {
                code: 'console.log("hello")',
            });
            expect(result.valid).toBe(true);
        });
        it('rejects empty code', () => {
            const result = validateToolParams('execute_dynamic_action', { code: '' });
            expect(result.valid).toBe(false);
        });
        it('rejects missing code', () => {
            const result = validateToolParams('execute_dynamic_action', {});
            expect(result.valid).toBe(false);
        });
    });

    describe('add_text', () => {
        it('passes valid params with content field', () => {
            const result = validateToolParams('add_text', {
                content: 'Hello',
                color: '#FFFFFF',
                fontSize: 24,
            });
            expect(result.valid).toBe(true);
        });
        it('normalizes text to content', () => {
            const result = validateToolParams('add_text', {
                text: 'Hello',
                color: '#FFFFFF',
            });
            expect(result.valid).toBe(true);
            expect(result.sanitized.content).toBe('Hello');
        });
        it('auto-fixes hex without #', () => {
            const result = validateToolParams('add_text', {
                content: 'Hello',
                color: 'FF0000',
            });
            expect(result.valid).toBe(true);
            expect(result.sanitized.color).toBe('#FF0000');
        });
        it('clamps fontSize', () => {
            const result = validateToolParams('add_text', {
                content: 'Hello',
                fontSize: 2, // too small
            });
            expect(result.valid).toBe(true);
            expect(result.sanitized.fontSize).toBe(6); // clamped to min
        });
    });

    describe('unknown tools pass through', () => {
        it('analyze_scene passes without validation', () => {
            const result = validateToolParams('analyze_scene', {});
            expect(result.valid).toBe(true);
        });
        it('fill_to_page passes without validation', () => {
            const result = validateToolParams('fill_to_page', { node_id: 5 });
            expect(result.valid).toBe(true);
        });
    });
});
