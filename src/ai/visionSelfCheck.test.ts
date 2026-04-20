// ─────────────────────────────────────────────────
// visionSelfCheck.test.ts — Vision QA self-check tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock all heavy dependencies ──
vi.mock('@/utils/screenshotCapture', () => ({
    renderVariantToCanvas: vi.fn().mockReturnValue('fakebase64data'),
}));

vi.mock('@/config/apiKeys', () => ({
    getOpenRouterKey: vi.fn().mockReturnValue('test-key'),
    isAiAvailable: vi.fn().mockReturnValue(true),
    isProxyMode: vi.fn().mockReturnValue(false),
}));

vi.mock('@/services/openRouterClient', () => ({
    callOpenRouterApi: vi.fn(),
}));

vi.mock('@/services/modelRouter', () => ({
    getModelId: vi.fn().mockReturnValue('test-vision-model'),
}));

vi.mock('@/schema/constraints.types', () => ({
    resolveConstraints: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
}));

vi.mock('@/schema/layoutRoles', () => ({
    getAspectCategory: vi.fn().mockReturnValue('landscape'),
}));

import { runVisionSelfCheck, runBatchVisionCheck } from './visionSelfCheck';
import type { VisionCheckResult, VisionIssue, VisionSelfCheckConfig } from './visionSelfCheck';
import { callOpenRouterApi } from '@/services/openRouterClient';
import { isAiAvailable } from '@/config/apiKeys';
import type { BannerVariant } from '@/schema/design.types';

// ── Factory ──

function makeVariant(overrides?: Partial<BannerVariant>): BannerVariant {
    return {
        id: 'v-1',
        preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'banner' },
        elements: [
            { id: 'e1', name: 'Headline', type: 'text', role: 'headline', content: 'Hello', color: '#fff', fontFamily: 'Inter', fontSize: 24, fontWeight: 700, fontStyle: 'normal', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0, autoShrink: false, opacity: 1, visible: true, locked: false, zIndex: 1, constraints: { horizontal: { anchor: 'left', offset: 10 }, vertical: { anchor: 'top', offset: 10 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 280, height: 30 }, rotation: 0 } },
            { id: 'e2', name: 'BG', type: 'shape', role: 'background', shapeType: 'rectangle', fill: '#0a0e1a', borderRadius: 0, strokeWidth: 0, opacity: 1, visible: true, locked: false, zIndex: 0, constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 300, height: 250 }, rotation: 0 } },
        ],
        locales: {},
        ...overrides,
    } as BannerVariant;
}

describe('visionSelfCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Type validation ──
    describe('VisionCheckResult type', () => {
        it('should have correct shape', () => {
            const result: VisionCheckResult = { passed: true, issues: [], loopCount: 0 };
            expect(result.passed).toBe(true);
            expect(result.issues).toEqual([]);
            expect(result.loopCount).toBe(0);
        });

        it('should support issues array', () => {
            const issue: VisionIssue = { severity: 'error', description: 'Overlap detected' };
            expect(issue.severity).toBe('error');
            expect(issue.description).toBeDefined();
        });

        it('should support config type', () => {
            const config: VisionSelfCheckConfig = { maxLoops: 3 };
            expect(config.maxLoops).toBe(3);
        });
    });

    // ── runVisionSelfCheck ──
    describe('runVisionSelfCheck', () => {
        it('should pass when AI is not available', async () => {
            vi.mocked(isAiAvailable).mockReturnValueOnce(false);
            const result = await runVisionSelfCheck(makeVariant());
            expect(result.passed).toBe(true);
            expect(result.issues).toEqual([]);
            expect(result.loopCount).toBe(0);
        });

        it('should call OpenRouter with the variant screenshot', async () => {
            vi.mocked(callOpenRouterApi).mockResolvedValue({
                content: [{ text: '{ "issues": [] }' }],
            });
            const result = await runVisionSelfCheck(makeVariant());
            expect(callOpenRouterApi).toHaveBeenCalled();
            expect(result.passed).toBe(true);
            expect(result.issues).toEqual([]);
        });

        it('should return issues found by vision model', async () => {
            vi.mocked(callOpenRouterApi).mockResolvedValue({
                content: [{ text: '{ "issues": [{"severity":"error","description":"Headline overlaps CTA"}] }' }],
            });
            const result = await runVisionSelfCheck(makeVariant());
            expect(result.passed).toBe(false);
            expect(result.issues).toHaveLength(1);
            expect(result.issues[0].description).toContain('Headline overlaps CTA');
        });

        it('should return warnings without failing', async () => {
            vi.mocked(callOpenRouterApi).mockResolvedValue({
                content: [{ text: '{"issues":[{"severity":"warning","description":"Minor spacing issue"}]}' }],
            });
            const result = await runVisionSelfCheck(makeVariant());
            expect(result.passed).toBe(true);
            expect(result.issues).toHaveLength(1);
            expect(result.issues[0].severity).toBe('warning');
        });

        it('should include screenshot data URL', async () => {
            vi.mocked(callOpenRouterApi).mockResolvedValue({
                content: [{ text: '{"issues":[]}' }],
            });
            const result = await runVisionSelfCheck(makeVariant());
            expect(result.screenshotDataUrl).toContain('data:image/png;base64,');
        });

        it('should gracefully handle API failure', async () => {
            vi.mocked(callOpenRouterApi).mockRejectedValue(new Error('Network error'));
            const result = await runVisionSelfCheck(makeVariant());
            expect(result.passed).toBe(true);
            // analyzeWithVision catches the error internally and returns [], so outer fn still completes with loopCount 1
            expect(result.issues).toEqual([]);
        });

        it('should gracefully handle malformed JSON response', async () => {
            vi.mocked(callOpenRouterApi).mockResolvedValue({
                content: [{ text: 'This is not valid JSON at all' }],
            });
            const result = await runVisionSelfCheck(makeVariant());
            expect(result.passed).toBe(true);
            expect(result.issues).toEqual([]);
        });
    });

    // ── runBatchVisionCheck ──
    describe('runBatchVisionCheck', () => {
        it('should check all variants', async () => {
            vi.mocked(callOpenRouterApi).mockResolvedValue({
                content: [{ text: '{"issues":[]}' }],
            });
            const variants = [makeVariant({ id: 'v-1' }), makeVariant({ id: 'v-2' })];
            const results = await runBatchVisionCheck(variants);
            expect(results.size).toBe(2);
            expect(results.get('v-1')?.passed).toBe(true);
            expect(results.get('v-2')?.passed).toBe(true);
        });

        it('should return Map keyed by variant id', async () => {
            vi.mocked(isAiAvailable).mockReturnValue(false);
            const results = await runBatchVisionCheck([makeVariant({ id: 'test-id' })]);
            expect(results.has('test-id')).toBe(true);
        });
    });
});
