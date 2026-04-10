// ─────────────────────────────────────────────────
// autoDesignLoop — Unit Tests
// ─────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';

// Import types for structure validation
import type { VisionLoopResult, VisionFix, VisionIssue, HealerFn } from './autoDesignLoop';

describe('autoDesignLoop — Type & Export Validation', () => {
    it('exports runVisionHealingLoop function', async () => {
        const mod = await import('./autoDesignLoop');
        expect(typeof mod.runVisionHealingLoop).toBe('function');
    });

    it('exports legacy runVisionLoop function', async () => {
        const mod = await import('./autoDesignLoop');
        expect(typeof mod.runVisionLoop).toBe('function');
    });

    it('VisionLoopResult has correct shape', () => {
        const result: VisionLoopResult = {
            finalScore: 85,
            passes: 2,
            fixesApplied: 3,
            suggestions: [],
            reasoning: 'Good layout',
            healingMethod: 'patch',
        };
        expect(result.finalScore).toBe(85);
        expect(result.healingMethod).toBe('patch');
    });

    it('VisionFix supports all fix fields', () => {
        const fix: VisionFix = {
            elementName: 'headline',
            x: 10, y: 20, w: 300, h: 40,
            fontSize: 24, fill: '#FF0000',
        };
        expect(fix.elementName).toBe('headline');
    });

    it('VisionIssue supports all issue fields', () => {
        const issue: VisionIssue = {
            type: 'overlap', severity: 'high',
            element: 'headline', description: 'Overlaps CTA',
            suggestion: 'Move up 20px',
        };
        expect(issue.severity).toBe('high');
    });

    it('healingMethod can be patch, agent, or none', () => {
        const methods: VisionLoopResult['healingMethod'][] = ['patch', 'agent', 'none'];
        expect(methods).toHaveLength(3);
    });
});

describe('autoDesignLoop — Early Returns', () => {
    it('returns immediately with score 0 when signal is already aborted', async () => {
        const { runVisionHealingLoop } = await import('./autoDesignLoop');
        const abortCtrl = new AbortController();
        abortCtrl.abort(); // pre-abort

        const result = await runVisionHealingLoop(
            {} as any, 300, 250, abortCtrl.signal,
            vi.fn(),
        );
        // Should return quickly due to aborted signal
        expect(result.finalScore).toBe(0);
        expect(result.healingMethod).toBe('none');
    });

    it('legacy runVisionLoop returns when signal is aborted', async () => {
        const { runVisionLoop } = await import('./autoDesignLoop');
        const abortCtrl = new AbortController();
        abortCtrl.abort();

        const result = await runVisionLoop(
            {} as any, 300, 250, abortCtrl.signal,
            vi.fn(),
        );
        expect(result.passes).toBeLessThanOrEqual(3);
    });
});
