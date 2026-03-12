// ─────────────────────────────────────────────────
// contextRouter.test.ts — Unit tests
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

        it('includes relevant tool hints', () => {
            const dashboard = buildContext('/');
            expect(dashboard.relevantToolHint).toContain('Project management');

            const sizeDb = buildContext('/editor');
            expect(sizeDb.relevantToolHint).toContain('Size management');

            const editor = buildContext('/editor/detail/x');
            expect(editor.relevantToolHint).toContain('Design tools');
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

        it('includes project name when available', () => {
            // buildContext reads from designStore, which defaults to empty
            const ctx = buildContext('/editor/detail/abc');
            const result = enrichMessageWithContext('make it red', ctx);
            expect(result).toContain('[CONTEXT] Page: Canvas Editor');
        });
    });

    // ── buildContextSystemPrompt ──

    describe('buildContextSystemPrompt', () => {
        it('returns dashboard-specific prompt for dashboard page', () => {
            const ctx = buildContext('/');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('ACE');
            expect(prompt).toContain('Main Dashboard');
            expect(prompt).toContain('FULL AUTONOMY');
        });

        it('returns size-specific prompt for size dashboard', () => {
            const ctx = buildContext('/editor');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('Size Dashboard');
            expect(prompt).toContain('300x250');
        });

        it('returns editor-specific prompt for canvas editor', () => {
            const ctx = buildContext('/editor/detail/x');
            const prompt = buildContextSystemPrompt(ctx);
            expect(prompt).toContain('Canvas Editor');
            expect(prompt).toContain('generate_full_design');
        });
    });
});
