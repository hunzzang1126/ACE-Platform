// ─────────────────────────────────────────────────
// useSmartCheck.test.ts — One-click Smart Check hook
// ─────────────────────────────────────────────────
// Covers: SmartCheckResult, status lifecycle, scaling pipeline,
// vision QA integration, abort support, progress messages
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useSmartCheck.ts'), 'utf-8');

describe('useSmartCheck — exports', () => {
    it('exports useSmartCheck hook', () => {
        expect(src).toContain('export function useSmartCheck');
    });

    it('exports SmartCheckStatus type', () => {
        expect(src).toContain('export type SmartCheckStatus');
    });

    it('exports SmartCheckResult interface', () => {
        expect(src).toContain('export interface SmartCheckResult');
    });

    it('exports VariantVisionResult interface', () => {
        expect(src).toContain('export interface VariantVisionResult');
    });
});

describe('useSmartCheck — result structure', () => {
    it('tracks issueCount and fixCount', () => {
        expect(src).toContain('issueCount');
        expect(src).toContain('fixCount');
    });

    it('tracks resizedCount', () => {
        expect(src).toContain('resizedCount');
    });

    it('tracks vision results', () => {
        expect(src).toContain('visionIssueCount');
        expect(src).toContain('visionResults');
        expect(src).toContain('avgVisionScore');
    });
});

describe('useSmartCheck — status lifecycle', () => {
    it('has idle, checking, done, error statuses', () => {
        expect(src).toContain("'idle'");
        expect(src).toContain("'checking'");
        expect(src).toContain("'done'");
        expect(src).toContain("'error'");
    });
});

describe('useSmartCheck — pipeline integration', () => {
    it('uses constraintsToAbsolute for positioning', () => {
        expect(src).toContain('constraintsToAbsolute');
    });

    it('runs smart sizing QA', () => {
        expect(src).toContain('runSmartSizingQA');
    });

    it('classifies aspect ratios', () => {
        expect(src).toContain('classifyRatio');
    });

    it('scales elements to target size', () => {
        expect(src).toContain('scaleElementToTarget');
    });

    it('clips out-of-bounds elements', () => {
        expect(src).toContain('clipOutOfBounds');
    });

    it('renders variants for vision analysis', () => {
        expect(src).toContain('renderVariantToCanvas');
    });

    it('calls vision service for AI analysis', () => {
        expect(src).toContain('analyzeDesign');
    });
});

describe('useSmartCheck — abort support', () => {
    it('has abort controller for cancellation', () => {
        expect(src).toContain('abortRef');
        expect(src).toContain('AbortController');
    });
});

describe('useSmartCheck — progress', () => {
    it('reports progress messages', () => {
        expect(src).toContain('setProgressMessage');
    });

    it('uses design store for element updates', () => {
        expect(src).toContain('updateVariantElement');
    });
});
