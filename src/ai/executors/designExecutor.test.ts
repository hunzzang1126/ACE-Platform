// ─────────────────────────────────────────────────
// designExecutor.test.ts — Design element CRUD + styling tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock stores ──
const mockCreativeSet = {
    id: 'cs-1',
    name: 'Test',
    masterVariantId: 'v-master',
    variants: [
        {
            id: 'v-master',
            preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'banner' },
            elements: [
                { id: 'el-1', name: 'Headline', type: 'text', content: 'Hello', color: '#fff', fontSize: 24, fontFamily: 'Inter' },
                { id: 'el-2', name: 'CTA Button', type: 'button', label: 'Buy Now', backgroundColor: '#333' },
                { id: 'el-3', name: 'Background', type: 'shape', fill: '#000000' },
            ],
            locales: {},
        },
    ],
};

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: { getState: () => ({ creativeSets: [] }) },
}));

vi.mock('@/stores/designStore', () => ({
    useDesignStore: {
        getState: () => ({ creativeSet: JSON.parse(JSON.stringify(mockCreativeSet)) }),
        setState: vi.fn(),
    },
}));

vi.mock('@/hooks/useAnimationPresets', () => ({
    useAnimPresetStore: { getState: () => ({}) },
}));

vi.mock('./designElementCreators', () => ({
    handleAddText: vi.fn(() => ({ success: true, message: 'Text added' })),
    handleAddShape: vi.fn(() => ({ success: true, message: 'Shape added' })),
    handleAddButton: vi.fn(() => ({ success: true, message: 'Button added' })),
    handleSetAnimation: vi.fn(() => ({ success: true, message: 'Animation set' })),
}));

import { executeDesignTool } from './designExecutor';

describe('designExecutor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── list_elements ──

    describe('list_elements', () => {
        it('should list all elements in master variant', () => {
            const result = executeDesignTool('list_elements', {});
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('Headline');
            expect(result?.data).toHaveLength(3);
        });
    });

    // ── update_element_text ──

    describe('update_element_text', () => {
        it('should update text content by name match', () => {
            const result = executeDesignTool('update_element_text', {
                element_name: 'Headline',
                new_text: 'New Title',
            });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('New Title');
        });

        it('should update button label', () => {
            const result = executeDesignTool('update_element_text', {
                element_name: 'CTA',
                new_text: 'Shop Now',
            });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('Shop Now');
        });

        it('should fail when element not found', () => {
            const result = executeDesignTool('update_element_text', {
                element_name: 'Nonexistent',
                new_text: 'test',
            });
            expect(result?.success).toBe(false);
        });

        it('should fail when required params missing', () => {
            const result = executeDesignTool('update_element_text', {});
            expect(result?.success).toBe(false);
        });
    });

    // ── update_element_property ──

    describe('update_element_property', () => {
        it('should update color property', () => {
            const result = executeDesignTool('update_element_property', {
                element_name: 'Headline',
                property: 'color',
                value: '#ff0000',
            });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('color');
        });

        it('should convert numeric properties', () => {
            const result = executeDesignTool('update_element_property', {
                element_name: 'Headline',
                property: 'fontSize',
                value: '32',
            });
            expect(result?.success).toBe(true);
        });

        it('should fail with invalid numeric value', () => {
            const result = executeDesignTool('update_element_property', {
                element_name: 'Headline',
                property: 'fontSize',
                value: 'not-a-number',
            });
            expect(result?.success).toBe(false);
        });

        it('should fail when element not found', () => {
            const result = executeDesignTool('update_element_property', {
                element_name: 'Missing',
                property: 'color',
                value: '#000',
            });
            expect(result?.success).toBe(false);
        });
    });

    // ── Delegated tools ──

    describe('delegated tools', () => {
        it('should delegate add_text to handler', () => {
            const result = executeDesignTool('add_text', { content: 'Hello', y: 50 });
            expect(result?.success).toBe(true);
        });

        it('should delegate add_shape to handler', () => {
            const result = executeDesignTool('add_shape', { y: 100 });
            expect(result?.success).toBe(true);
        });

        it('should delegate add_button to handler', () => {
            const result = executeDesignTool('add_button', { text: 'Click', y: 200 });
            expect(result?.success).toBe(true);
        });

        it('should delegate set_animation to handler', () => {
            const result = executeDesignTool('set_animation', { element_name: 'Headline', preset: 'fade' });
            expect(result?.success).toBe(true);
        });
    });

    // ── set_custom_style ──

    describe('set_custom_style', () => {
        it('should apply custom styles to matched elements', () => {
            const result = executeDesignTool('set_custom_style', {
                element_name: 'Headline',
                styles: { textShadow: '0 2px 4px rgba(0,0,0,0.5)' },
            });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('textShadow');
        });

        it('should fail when element not found', () => {
            const result = executeDesignTool('set_custom_style', {
                element_name: 'Missing',
                styles: { color: 'red' },
            });
            expect(result?.success).toBe(false);
        });

        it('should fail when styles not an object', () => {
            const result = executeDesignTool('set_custom_style', {
                element_name: 'Headline',
                styles: 'not-an-object',
            });
            expect(result?.success).toBe(false);
        });
    });

    // ── execute_dynamic_action ──

    describe('execute_dynamic_action', () => {
        it('should execute valid JS and return result', () => {
            const result = executeDesignTool('execute_dynamic_action', {
                description: 'Test action',
                code: 'return "Done"',
            });
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('Done');
        });

        it('should fail when code is missing', () => {
            const result = executeDesignTool('execute_dynamic_action', {
                description: 'Missing code',
            });
            expect(result?.success).toBe(false);
        });

        it('should catch syntax errors and return failure', () => {
            const result = executeDesignTool('execute_dynamic_action', {
                description: 'Bad code',
                code: 'function { broken syntax }}}',
            });
            expect(result?.success).toBe(false);
        });
    });

    // ── Unknown tool ──

    describe('unknown tool', () => {
        it('should return null for unhandled tools', () => {
            expect(executeDesignTool('nonexistent_tool', {})).toBeNull();
        });
    });
});
