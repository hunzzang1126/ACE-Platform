// ─────────────────────────────────────────────────
// agentTools.test.ts — Tests (v2 eval-first: 9 tools)
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { ALL_TOOLS, getToolByName, getToolsForApi, getToolsForClaude, getToolsForPage } from '@/ai/agentTools';
import type { ToolDefinition } from '@/ai/agentTools';

describe('agentTools', () => {
    // ── Tool Registry ──

    describe('tool registry', () => {
        it('has no duplicate tool names', () => {
            const names = ALL_TOOLS.map((t: ToolDefinition) => t.name);
            const unique = new Set(names);
            expect(unique.size).toBe(names.length);
        });

        it('every tool has a name, description, and parameters', () => {
            for (const tool of ALL_TOOLS) {
                expect(tool.name).toBeTruthy();
                expect(tool.description).toBeTruthy();
                expect(tool.parameters).toBeDefined();
                expect(tool.parameters.type).toBe('object');
            }
        });

        it('every tool has a category', () => {
            const validCategories = ['create', 'modify', 'animate', 'animation', 'compound', 'selection', 'undo', 'dashboard', 'style', 'query', 'effects', 'scene', 'transform'];
            for (const tool of ALL_TOOLS) {
                expect(validCategories).toContain(tool.category);
            }
        });

        it('has exactly 10 tools (7 original + 2 update + 1 undo)', () => {
            expect(ALL_TOOLS.length).toBe(10);
        });

        it('includes execute_dynamic_action as primary tool', () => {
            const tool = getToolByName('execute_dynamic_action');
            expect(tool).toBeDefined();
            expect(tool!.category).toBe('compound');
            expect(tool!.parameters.required).toContain('description');
            expect(tool!.parameters.required).toContain('code');
        });

        it('includes analyze_scene as read-only tool', () => {
            const tool = getToolByName('analyze_scene');
            expect(tool).toBeDefined();
            expect(tool!.parameters.required.length).toBe(0);
        });
    });

    // ── replace_background_image Tool ──

    describe('replace_background_image', () => {
        it('exists in tool registry', () => {
            const tool = getToolByName('replace_background_image');
            expect(tool).toBeDefined();
        });

        it('has correct category', () => {
            const tool = getToolByName('replace_background_image');
            expect(tool!.category).toBe('create');
        });

        it('requires prompt parameter', () => {
            const tool = getToolByName('replace_background_image');
            expect(tool!.parameters.required).toContain('prompt');
        });

        it('has style enum with valid options', () => {
            const tool = getToolByName('replace_background_image');
            const style = tool!.parameters.properties?.style;
            expect(style).toBeDefined();
            expect(style.enum).toContain('realistic');
            expect(style.enum).toContain('photography');
            expect(style.enum).toContain('abstract');
        });

        it('description mentions background replacement', () => {
            const tool = getToolByName('replace_background_image');
            expect(tool!.description.toLowerCase()).toContain('replace');
            expect(tool!.description.toLowerCase()).toContain('background');
        });
    });

    // ── generate_full_design Tool ──

    describe('generate_full_design', () => {
        it('exists in tool registry', () => {
            const tool = getToolByName('generate_full_design');
            expect(tool).toBeDefined();
        });

        it('has compound category', () => {
            const tool = getToolByName('generate_full_design');
            expect(tool!.category).toBe('compound');
        });

        it('requires prompt', () => {
            const tool = getToolByName('generate_full_design');
            expect(tool!.parameters.required).toContain('prompt');
        });
    });

    // ── generate_image Tool ──

    describe('generate_image', () => {
        it('exists and has create category', () => {
            const tool = getToolByName('generate_image');
            expect(tool).toBeDefined();
            expect(tool!.category).toBe('create');
        });

        it('requires prompt', () => {
            const tool = getToolByName('generate_image');
            expect(tool!.parameters.required).toContain('prompt');
        });
    });

    // ── add_text and add_button ──

    describe('creation tools', () => {
        it('add_text exists with content param', () => {
            const tool = getToolByName('add_text');
            expect(tool).toBeDefined();
            expect(tool!.parameters.required).toContain('content');
        });

        it('add_button exists', () => {
            const tool = getToolByName('add_button');
            expect(tool).toBeDefined();
            expect(tool!.category).toBe('create');
        });
    });

    // ── API Format Converters ──

    describe('getToolsForApi', () => {
        it('returns OpenAI-compatible format', () => {
            const tools = getToolsForApi();
            expect(tools.length).toBe(ALL_TOOLS.length);
            for (const t of tools) {
                expect(t.type).toBe('function');
                expect(t.function).toBeDefined();
                expect(t.function.name).toBeTruthy();
                expect(t.function.description).toBeTruthy();
                expect(t.function.parameters).toBeDefined();
            }
        });
    });

    describe('getToolsForClaude', () => {
        it('returns Claude-compatible format with input_schema', () => {
            const tools = getToolsForClaude();
            expect(tools.length).toBe(ALL_TOOLS.length);
            for (const t of tools) {
                expect(t.name).toBeTruthy();
                expect(t.description).toBeTruthy();
                expect(t.input_schema).toBeDefined();
            }
        });
    });

    // ── getToolByName ──

    describe('getToolByName', () => {
        it('returns undefined for non-existent tool', () => {
            expect(getToolByName('non_existent_tool')).toBeUndefined();
        });

        it('finds add_text', () => {
            expect(getToolByName('add_text')).toBeDefined();
        });

        it('finds execute_dynamic_action', () => {
            expect(getToolByName('execute_dynamic_action')).toBeDefined();
        });
    });

    // ── Tool Differentiation ──

    describe('tool routing', () => {
        it('replace_background_image is separate from generate_full_design', () => {
            const bgTool = getToolByName('replace_background_image');
            const designTool = getToolByName('generate_full_design');
            expect(bgTool).toBeDefined();
            expect(designTool).toBeDefined();
            expect(bgTool!.name).not.toBe(designTool!.name);
            expect(bgTool!.category).toBe('create');
            expect(designTool!.category).toBe('compound');
        });

        it('execute_dynamic_action description mentions store access', () => {
            const tool = getToolByName('execute_dynamic_action');
            expect(tool!.description.toLowerCase()).toContain('designstore');
        });
    });

    // ── Update Tools ──

    describe('update tools', () => {
        it('update_element_text exists with required params', () => {
            const tool = getToolByName('update_element_text');
            expect(tool).toBeDefined();
            expect(tool!.parameters.required).toContain('element_name');
            expect(tool!.parameters.required).toContain('new_text');
            expect(tool!.category).toBe('transform');
        });

        it('update_element_property exists with required params', () => {
            const tool = getToolByName('update_element_property');
            expect(tool).toBeDefined();
            expect(tool!.parameters.required).toContain('element_name');
            expect(tool!.parameters.required).toContain('property');
            expect(tool!.parameters.required).toContain('value');
        });
    });

    // ── Page Tool Filtering ──

    describe('getToolsForPage', () => {
        it('★ REGRESSION: size-dashboard has NO creation tools', () => {
            const tools = getToolsForPage('size-dashboard');
            const names = tools.map(t => t.name);
            expect(names).not.toContain('add_text');
            expect(names).not.toContain('add_button');
            expect(names).not.toContain('generate_image');
            expect(names).not.toContain('generate_full_design');
        });

        it('size-dashboard has update and analyze tools', () => {
            const tools = getToolsForPage('size-dashboard');
            const names = tools.map(t => t.name);
            expect(names).toContain('update_element_text');
            expect(names).toContain('update_element_property');
            expect(names).toContain('execute_dynamic_action');
            expect(names).toContain('analyze_scene');
        });

        it('canvas-editor has ALL tools including creation', () => {
            const tools = getToolsForPage('canvas-editor');
            const names = tools.map(t => t.name);
            expect(names).toContain('add_text');
            expect(names).toContain('add_button');
            expect(names).toContain('generate_full_design');
            expect(names).toContain('update_element_text');
            expect(names).toContain('undo_ai_action');
        });

        it('undo_ai_action is available on size-dashboard', () => {
            const tools = getToolsForPage('size-dashboard');
            const names = tools.map(t => t.name);
            expect(names).toContain('undo_ai_action');
        });
    });
});
