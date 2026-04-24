// ─────────────────────────────────────────────────
// useUnifiedAgent.test.ts — v641 Root Cause Regression Tests
// ─────────────────────────────────────────────────
// Ensures update_element_text/property bypass dashboard override
// when engine is available, so commandExecutor handles canvas + store.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useUnifiedAgent.ts'), 'utf-8');

describe('★ REGRESSION (v641): Dashboard override must NOT intercept canvas tools', () => {

    it('defines ENGINE_REQUIRED_TOOLS set', () => {
        expect(src).toContain('ENGINE_REQUIRED_TOOLS');
    });

    it('ENGINE_REQUIRED_TOOLS includes update_element_text', () => {
        expect(src).toContain("'update_element_text'");
        // Must be inside ENGINE_REQUIRED_TOOLS set, not just anywhere
        const setLine = src.slice(
            src.indexOf('ENGINE_REQUIRED_TOOLS'),
            src.indexOf(']);', src.indexOf('ENGINE_REQUIRED_TOOLS'))
        );
        expect(setLine).toContain('update_element_text');
    });

    it('ENGINE_REQUIRED_TOOLS includes update_element_property', () => {
        const setLine = src.slice(
            src.indexOf('ENGINE_REQUIRED_TOOLS'),
            src.indexOf(']);', src.indexOf('ENGINE_REQUIRED_TOOLS'))
        );
        expect(setLine).toContain('update_element_property');
    });

    it('returns null (bypass) for ENGINE_REQUIRED_TOOLS when engine exists', () => {
        // The pattern: if engine exists AND tool is engine-required → return null
        expect(src).toContain('ENGINE_REQUIRED_TOOLS.has(toolName) && engineRef.current');
        expect(src).toContain('return null; // → falls through to commandExecutor');
    });

    it('engine check comes BEFORE dashboard tool check', () => {
        const engineCheckIdx = src.indexOf('ENGINE_REQUIRED_TOOLS.has(toolName)');
        const dashboardCheckIdx = src.indexOf('DASHBOARD_TOOL_NAMES.has(toolName)');
        expect(engineCheckIdx).toBeGreaterThan(-1);
        expect(dashboardCheckIdx).toBeGreaterThan(-1);
        expect(engineCheckIdx).toBeLessThan(dashboardCheckIdx);
    });

    it('dashboard override still handles non-engine tools', () => {
        expect(src).toContain('DASHBOARD_TOOL_NAMES.has(toolName)');
        expect(src).toContain('executeDashboardTool(toolName, params, navigate)');
    });
});

// ═══════════════════════════════════════════════════
// commandExecutor — engine update for update_element_text
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v641): commandExecutor reaches canvas engine', () => {
    const execSrc = readFileSync(resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8');

    it('snapshots canvas text BEFORE store update', () => {
        const snapshotIdx = execSrc.indexOf('canvasTextBefore');
        const storeIdx = execSrc.indexOf("executeDesignCommand('update_element_text'");
        expect(snapshotIdx).toBeGreaterThan(-1);
        expect(storeIdx).toBeGreaterThan(-1);
        expect(snapshotIdx).toBeLessThan(storeIdx);
    });

    it('logs engine availability diagnostic', () => {
        expect(execSrc).toContain('engine exists:');
        expect(execSrc).toContain('get_all_nodes:');
        expect(execSrc).toContain('set_text_content:');
    });

    it('warns when engine is missing', () => {
        expect(execSrc).toContain('NO ENGINE');
    });

    it('updates both store AND engine for text changes', () => {
        expect(execSrc).toContain("executeDesignCommand('update_element_text'");
        expect(execSrc).toContain('engine.set_text_content(');
    });

    it('reports canvas + store in success message', () => {
        expect(execSrc).toContain('canvas + store');
    });
});

// ═══════════════════════════════════════════════════
// commandExecutor — engine update for update_element_property
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v641): commandExecutor property updates reach canvas', () => {
    const execSrc = readFileSync(resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8');

    it('handles color via set_fill_hex', () => {
        expect(execSrc).toContain('engine.set_fill_hex(');
    });

    it('handles fontSize via set_font_size', () => {
        expect(execSrc).toContain('engine.set_font_size(');
    });

    it('handles opacity via set_opacity', () => {
        expect(execSrc).toContain('engine.set_opacity(');
    });

    it('handles position (x, y) via set_position', () => {
        expect(execSrc).toContain('engine.set_position(');
    });

    it('handles size (width, height) via set_size', () => {
        expect(execSrc).toContain('engine.set_size(');
    });

    it('handles fontFamily via set on Fabric object', () => {
        expect(execSrc).toContain('fontFamily');
    });

    it('also updates store for persistence', () => {
        expect(execSrc).toContain("executeDesignCommand('update_element_property'");
    });
});

// ═══════════════════════════════════════════════════
// v691→v692: Character-level streaming narration
// ═══════════════════════════════════════════════════

describe('★ v692: Character-level streaming narration', () => {

    it('declares streamBuf ref for token accumulation', () => {
        expect(src).toContain("streamBuf = useRef('')");
    });

    it('onToken appends tokens to streamBuf', () => {
        expect(src).toContain('streamBuf.current += token');
    });

    it('uses 30ms throttle for React render performance', () => {
        expect(src).toContain('now - lastEmit >= 30');
    });

    it('emits immediately on sentence boundaries', () => {
        expect(src).toContain("/[.!?\\n]$/.test(token)");
    });

    it('calls narrate with full accumulated text (character-level)', () => {
        expect(src).toContain('narrate(streamBuf.current.trim())');
    });

    it('tracks _lastEmit timestamp for throttling', () => {
        expect(src).toContain('_lastEmit');
    });

    it('flushes remaining tokens after chat completes', () => {
        expect(src).toContain('streamBuf.current.trim()');
        const flushIdx = src.indexOf('Flush any remaining streamed tokens');
        expect(flushIdx).toBeGreaterThan(-1);
    });
});

// ═══════════════════════════════════════════════════
// v691: Auto-resize orchestration after design gen
// ═══════════════════════════════════════════════════

describe('★ v691: Auto-resize after generate_full_design', () => {

    it('checks for multi-variant creative set', () => {
        expect(src).toContain('cs.variants.length > 1');
    });

    it('imports orchestrateResize dynamically', () => {
        expect(src).toContain("import('@/ai/services/resizeOrchestrator')");
    });

    it('calls orchestrateResize with creativeSet and progress callback', () => {
        expect(src).toContain('orchestrateResize(cs,');
    });

    it('narrates smart sizing progress', () => {
        expect(src).toContain('Smart sizing all variants');
    });

    it('resize failure is non-blocking', () => {
        expect(src).toContain('Auto-resize failed (non-blocking)');
    });

    it('resize runs AFTER generateFlow, not before', () => {
        const genIdx = src.indexOf('runGenerateFlow(pendingDesignPrompt)');
        const resizeIdx = src.indexOf('orchestrateResize(cs,');
        expect(genIdx).toBeGreaterThan(-1);
        expect(resizeIdx).toBeGreaterThan(-1);
        expect(resizeIdx).toBeGreaterThan(genIdx);
    });
});
