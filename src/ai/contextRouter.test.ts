// ─────────────────────────────────────────────────
// contextRouter.test.ts — Unit tests (v2 eval-first)
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { detectPage, buildContext, enrichMessageWithContext, buildContextSystemPrompt } from './contextRouter';

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

        it('includes STORE API reference in all prompts', () => {
            const dashCtx = buildContext('/');
            expect(buildContextSystemPrompt(dashCtx)).toContain('STORE API');

            const editorCtx = buildContext('/editor/detail/x');
            expect(buildContextSystemPrompt(editorCtx)).toContain('STORE API');
        });

        it('includes WORKSPACE SNAPSHOT in all prompts', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('WORKSPACE SNAPSHOT');
        });

        it('tells AI to explain before executing', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('Explain what you\'ll do BEFORE executing');
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
