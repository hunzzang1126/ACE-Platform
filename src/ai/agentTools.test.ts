// ─────────────────────────────────────────────────
// agentTools.test.ts — Tests for AI Tool Definitions
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { ALL_TOOLS, getToolByName, getToolsForApi, getToolsForClaude } from '@/ai/agentTools';
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

        it('has at least 25 tools', () => {
            expect(ALL_TOOLS.length).toBeGreaterThanOrEqual(25);
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

        it('description mentions NOT touching other elements', () => {
            const tool = getToolByName('replace_background_image');
            expect(tool!.description).toContain('NOT touch');
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

    // ── set_canvas_background Tool ──

    describe('set_canvas_background', () => {
        it('exists in registry', () => {
            expect(getToolByName('set_canvas_background')).toBeDefined();
        });

        it('accepts both prompt and image_url', () => {
            const tool = getToolByName('set_canvas_background')!;
            expect(tool.parameters.properties).toHaveProperty('prompt');
            expect(tool.parameters.properties).toHaveProperty('image_url');
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

        it('finds add_rect', () => {
            expect(getToolByName('add_rect')).toBeDefined();
        });
    });

    // ── Skill Differentiation ──

    describe('skill routing tools', () => {
        it('★ REGRESSION: replace_background_image is separate from generate_full_design', () => {
            const bgTool = getToolByName('replace_background_image');
            const designTool = getToolByName('generate_full_design');
            expect(bgTool).toBeDefined();
            expect(designTool).toBeDefined();
            expect(bgTool!.name).not.toBe(designTool!.name);
            expect(bgTool!.category).toBe('create');
            expect(designTool!.category).toBe('compound');
        });

        it('★ REGRESSION: replace_background_image does NOT require canvas clearing', () => {
            const bgTool = getToolByName('replace_background_image')!;
            // The description should indicate it preserves other elements
            expect(bgTool.description).toContain('NOT touch');
        });
    });
});
