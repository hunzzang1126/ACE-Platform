// ─────────────────────────────────────────────────
// contextRouter.test.ts — Unit tests (v2 eval-first)
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { detectPage, buildContext, enrichMessageWithContext, buildContextSystemPrompt } from './contextRouter';
import { getToolsForPage } from './agentTools';

describe('contextRouter', () => {
    // ── detectPage ──

    describe('detectPage', () => {
        it('detects main dashboard from root path', () => {
            expect(detectPage('/')).toBe('dashboard');
        });

        it('detects main dashboard from /dashboard', () => {
            expect(detectPage('/dashboard')).toBe('dashboard');
        });

        it('detects size dashboard from /editor', () => {
            expect(detectPage('/editor')).toBe('size-dashboard');
        });

        it('detects size dashboard from /editor/ with trailing slash', () => {
            expect(detectPage('/editor/')).toBe('size-dashboard');
        });

        it('detects canvas editor from /editor/detail/<id>', () => {
            expect(detectPage('/editor/detail/abc-123')).toBe('canvas-editor');
        });

        it('detects canvas editor from /editor/canvas/<id>', () => {
            expect(detectPage('/editor/canvas/xyz')).toBe('canvas-editor');
        });

        it('detects dashboard for unknown paths', () => {
            expect(detectPage('/settings')).toBe('dashboard');
            expect(detectPage('/profile')).toBe('dashboard');
        });
    });

    // ── buildContext ──

    describe('buildContext', () => {
        it('returns dashboard context for root path', () => {
            const ctx = buildContext('/');
            expect(ctx.page).toBe('dashboard');
            expect(ctx.pageLabel).toBe('Main Dashboard');
            expect(ctx.useDesignPipeline).toBe(false);
        });

        it('returns size-dashboard context for /editor', () => {
            const ctx = buildContext('/editor');
            expect(ctx.page).toBe('size-dashboard');
            expect(ctx.pageLabel).toBe('Size Dashboard');
            expect(ctx.useDesignPipeline).toBe(false);
        });

        it('returns canvas-editor context for /editor/detail/<id>', () => {
            const ctx = buildContext('/editor/detail/abc');
            expect(ctx.page).toBe('canvas-editor');
            expect(ctx.pageLabel).toBe('Canvas Editor');
            expect(ctx.useDesignPipeline).toBe(true);
        });
    });

    // ── enrichMessageWithContext ──

    describe('enrichMessageWithContext', () => {
        it('prepends context header to message', () => {
            const ctx = buildContext('/');
            const result = enrichMessageWithContext('create a new project', ctx);
            expect(result).toContain('[CONTEXT] Page: Main Dashboard');
            expect(result).toContain('User request: create a new project');
        });

        it('includes page info for canvas editor', () => {
            const ctx = buildContext('/editor/detail/abc');
            const result = enrichMessageWithContext('make it red', ctx);
            expect(result).toContain('[CONTEXT] Page: Canvas Editor');
        });
    });

    // ── buildContextSystemPrompt ──

    describe('buildContextSystemPrompt', () => {
        it('returns dashboard-specific prompt mentioning Glid', () => {
            const ctx = buildContext('/');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('Glid');
            expect(prompt).toContain('execute_dynamic_action');
        });

        it('★ dashboard prompt does NOT mention generate_full_design', () => {
            const ctx = buildContext('/');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).not.toContain('generate_full_design');
        });

        it('★ dashboard prompt explains NO canvas and correct workflow', () => {
            const ctx = buildContext('/');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('NO canvas');
            expect(prompt).toContain('navigate_to');
        });

        it('returns size-specific prompt with common sizes', () => {
            const ctx = buildContext('/editor');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('Size Dashboard');
            expect(prompt).toContain('300x250');
        });

        it('returns editor-specific prompt with generate_full_design', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('Canvas Editor');
            expect(prompt).toContain('generate_full_design');
        });

        it('includes replace_background_image in canvas editor prompt', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('replace_background_image');
        });

        it('does NOT include STORE API in system prompt (moved to analyze_scene)', () => {
            const dashCtx = buildContext('/');
            expect(buildContextSystemPrompt(dashCtx)).not.toContain('STORE API');

            const editorCtx = buildContext('/editor/detail/x');
            expect(buildContextSystemPrompt(editorCtx)).not.toContain('STORE API');
        });

        it('includes WORKSPACE SNAPSHOT in all prompts', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('WORKSPACE SNAPSHOT');
        });

        it('tells AI to explain before executing', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('Explain before executing');
        });

        it('mentions execute_dynamic_action as primary for modifications', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('execute_dynamic_action');
        });

        it('includes analyze_scene in tool list', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('analyze_scene');
        });
    });
});

// ═══════════════════════════════════════════════════
// ★ Page-Aware Tool Filtering — prevents canvas ops on dashboard
// Fixed in v0.0.0.307
// ═══════════════════════════════════════════════════

describe('getToolsForPage — page-aware tool filtering', () => {
    // These tools ONLY exist in ALL_TOOLS and require an engine.
    // add_text, add_button have DASHBOARD_TOOLS equivalents — not listed here.
    const engineExclusiveTools = [
        'generate_full_design',
        'replace_background_image',
        'generate_image',
    ];

    it('★ dashboard: NO canvas-engine tools', () => {
        const tools = getToolsForPage('dashboard');
        const names = tools.map(t => t.name);
        for (const tool of engineExclusiveTools) {
            expect(names).not.toContain(tool);
        }
    });

    it('★ dashboard: includes DASHBOARD_TOOLS (CRUD, sizes, navigation)', () => {
        const tools = getToolsForPage('dashboard');
        const names = tools.map(t => t.name);
        expect(names).toContain('execute_dynamic_action');
        expect(names).toContain('create_creative_set');
        expect(names).toContain('delete_creative_set');
        expect(names).toContain('navigate_to');
        expect(names).toContain('add_size');
        expect(names).toContain('list_creative_sets');
    });


    it('size-dashboard: no generate_full_design or replace_background_image', () => {
        const tools = getToolsForPage('size-dashboard');
        const names = tools.map(t => t.name);
        expect(names).not.toContain('generate_full_design');
        expect(names).not.toContain('replace_background_image');
    });

    it('size-dashboard: has add_size, add_text, add_shape', () => {
        const tools = getToolsForPage('size-dashboard');
        const names = tools.map(t => t.name);
        expect(names).toContain('add_text');
        expect(names).toContain('add_size');
        expect(names).toContain('add_shape');
        expect(names).toContain('navigate_to');
    });

    it('canvas-editor: has ALL tools including generate_full_design', () => {
        const tools = getToolsForPage('canvas-editor');
        const names = tools.map(t => t.name);
        expect(names).toContain('generate_full_design');
        expect(names).toContain('replace_background_image');
        expect(names).toContain('execute_dynamic_action');
        expect(names).toContain('analyze_scene');
    });

    it('canvas-editor tool count >= dashboard tool count', () => {
        const dashTools = getToolsForPage('dashboard');
        const canvasTools = getToolsForPage('canvas-editor');
        expect(canvasTools.length).toBeGreaterThan(dashTools.length);
    });
});
