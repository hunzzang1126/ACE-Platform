// ─────────────────────────────────────────────────
// contextRouter.test.ts — AI context routing
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/stores/designStore', () => ({
    useDesignStore: {
        getState: () => ({
            creativeSet: {
                name: 'Test Project',
                masterVariantId: 'v1',
                variants: [
                    { id: 'v1', preset: { width: 300, height: 250 }, elements: [
                        { id: 'e1', name: 'Headline', type: 'text', zIndex: 1, visible: true, locked: false, constraints: {} },
                    ]},
                ],
            },
        }),
    },
}));

import {
    detectPage,
    buildContext,
    buildContextSystemPrompt,
    enrichMessageWithContext,
    STORE_API_REFERENCE,
    type ContextInfo,
} from './contextRouter';

describe('detectPage', () => {
    it('detects canvas-editor from detail path', () => {
        expect(detectPage('/editor/detail/abc')).toBe('canvas-editor');
    });

    it('detects canvas-editor from canvas path', () => {
        expect(detectPage('/editor/canvas/abc')).toBe('canvas-editor');
    });

    it('detects size-dashboard from /editor', () => {
        expect(detectPage('/editor')).toBe('size-dashboard');
    });

    it('detects dashboard from root', () => {
        expect(detectPage('/')).toBe('dashboard');
    });

    it('detects dashboard from /projects', () => {
        expect(detectPage('/projects')).toBe('dashboard');
    });
});

describe('buildContext', () => {
    it('returns ContextInfo with page detection', () => {
        const ctx = buildContext('/editor/detail/123');
        expect(ctx.page).toBe('canvas-editor');
        expect(ctx.pageLabel).toBe('Canvas Editor');
    });

    it('reads project name from store', () => {
        const ctx = buildContext('/');
        expect(ctx.projectName).toBe('Test Project');
    });

    it('reads canvas size from master variant', () => {
        const ctx = buildContext('/editor/detail/123');
        expect(ctx.canvasSize).toEqual({ w: 300, h: 250 });
    });

    it('counts elements from master variant', () => {
        const ctx = buildContext('/editor/detail/123');
        expect(ctx.elementCount).toBe(1);
    });

    it('sets useDesignPipeline for canvas-editor', () => {
        const ctx = buildContext('/editor/detail/123');
        expect(ctx.useDesignPipeline).toBe(true);
    });

    it('does not set useDesignPipeline for dashboard', () => {
        const ctx = buildContext('/');
        expect(ctx.useDesignPipeline).toBe(false);
    });

    it('includes memory when provided', () => {
        const ctx = buildContext('/', 'user prefers dark mode');
        expect(ctx.memory).toBe('user prefers dark mode');
    });
});

describe('buildContextSystemPrompt', () => {
    it('dashboard prompt mentions CANNOT design', () => {
        const ctx = buildContext('/');
        const prompt = buildContextSystemPrompt(ctx);
        expect(prompt).toContain('CANNOT design');
    });

    it('size-dashboard prompt mentions variants', () => {
        const ctx = buildContext('/editor');
        const prompt = buildContextSystemPrompt(ctx);
        expect(prompt).toContain('300x250');
    });

    it('canvas-editor prompt includes tools', () => {
        const ctx = buildContext('/editor/detail/123');
        const prompt = buildContextSystemPrompt(ctx);
        expect(prompt).toContain('generate_full_design');
    });

    it('includes memory in prompt when set', () => {
        const ctx = buildContext('/', 'user likes minimal');
        const prompt = buildContextSystemPrompt(ctx);
        expect(prompt).toContain('user likes minimal');
    });

    it('starts with Glid header', () => {
        const ctx = buildContext('/');
        const prompt = buildContextSystemPrompt(ctx);
        expect(prompt).toContain('Glid');
    });

    it('includes language instruction for non-English locale', () => {
        const ctx = buildContext('/');
        ctx.language = 'ko';
        const prompt = buildContextSystemPrompt(ctx);
        expect(prompt).toContain('Respond in Korean');
    });

    it('English prompt includes auto-detect fallback', () => {
        const ctx = buildContext('/');
        ctx.language = 'en';
        const prompt = buildContextSystemPrompt(ctx);
        expect(prompt).not.toContain('Respond in Korean');
        expect(prompt).toContain('non-English language');
    });

    it('includes language instruction for Japanese', () => {
        const ctx = buildContext('/editor/detail/123');
        ctx.language = 'ja';
        const prompt = buildContextSystemPrompt(ctx);
        expect(prompt).toContain('Respond in Japanese');
    });
});

describe('enrichMessageWithContext', () => {
    it('adds context prefix to user message', () => {
        const ctx: ContextInfo = {
            page: 'canvas-editor', pageLabel: 'Canvas Editor',
            projectName: 'My Ad', canvasSize: { w: 300, h: 250 },
            variantCount: 2, elementCount: 5, useDesignPipeline: true,
            snapshot: '',
        };
        const enriched = enrichMessageWithContext('make it blue', ctx);
        expect(enriched).toContain('[CONTEXT]');
        expect(enriched).toContain('Canvas Editor');
        expect(enriched).toContain('300x250');
        expect(enriched).toContain('make it blue');
    });

    it('skips empty fields', () => {
        const ctx: ContextInfo = {
            page: 'dashboard', pageLabel: 'Dashboard',
            projectName: '', canvasSize: null,
            variantCount: 0, elementCount: 0, useDesignPipeline: false,
            snapshot: '',
        };
        const enriched = enrichMessageWithContext('hello', ctx);
        expect(enriched).not.toContain('Canvas:');
        expect(enriched).not.toContain('Elements:');
    });
});

describe('STORE_API_REFERENCE', () => {
    it('contains mutation patterns', () => {
        expect(STORE_API_REFERENCE).toContain('updateMasterElement');
        expect(STORE_API_REFERENCE).toContain('addElementToMaster');
    });
});
