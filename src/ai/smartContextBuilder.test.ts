// ─────────────────────────────────────────────────
// smartContextBuilder.test.ts — Context builder tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiMemoryService', () => ({
    loadMemory: vi.fn().mockResolvedValue(null),
    memoryToPromptSection: vi.fn().mockReturnValue(''),
}));
vi.mock('@/ai/actionTracker', () => ({ initActionTracker: vi.fn() }));
vi.mock('@/stores/userPrefs', () => ({
    loadUserPrefs: vi.fn(() => ({ stats: { totalDesigns: 0 }, preferredLanguage: 'en', hasCompletedOnboarding: false })),
    prefsToPromptSection: vi.fn().mockReturnValue(''),
}));
vi.mock('@/ai/prompts/bannerDesignPrompt', () => ({
    buildDesignSystemPrompt: vi.fn().mockReturnValue('## Design System'),
}));
vi.mock('@/engine/brandPalette', () => ({
    paletteToPromptSection: vi.fn().mockReturnValue(''),
}));
vi.mock('@/schema/layoutRoles', () => ({
    getAspectCategory: vi.fn().mockReturnValue('landscape'),
}));

import { buildSmartContext, contextToPromptSection } from './smartContextBuilder';
import { clearActionHistory, pushAction, clearLastTouched } from './smartContextHelpers';
import type { CreativeSet } from '@/schema/design.types';

// ── Factory ──

function makeCreativeSet(overrides: Partial<CreativeSet> = {}): CreativeSet {
    return {
        id: 'cs-1',
        name: 'Test Campaign',
        masterVariantId: 'v-master',
        variants: [
            {
                id: 'v-master',
                preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'banner' },
                elements: [],
                locales: {},
            },
            {
                id: 'v-2',
                preset: { id: 'p2', name: '728x90', width: 728, height: 90, category: 'banner' },
                elements: [],
                locales: {},
            },
        ],
        plugGraph: {},
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        ...overrides,
    } as CreativeSet;
}

describe('smartContextBuilder', () => {
    beforeEach(() => {
        clearActionHistory();
        clearLastTouched();
    });

    // ── buildSmartContext ──

    describe('buildSmartContext', () => {
        it('should return minimal context when no creative set', () => {
            const ctx = buildSmartContext('dashboard');
            expect(ctx.page).toBe('dashboard');
            expect(ctx.creativeSet).toBeUndefined();
            expect(ctx.activeVariant).toBeUndefined();
        });

        it('should return minimal context when creativeSet is null', () => {
            const ctx = buildSmartContext('editor', null);
            expect(ctx.page).toBe('editor');
            expect(ctx.creativeSet).toBeUndefined();
        });

        it('should include creative set info', () => {
            const cs = makeCreativeSet();
            const ctx = buildSmartContext('editor', cs);
            expect(ctx.creativeSet?.name).toBe('Test Campaign');
            expect(ctx.creativeSet?.variantCount).toBe(2);
            expect(ctx.creativeSet?.sizes).toEqual(['300×250', '728×90']);
        });

        it('should default to master variant when no activeVariantId', () => {
            const cs = makeCreativeSet();
            const ctx = buildSmartContext('editor', cs);
            expect(ctx.activeVariant?.isMaster).toBe(true);
        });

        it('should select specific variant when activeVariantId provided', () => {
            const cs = makeCreativeSet();
            const ctx = buildSmartContext('editor', cs, 'v-2');
            expect(ctx.activeVariant?.isMaster).toBe(false);
            expect(ctx.activeVariant?.width).toBe(728);
            expect(ctx.activeVariant?.height).toBe(90);
        });

        it('should include recent actions when available', () => {
            pushAction('Added text element');
            pushAction('Changed color');
            const cs = makeCreativeSet();
            const ctx = buildSmartContext('editor', cs);
            expect(ctx.recentActions).toEqual(['Added text element', 'Changed color']);
        });

        it('should omit recentActions when empty', () => {
            const cs = makeCreativeSet();
            const ctx = buildSmartContext('editor', cs);
            expect(ctx.recentActions).toBeUndefined();
        });
    });

    // ── contextToPromptSection ──

    describe('contextToPromptSection', () => {
        it('should include page info', () => {
            const result = contextToPromptSection({ page: 'dashboard' });
            expect(result).toContain('dashboard');
            expect(result).toContain('Current Context');
        });

        it('should include creative set section', () => {
            const result = contextToPromptSection({
                page: 'editor',
                creativeSet: { name: 'My Ad', variantCount: 3, masterSize: '300×250', sizes: ['300×250', '728×90', '160×600'] },
            });
            expect(result).toContain('My Ad');
            expect(result).toContain('Variants: 3');
            expect(result).toContain('300×250');
        });

        it('should include active canvas section', () => {
            const result = contextToPromptSection({
                page: 'editor',
                activeVariant: { size: '300×250', width: 300, height: 250, aspectCategory: 'landscape', isMaster: true, elementCount: 5 },
            });
            expect(result).toContain('300×250');
            expect(result).toContain('Master: YES');
            expect(result).toContain('Elements: 5');
        });

        it('should show empty canvas message when no elements', () => {
            const result = contextToPromptSection({
                page: 'editor',
                activeVariant: { size: '300×250', width: 300, height: 250, aspectCategory: 'landscape', isMaster: true, elementCount: 0 },
            });
            expect(result).toContain('EMPTY');
        });

        it('should include brand colors', () => {
            const result = contextToPromptSection({
                page: 'editor',
                brand: { primaryColor: '#ff6b35', secondaryColor: '#333', backgroundColor: '#0a0e1a', textColor: '#fff', fontFamily: 'Inter' },
            });
            expect(result).toContain('#ff6b35');
            expect(result).toContain('Brand Colors');
        });

        it('should include recent actions', () => {
            const result = contextToPromptSection({
                page: 'editor',
                recentActions: ['Added headline', 'Changed bg color'],
            });
            expect(result).toContain('Recent User Actions');
            expect(result).toContain('Added headline');
        });

        it('should include current selection', () => {
            const result = contextToPromptSection({
                page: 'editor',
                currentSelection: { name: 'Headline', id: 1, type: 'text', age: 5 },
            });
            expect(result).toContain('Headline');
            expect(result).toContain('Currently Selected');
        });
    });
});
