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

    it('★ REGRESSION: uses slot-based content assembly (v743)', () => {
        // v743: Content-First — brief.slots drives assembly, not content.headline
        expect(helpersSrc).toContain('activeSlots');
        expect(helpersSrc).toContain('roleMap');
        expect(helpersSrc).toContain('contentByRole');
        // Role classification still uses name matching
        expect(helpersSrc).toContain("name.includes('headline')");
        expect(helpersSrc).toContain("name.includes('body')");
    });

    it('★ REGRESSION: passes palette to recolor', () => {
        expect(flowSrc).toContain('guide.colors.gradientStart');
        expect(flowSrc).toContain('guide.typography');
    });

    it('resolveTemplateElements is the primary layout source', () => {
        expect(flowSrc).toContain('resolveTemplateElements');
    });

    it('helpers still export autoCreateSubheadline', () => {
        expect(helpersSrc).toContain('autoCreateSubheadline');
    });

    it('helpers still export recalcTextHeights', () => {
        expect(helpersSrc).toContain('recalcTextHeights');
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

// ══════════════════════════════════════════════════
// ★ v735: Design Quality Improvements
// ══════════════════════════════════════════════════
const renderElSrc = readFileSync(resolve(__dirname, './agentFlowRender.ts'), 'utf-8');
const resolverSrc = readFileSync(resolve(__dirname, '../services/templateResolver.ts'), 'utf-8');
const styleSrc = readFileSync(resolve(__dirname, '../services/designStyleGuides.ts'), 'utf-8');

describe('★ v735: CTA button label text rendering', () => {
    it('renders text label inside rounded_rect CTA buttons', () => {
        expect(renderElSrc).toContain('el.content');
        expect(renderElSrc).toContain('_label');
        expect(renderElSrc).toContain('labelSize');
    });

    it('auto-calculates label font size from button height', () => {
        expect(renderElSrc).toContain('el.h ?? 50) * 0.4');
    });

    it('centers label text vertically inside button', () => {
        expect(renderElSrc).toContain('labelY');
    });
});

describe('★ v735: Typography sophistication defaults', () => {
    it('applies tight letter-spacing to headlines', () => {
        expect(helpersSrc).toContain('letter_spacing');
        expect(helpersSrc).toContain('-0.5');
    });

    it('applies wide letter-spacing to tags', () => {
        expect(helpersSrc).toContain("el.letter_spacing ?? 2");
    });

    it('preserves template values using ?? operator', () => {
        expect(helpersSrc).toContain('el.letter_spacing ??');
        expect(helpersSrc).toContain('el.line_height ??');
    });
});

describe('★ v735: Image prompt quality enhancement', () => {
    it('instructs AI to include negative space for text', () => {
        expect(styleSrc).toContain('negative space');
    });

    it('instructs AI to never include text in images', () => {
        expect(styleSrc).toContain('NEVER include text/logos');
    });

    it('includes photography-specific guidance', () => {
        expect(styleSrc).toContain('depth of field');
        expect(styleSrc).toContain('color temperature');
    });
});

describe('★ v735: Extreme aspect ratio safeguards', () => {
    it('detects extreme aspect ratios', () => {
        expect(resolverSrc).toContain('aspectRatio');
        expect(resolverSrc).toContain('isExtreme');
    });

    it('enforces minimum font sizes for narrow canvases', () => {
        expect(resolverSrc).toContain('Math.max(14');
        expect(resolverSrc).toContain('Math.max(11');
        expect(resolverSrc).toContain('Math.max(12');
    });

    it('ensures text fills at least 80% of narrow canvas width', () => {
        expect(resolverSrc).toContain('canvasW * 0.85');
    });
});

describe('★ v735: Design polish in pipeline', () => {
    it('pipeline calls polishDesign after validation', () => {
        expect(flowSrc).toContain('polishDesign');
        expect(flowSrc).toContain('designPolish');
    });

    it('reports auto-fixes via narration', () => {
        expect(flowSrc).toContain('Auto-fixed');
    });
});
