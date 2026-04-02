// ─────────────────────────────────────────────────
// dashboardTools.test.ts — Dashboard tool registry tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { DASHBOARD_TOOLS, DASHBOARD_TOOL_NAMES } from './dashboardTools';

describe('dashboardTools', () => {
    describe('DASHBOARD_TOOLS', () => {
        it('should export a non-empty array of tools', () => {
            expect(Array.isArray(DASHBOARD_TOOLS)).toBe(true);
            expect(DASHBOARD_TOOLS.length).toBeGreaterThan(0);
        });

        it('should have unique tool names', () => {
            const names = DASHBOARD_TOOLS.map(t => t.name);
            const unique = new Set(names);
            expect(unique.size).toBe(names.length);
        });

        it('should have valid structure for every tool', () => {
            for (const tool of DASHBOARD_TOOLS) {
                expect(tool.name).toBeTruthy();
                expect(typeof tool.name).toBe('string');
                expect(tool.description).toBeTruthy();
                expect(typeof tool.description).toBe('string');
                expect(tool.parameters).toBeDefined();
                expect(tool.parameters.type).toBe('object');
                expect(tool.parameters.properties).toBeDefined();
            }
        });

        it('should include core CRUD tools', () => {
            const names = DASHBOARD_TOOLS.map(t => t.name);
            expect(names).toContain('list_creative_sets');
            expect(names).toContain('create_creative_set');
            expect(names).toContain('delete_creative_set');
            expect(names).toContain('rename_creative_set');
        });

        it('should include variant management tools', () => {
            const names = DASHBOARD_TOOLS.map(t => t.name);
            expect(names).toContain('add_size');
            expect(names).toContain('remove_size');
        });

        it('should include navigation tool', () => {
            const names = DASHBOARD_TOOLS.map(t => t.name);
            expect(names).toContain('navigate_to');
        });

        it('should include element editing tools', () => {
            const names = DASHBOARD_TOOLS.map(t => t.name);
            expect(names).toContain('list_elements');
            expect(names).toContain('update_element_text');
            expect(names).toContain('update_element_property');
        });

        it('should include element creation tools', () => {
            const names = DASHBOARD_TOOLS.map(t => t.name);
            expect(names).toContain('add_text');
            expect(names).toContain('add_shape');
            expect(names).toContain('add_button');
        });

        it('should include animation tool', () => {
            expect(DASHBOARD_TOOLS.map(t => t.name)).toContain('set_animation');
        });

        it('should include dynamic action tool', () => {
            expect(DASHBOARD_TOOLS.map(t => t.name)).toContain('execute_dynamic_action');
        });

        it('should have required fields on tools that need params', () => {
            const createCS = DASHBOARD_TOOLS.find(t => t.name === 'create_creative_set');
            expect(createCS?.parameters.required).toContain('name');
            expect(createCS?.parameters.required).toContain('width');
            expect(createCS?.parameters.required).toContain('height');

            const addText = DASHBOARD_TOOLS.find(t => t.name === 'add_text');
            expect(addText?.parameters.required).toContain('content');
            expect(addText?.parameters.required).toContain('y');
        });

        it('should have categories on all tools', () => {
            for (const tool of DASHBOARD_TOOLS) {
                expect(tool.category).toBeTruthy();
            }
        });
    });

    describe('DASHBOARD_TOOL_NAMES', () => {
        it('should be a Set', () => {
            expect(DASHBOARD_TOOL_NAMES instanceof Set).toBe(true);
        });

        it('should match DASHBOARD_TOOLS length', () => {
            expect(DASHBOARD_TOOL_NAMES.size).toBe(DASHBOARD_TOOLS.length);
        });

        it('should contain all tool names', () => {
            for (const tool of DASHBOARD_TOOLS) {
                expect(DASHBOARD_TOOL_NAMES.has(tool.name)).toBe(true);
            }
        });

        it('should support lookup', () => {
            expect(DASHBOARD_TOOL_NAMES.has('create_creative_set')).toBe(true);
            expect(DASHBOARD_TOOL_NAMES.has('nonexistent_tool')).toBe(false);
        });
    });
});
