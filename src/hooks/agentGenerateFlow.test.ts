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

    it('Phase 2: AI copywriting', () => {
        expect(src).toContain('callTemplateContent');
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
// ★ REGRESSION: Template reference-size scaling
// ══════════════════════════════════════════════════
describe('★ REGRESSION: template builds at reference size', () => {
    it('defines REF_SIZE = 1080 for consistent template builds', () => {
        expect(src).toContain('REF_SIZE = 1080');
    });

    it('builds template at reference dimensions, not raw canvas size', () => {
        expect(src).toContain('template.build(refW, refH, guide, content)');
    });

    it('scales x, y, w, h from reference to actual canvas', () => {
        expect(src).toContain('scaleX = canvasW / refW');
        expect(src).toContain('scaleY = canvasH / refH');
    });

    it('scales font_size proportionally with min cap of 8px', () => {
        expect(src).toContain('Math.max(8,');
        expect(src).toContain('Math.min(scaleX, scaleY)');
    });

    it('preserves aspect ratio for reference dimensions', () => {
        expect(src).toContain('refAspect = canvasW / canvasH');
    });

    it('★ REGRESSION: never calls template.build with raw canvasW, canvasH', () => {
        // The old bug: template.build(canvasW, canvasH, ...) produced tiny text at 300x250
        // New code: template.build(refW, refH, ...) always builds at ~1080 scale
        const buildCalls = src.match(/template\.build\([^)]+\)/g) ?? [];
        for (const call of buildCalls) {
            expect(call).not.toContain('canvasW, canvasH');
        }
    });
});
