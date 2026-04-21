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
