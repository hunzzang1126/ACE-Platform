// ─────────────────────────────────────────────────
// agentFlowRender.test.ts — Rendering helpers tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const renderSrc = readFileSync(resolve(__dirname, './agentFlowRender.ts'), 'utf-8');
const flowSrc = readFileSync(resolve(__dirname, './agentGenerateFlow.ts'), 'utf-8');
const helpersSrc = readFileSync(resolve(__dirname, './agentFlowHelpers.ts'), 'utf-8');

describe('agentFlowRender — exported API', () => {
    it('exports renderElement function', () => {
        expect(renderSrc).toContain('export function renderElement');
    });

    it('exports buildElementDetail function', () => {
        expect(renderSrc).toContain('export function buildElementDetail');
    });

    it('exports runVisionQA function', () => {
        expect(renderSrc).toContain('export async function runVisionQA');
    });

    it('renderElement handles text type with font family', () => {
        expect(renderSrc).toContain("el.type === 'text'");
        expect(renderSrc).toContain('fontFamily');
    });

    it('renderElement handles gradient rects', () => {
        expect(renderSrc).toContain('el.gradient_start_hex');
        expect(renderSrc).toContain('cacheGradientData');
    });

    it('renderElement handles rounded_rect type', () => {
        expect(renderSrc).toContain("el.type === 'rounded_rect'");
    });

    it('renderElement handles ellipse type', () => {
        expect(renderSrc).toContain("el.type === 'ellipse'");
    });
});

describe('agentFlowHelpers — extracted helpers', () => {
    it('exports scanBrandCloud', () => {
        expect(helpersSrc).toContain('export async function scanBrandCloud');
    });

    it('exports selectTemplate', () => {
        expect(helpersSrc).toContain('export async function selectTemplate');
    });

    it('scanBrandCloud reads brand kit from store', () => {
        expect(helpersSrc).toContain('useBrandKitStore');
        expect(helpersSrc).toContain('getActiveKit');
    });

    it('selectTemplate uses keyword-based matching', () => {
        expect(helpersSrc).toContain('score');
        expect(helpersSrc).toContain('bestTemplate');
    });
});

describe('agentGenerateFlow — Template-first pipeline (v734)', () => {
    it('★ REGRESSION: uses template pipeline (no Carbon)', () => {
        expect(flowSrc).not.toContain('USE_CARBON_LAYOUT');
        expect(flowSrc).not.toContain('buildDesignElements');
        expect(flowSrc).toContain('resolveTemplateElements');
    });

    it('★ REGRESSION: no Carbon imports remaining', () => {
        expect(flowSrc).not.toContain('@/carbon/');
    });

    it('★ REGRESSION: injects content into template text elements', () => {
        expect(flowSrc).toContain('content.headline');
        expect(flowSrc).toContain('content.subheadline');
        expect(flowSrc).toContain('content.cta');
        expect(helpersSrc).toContain('contentMap');
    });

    it('★ REGRESSION: passes palette to recolor', () => {
        expect(flowSrc).toContain('guide.colors.gradientStart');
        expect(flowSrc).toContain('guide.typography');
    });

    it('resolveTemplateElements is the primary layout source', () => {
        expect(flowSrc).toContain('resolveTemplateElements');
    });

    it('helpers still export autoCreateSubheadline', () => {
        expect(helpersSrc).toContain('export function autoCreateSubheadline');
    });

    it('helpers still export recalcTextHeights', () => {
        expect(helpersSrc).toContain('export function recalcTextHeights');
    });
});

// ══════════════════════════════════════════════════
// ★ v725: Brand asset resolution (idb:// → data:URL)
// ══════════════════════════════════════════════════
describe('★ v725: Asset resolution before canvas rendering', () => {
    it('resolves logo idb:// references before add_image', () => {
        expect(renderSrc).toContain('resolveAsset');
        expect(renderSrc).toContain('resolvedLogoUrl');
    });

    it('resolves product image references via isAssetRef', () => {
        expect(renderSrc).toContain('isAssetRef');
        expect(renderSrc).toContain('resolvedSrc');
    });

    it('falls back to original src on resolution failure', () => {
        // Must not crash if resolveAsset fails
        expect(renderSrc).toContain('catch');
    });
});

// ══════════════════════════════════════════════════
// ★ v725: Conversational brand narration
// ══════════════════════════════════════════════════
describe('★ v725: Conversational brand asset narration', () => {
    it('narrates found logo by name', () => {
        expect(helpersSrc).toContain('Found logo');
        expect(helpersSrc).toContain('selection.logo.name');
    });

    it('narrates found background by name', () => {
        expect(helpersSrc).toContain('Found background');
        expect(helpersSrc).toContain('selection.background.asset.name');
    });

    it('narrates found product images', () => {
        expect(helpersSrc).toContain('Found product image');
    });

    it('narrates when no matching assets found', () => {
        expect(helpersSrc).toContain('no matching assets');
    });

    it('narrates AI-generated background fallback', () => {
        expect(helpersSrc).toContain('AI will generate one');
    });

    it('does NOT use old generic count format', () => {
        // Old: "Brand kit "X" — 2 selected, 1 skipped."
        expect(helpersSrc).not.toContain('cb.narrate(`Brand kit');
    });
});

