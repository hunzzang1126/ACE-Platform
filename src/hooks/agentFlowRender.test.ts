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

describe('agentGenerateFlow — subheadline auto-creation', () => {
    it('★ REGRESSION: tracks subheadlineMapped flag', () => {
        expect(flowSrc).toContain('let subheadlineMapped = false');
        expect(flowSrc).toContain('subheadlineMapped = true');
    });

    it('★ REGRESSION: creates subheadline element when template lacks one', () => {
        expect(flowSrc).toContain("content.subheadline && !subheadlineMapped");
        expect(flowSrc).toContain("name: 'subheadline'");
    });

    it('positions auto-created subheadline below headline using headlineH', () => {
        expect(flowSrc).toContain('headlineY + headlineH');
    });

    it('uses canvas-proportional font size for subheadline (3.5% of height)', () => {
        expect(flowSrc).toContain('canvasH * 0.035');
        expect(flowSrc).toContain('Math.max(14, Math.min(32');
    });

    it('inherits color from headline element', () => {
        expect(flowSrc).toContain("headlineEl?.color_hex ?? '#FFFFFF'");
    });

    it('imports renderElement from agentFlowRender', () => {
        expect(flowSrc).toContain("import { renderElement, buildElementDetail } from './agentFlowRender'");
    });

    it('imports scanBrandCloud from agentFlowHelpers', () => {
        expect(flowSrc).toContain("import { scanBrandCloud, selectTemplate } from './agentFlowHelpers'");
    });
});
