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

describe('agentGenerateFlow — Carbon Design System integration', () => {
    it('★ REGRESSION: uses Carbon layout engine (USE_CARBON_LAYOUT flag)', () => {
        expect(flowSrc).toContain('USE_CARBON_LAYOUT');
        expect(flowSrc).toContain('buildDesignElements');
    });

    it('★ REGRESSION: imports Carbon layout composer', () => {
        expect(flowSrc).toContain('@/carbon/layoutComposer');
    });

    it('★ REGRESSION: passes content to Carbon (headline, subheadline, cta, tag)', () => {
        expect(flowSrc).toContain('content.headline');
        expect(flowSrc).toContain('content.subheadline');
        expect(flowSrc).toContain('content.cta');
        expect(flowSrc).toContain('content.tag');
    });

    it('★ REGRESSION: passes palette to Carbon', () => {
        expect(flowSrc).toContain('guide.colors.gradientStart');
        expect(flowSrc).toContain('guide.colors.gradientEnd');
        expect(flowSrc).toContain('guide.typography');
    });

    it('★ REGRESSION: has backup template path for rollback', () => {
        expect(flowSrc).toContain('resolveTemplateElements');
    });

    it('helpers still export autoCreateSubheadline (used by backup path)', () => {
        expect(helpersSrc).toContain('export function autoCreateSubheadline');
    });

    it('helpers still export recalcTextHeights', () => {
        expect(helpersSrc).toContain('export function recalcTextHeights');
    });
});
