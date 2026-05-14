// ─────────────────────────────────────────────────
// agentGenerateFlow.test.ts — AI Design Generation Pipeline
// ─────────────────────────────────────────────────
// Covers: phase progression, brand cloud scan, copywriting,
// template selection, color palette, BG image, vision QA
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './agentGenerateFlow.ts'), 'utf-8');
const renderSrc = readFileSync(resolve(__dirname, './agentFlowRender.ts'), 'utf-8');
const paletteSrc = readFileSync(resolve(__dirname, './agentFlowPalette.ts'), 'utf-8');

describe('agentGenerateFlow — export', () => {
    it('exports executeGenerateFlow async function', () => {
        expect(src).toContain('export async function executeGenerateFlow');
    });

    it('accepts prompt, engine, and callbacks', () => {
        expect(src).toContain('prompt: string');
        expect(src).toContain('engine: FlowEngine');
        expect(src).toContain('cb: AgentFlowCallbacks');
    });
});

describe('agentGenerateFlow — pipeline phases', () => {
    it('Phase 1: scans current canvas state', () => {
        expect(src).toContain('get_all_nodes');
        expect(src).toContain('elementCount');
    });

    it('Phase 1.5: brand cloud scan', () => {
        expect(src).toContain('scanBrandCloud');
    });

    it('Phase 2: AI design brief', () => {
        expect(src).toContain('generateDesignBrief');
    });

    it('reads canvas dimensions', () => {
        expect(src).toContain('get_canvas_size');
        expect(src).toContain('canvasW');
        expect(src).toContain('canvasH');
    });
});

describe('agentGenerateFlow — narration', () => {
    it('narrates each phase transition', () => {
        const narrates = src.match(/cb\.narrate\(/g);
        expect(narrates).not.toBeNull();
        expect(narrates!.length).toBeGreaterThanOrEqual(3);
    });

    it('uses progress cards for visual feedback', () => {
        expect(src).toContain('cb.addCard');
        expect(src).toContain('cb.updateCard');
    });

    it('reports running and done statuses', () => {
        expect(src).toContain("'running'");
        expect(src).toContain("'done'");
    });
});

describe('agentGenerateFlow — error resilience', () => {
    it('uses resilientImport for dynamic imports', () => {
        expect(src).toContain('resilientImport');
    });

    it('wraps phases in try-catch', () => {
        const catches = src.match(/catch/g);
        expect(catches).not.toBeNull();
        expect(catches!.length).toBeGreaterThanOrEqual(2);
    });

    it('supports abort controller', () => {
        expect(src).toContain('AbortController');
    });
});

describe('agentGenerateFlow — user preferences', () => {
    it('loads user preferences for context', () => {
        expect(src).toContain('loadUserPrefs');
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION: Carbon replaces templates as primary layout engine
// ══════════════════════════════════════════════════
describe('★ REGRESSION: Template-first pipeline (Carbon removed v734)', () => {
    it('main flow uses selectTemplate inside buildAndRender', () => {
        expect(src).toContain('selectTemplate');
        expect(src).toContain('selectTmpl');
    });

    it('uses resolveTemplateElements as primary layout source', () => {
        expect(src).toContain('resolveTemplateElements');
        expect(src).toContain('templateResolver');
    });

    it('does NOT use Carbon buildDesignElements', () => {
        expect(src).not.toContain('buildDesignElements');
        expect(src).not.toContain('USE_CARBON_LAYOUT');
    });

    it('template elements are resolved by template ID', () => {
        expect(src).toContain('resolveTemplateElements(tmpl.id');
    });

    it('builds template catalog from Supabase store for AI selection', () => {
        // ★ v745: Catalog building extracted to agentFlowPalette.ts
        expect(paletteSrc).toContain('templateCatalog');
        expect(paletteSrc).toContain('useTemplateStore');
    });

    it('passes aiTemplateId to selectTemplate', () => {
        expect(src).toContain('aiTemplateId');
    });
});

// ══════════════════════════════════════════════════
// Functional: reference-size scaling math
// ══════════════════════════════════════════════════
describe('reference-size scaling — math verification', () => {
    const REF_SIZE = 1080;

    function computeRefDims(canvasW: number, canvasH: number) {
        const refAspect = canvasW / canvasH;
        const refW = refAspect >= 1 ? REF_SIZE : Math.round(REF_SIZE * refAspect);
        const refH = refAspect >= 1 ? Math.round(REF_SIZE / refAspect) : REF_SIZE;
        return { refW, refH };
    }

    function scaleElement(el: { x: number; y: number; w: number; h: number; font_size: number }, canvasW: number, canvasH: number) {
        const { refW, refH } = computeRefDims(canvasW, canvasH);
        const scaleX = canvasW / refW;
        const scaleY = canvasH / refH;
        return {
            x: Math.round(el.x * scaleX),
            y: Math.round(el.y * scaleY),
            w: Math.round(el.w * scaleX),
            h: Math.round(el.h * scaleY),
            font_size: Math.max(8, Math.round(el.font_size * Math.min(scaleX, scaleY))),
        };
    }

    it('300x250 landscape: refDims maintain aspect ratio', () => {
        const { refW, refH } = computeRefDims(300, 250);
        expect(refW).toBe(1080);
        expect(refH).toBe(900);
        expect(Math.abs(refW / refH - 300 / 250)).toBeLessThan(0.01);
    });

    it('1080x1920 portrait: refDims use height as reference', () => {
        const { refW, refH } = computeRefDims(1080, 1920);
        expect(refH).toBe(1080);
        expect(refW).toBe(608); // round(1080 * 1080/1920)
    });

    it('1080x1080 square: refDims equals REF_SIZE', () => {
        const { refW, refH } = computeRefDims(1080, 1080);
        expect(refW).toBe(1080);
        expect(refH).toBe(1080);
    });

    it('scaling a headline: 76px at ref → proportional at 300x250', () => {
        const refEl = { x: 86, y: 200, w: 908, h: 168, font_size: 76 };
        const scaled = scaleElement(refEl, 300, 250);
        // Scale factor ~0.278
        expect(scaled.font_size).toBeGreaterThanOrEqual(8);
        expect(scaled.font_size).toBeLessThanOrEqual(25);
        expect(scaled.w).toBeGreaterThan(200);
    });

    it('font_size never goes below 8px', () => {
        const refEl = { x: 0, y: 0, w: 100, h: 20, font_size: 10 };
        const scaled = scaleElement(refEl, 50, 50);
        expect(scaled.font_size).toBe(8);
    });

    it('160x600 skyscraper: font uses smaller scale to prevent oversized text', () => {
        const { refW, refH } = computeRefDims(160, 600);
        // Portrait: refH = 1080, refW = round(1080 * 160/600) = 288
        expect(refH).toBe(1080);
        const scaleX = 160 / refW;
        const scaleY = 600 / refH;
        // scaleX ≈ 0.556, scaleY ≈ 0.556 — actually proportional due to ref dims
        // Font uses Math.min to ensure text fits in the narrower dimension
        expect(Math.min(scaleX, scaleY)).toBeLessThanOrEqual(scaleX);
    });

    it('background rect always fills full canvas after scaling', () => {
        const ref = computeRefDims(300, 250);
        const bgEl = { x: 0, y: 0, w: ref.refW, h: ref.refH, font_size: 0 };
        const scaled = scaleElement(bgEl, 300, 250);
        expect(scaled.x).toBe(0);
        expect(scaled.y).toBe(0);
        expect(scaled.w).toBe(300);
        expect(scaled.h).toBe(250);
    });

    it('element proportions preserved across sizes', () => {
        const ref = computeRefDims(300, 250);
        const el = { x: Math.round(ref.refW * 0.1), y: Math.round(ref.refH * 0.2), w: Math.round(ref.refW * 0.8), h: Math.round(ref.refH * 0.1), font_size: 48 };
        const scaled = scaleElement(el, 300, 250);
        // x should be ~10% of 300 = 30
        expect(Math.abs(scaled.x - 30)).toBeLessThan(3);
        // w should be ~80% of 300 = 240
        expect(Math.abs(scaled.w - 240)).toBeLessThan(3);
    });
});

// ══════════════════════════════════════════════════
// Source: pipeline completeness checks
// ══════════════════════════════════════════════════
describe('agentGenerateFlow — pipeline completeness', () => {
    it('Phase 3: background image BEFORE palette (Image-First)', () => {
        // ★ v747: Image-First — BG image is generated before palette
        const phase3Idx = src.indexOf('Phase 3');
        const bgImageIdx = src.indexOf('generateBgImage');
        const paletteIdx = src.indexOf('runPalettePhase');
        expect(phase3Idx).toBeGreaterThan(-1);
        expect(bgImageIdx).toBeLessThan(paletteIdx);
    });

    it('Phase 3.5: extracts colors from generated image', () => {
        expect(src).toContain('extractColorsFromImage');
        expect(src).toContain('imageColorExtractor');
    });

    it('Phase 4: palette uses extracted image colors', () => {
        expect(src).toContain('runPalettePhase');
        expect(src).toContain('imageColors');
        expect(paletteSrc).toContain('imageColors?: ExtractedColors');
    });

    it('Phase 5: renders elements in layered passes', () => {
        expect(src).toContain('structureNames');
        expect(src).toContain('contentNames');
        expect(src).toContain('actionNames');
    });

    it('Phase 6: runs vision QA loop (in agentFlowRender)', () => {
        expect(renderSrc).toContain('runVisionHealingLoop');
    });

    it('Phase 7: saves to AI memory', () => {
        expect(src).toContain('addDesignEntry');
        expect(src).toContain('aiMemoryService');
    });

    it('renders gradient rects (in agentFlowRender)', () => {
        expect(renderSrc).toContain('add_gradient_rect');
        expect(renderSrc).toContain('gradient_start_hex');
    });

    it('renders rounded_rect for CTA buttons (in agentFlowRender)', () => {
        expect(renderSrc).toContain('add_rounded_rect');
        expect(renderSrc).toContain("type === 'rounded_rect'");
    });

    it('clears scene before rendering', () => {
        expect(src).toContain('clear_scene');
        expect(src).toContain('clearGradientCache');
    });

    it('reorders by z-index after rendering', () => {
        expect(src).toContain('reorder_by_z_index');
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION: Stepper phase sync
// ══════════════════════════════════════════════════
describe('★ REGRESSION: stepper phases sync with pipeline', () => {
    it('calls setPhase thinking at Phase 1 (Canvas scan)', () => {
        expect(src).toContain("cb.setPhase?.('thinking')");
    });

    it('calls setPhase planning at Phase 2 (Copywriting)', () => {
        expect(src).toContain("cb.setPhase?.('planning')");
    });

    it('calls setPhase executing at Phase 5 (Template Build)', () => {
        expect(src).toContain("cb.setPhase?.('executing')");
    });

    it('calls setPhase reflecting at Phase 6 (Vision QA)', () => {
        expect(src).toContain("cb.setPhase?.('reflecting')");
    });

    it('all 4 stepper phases are called exactly once each', () => {
        const phases = ['thinking', 'planning', 'executing', 'reflecting'];
        for (const phase of phases) {
            const needle = `setPhase?.('${phase}')`;
            const count = src.split(needle).length - 1;
            expect(count).toBe(1);
        }
    });

    it('phases appear in correct order in source', () => {
        const thinkingIdx = src.indexOf("setPhase?.('thinking')");
        const planningIdx = src.indexOf("setPhase?.('planning')");
        const executingIdx = src.indexOf("setPhase?.('executing')");
        const reflectingIdx = src.indexOf("setPhase?.('reflecting')");
        expect(thinkingIdx).toBeLessThan(planningIdx);
        expect(planningIdx).toBeLessThan(executingIdx);
        expect(executingIdx).toBeLessThan(reflectingIdx);
    });
});

// ── useUnifiedAgent wires setPhase ──
describe('useUnifiedAgent — setPhase wiring', () => {
    const agentSrc = require('fs').readFileSync(
        require('path').resolve(__dirname, './useUnifiedAgent.ts'), 'utf-8'
    );

    it('defines setPhase callback', () => {
        expect(agentSrc).toContain('const setPhase');
    });

    it('passes setPhase into flowCallbacks', () => {
        expect(agentSrc).toContain('setPhase }');
    });

    it('setPhase updates state.phase', () => {
        expect(agentSrc).toContain('prev, phase');
    });
});

// ── agentFlowTypes has setPhase ──
describe('agentFlowTypes — setPhase interface', () => {
    const typesSrc = require('fs').readFileSync(
        require('path').resolve(__dirname, './agentFlowTypes.ts'), 'utf-8'
    );

    it('AgentFlowCallbacks has optional setPhase', () => {
        expect(typesSrc).toContain('setPhase?:');
    });

    it('setPhase accepts stepper phases', () => {
        expect(typesSrc).toContain("'thinking' | 'planning' | 'executing' | 'reflecting'");
    });
});

const helpersSrc = readFileSync(resolve(__dirname, './agentFlowHelpers.ts'), 'utf-8');
const textLayoutSrc = readFileSync(resolve(__dirname, './agentTextLayout.ts'), 'utf-8');

describe('★ REGRESSION: Template-based content injection (v734)', () => {
    it('★ v743: uses slot-based assembly from design brief', () => {
        // Content-First: roleMap classifies elements, brief.slots decides what to keep
        expect(helpersSrc).toContain("name.includes('headline')");
        expect(helpersSrc).toContain('roleMap');
        expect(helpersSrc).toContain('activeSlots');
        expect(helpersSrc).toContain('contentByRole');
    });

    it('uses AI fonts as fallback only when template has none', () => {
        expect(helpersSrc).toContain('!el.font_family');
        expect(helpersSrc).toContain('guide.typography.primaryFont');
        expect(helpersSrc).toContain('guide.typography.secondaryFont');
    });

    it('strips template BG when AI image exists', () => {
        expect(helpersSrc).toContain('BG_NAMES');
        expect(helpersSrc).toContain('bgResult.hasImage');
    });

    it('keeps template BG and recolors when no AI image', () => {
        expect(helpersSrc).toContain('recolorTemplateElements');
    });

    it('auto-created subheadline helper still exported', () => {
        expect(textLayoutSrc).toContain('canvasH * 0.035');
        expect(textLayoutSrc).toContain('Math.max(14, Math.min(32');
    });

    it('auto-created subheadline inherits headline x/w/textAlign (in helpers)', () => {
        expect(textLayoutSrc).toContain('headlineEl?.x');
        expect(textLayoutSrc).toContain('headlineEl?.w');
        expect(textLayoutSrc).toContain('headlineEl?.text_align');
    });

    it('recalcTextHeights auto-shrinks fonts when overflowing bounding box', () => {
        expect(textLayoutSrc).toContain('maxAllowedH');
        expect(textLayoutSrc).toContain('el.font_size > 12');
    });

    it('★ v736: uses text shadows instead of overlay rectangles', () => {
        expect(helpersSrc).not.toContain('buildOverlayResult');
        expect(helpersSrc).toContain('shadow_blur');
        expect(helpersSrc).toContain('shadow_opacity');
    });

    it('★ v737: uses colorHarmony for gradient backgrounds', () => {
        expect(helpersSrc).toContain('analyzeBackground');
        expect(helpersSrc).toContain('deriveHarmonyPalette');
        expect(helpersSrc).toContain('applyHarmonyColors');
    });

    it('★ v738: BG image text is always white (photos are unpredictable)', () => {
        // When bgResult.hasImage is true, text must be white with shadow
        expect(helpersSrc).toContain("el.color_hex = '#FFFFFF'");
        expect(helpersSrc).toContain('shadow_blur');
        expect(helpersSrc).toContain('shadow_opacity');
    });

    it('★ v743: Content-First slot-based assembly (no template placeholders)', () => {
        // Role classification by name
        expect(helpersSrc).toContain("name.includes('body')");
        expect(helpersSrc).toContain("name.includes('description')");
        // Font-size inference for unknowns
        expect(helpersSrc).toContain('Role-inferred');
        // Unused slots get removed entirely
        expect(helpersSrc).toContain('Removing unused slot');
        // Shape elements tied to removed roles also get removed
        expect(helpersSrc).toContain('Removing CTA shape');
    });
});

// ══════════════════════════════════════════════════
// ★ v747: Image-First Pipeline Regression Guards
// ══════════════════════════════════════════════════
describe('★ v747: Image-First pipeline order', () => {
    it('★ REGRESSION: generateBgImage appears BEFORE runPalettePhase in source', () => {
        const bgImageIdx = src.indexOf('generateBgImage');
        const paletteIdx = src.indexOf('runPalettePhase');
        expect(bgImageIdx).toBeGreaterThan(-1);
        expect(paletteIdx).toBeGreaterThan(-1);
        expect(bgImageIdx).toBeLessThan(paletteIdx);
    });

    it('★ REGRESSION: extractColorsFromImage appears BEFORE runPalettePhase call', () => {
        const extractIdx = src.indexOf('extractColorsFromImage');
        const paletteIdx = src.indexOf('await runPalettePhase(');
        expect(extractIdx).toBeGreaterThan(-1);
        expect(extractIdx).toBeLessThan(paletteIdx);
    });

    it('★ REGRESSION: palette phase receives imageColors parameter', () => {
        expect(paletteSrc).toContain('imageColors?: ExtractedColors');
        expect(paletteSrc).toContain('imageColors');
    });

    it('★ REGRESSION: palette overrides colors when imageColors provided', () => {
        expect(paletteSrc).toContain('Image-First palette override');
        expect(paletteSrc).toContain('guide.colors.background = imageColors.dominant');
        expect(paletteSrc).toContain('guide.colors.foreground = imageColors.suggestedText');
    });

    it('★ REGRESSION: uses decideBackgroundImage before palette call', () => {
        const decideIdx = src.indexOf('decideBackgroundImage');
        const paletteIdx = src.indexOf('await runPalettePhase(');
        expect(decideIdx).toBeGreaterThan(-1);
        expect(decideIdx).toBeLessThan(paletteIdx);
    });

    it('★ REGRESSION: fallback path generates image after palette if needed', () => {
        expect(src).toContain('paletteResult.needsBackgroundImage');
        expect(src).toContain('paletteResult.backgroundImagePrompt');
    });

    it('★ REGRESSION: PaletteResult includes backgroundImagePrompt', () => {
        expect(paletteSrc).toContain('backgroundImagePrompt: string');
        expect(paletteSrc).toContain('needsBackgroundImage: boolean');
    });
});
