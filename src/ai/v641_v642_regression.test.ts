// ─────────────────────────────────────────────────
// v641_v642_regression.test.ts — Canvas Update Pipeline Tests
// ─────────────────────────────────────────────────
// Covers:
// 1. v641: Dashboard override bypass for engine-required tools
// 2. v642: applyPropertyToEngine — all property mappings
// 3. v642: Fabric shim — set_font_family, set_font_weight, -1 sentinel

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ═══════════════════════════════════════════════════
// 1. Dashboard Override Bypass (v641 ROOT CAUSE)
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v641): Dashboard override must bypass engine tools', () => {
    const src = readFileSync(resolve(__dirname, '../hooks/useUnifiedAgent.ts'), 'utf-8');

    it('ENGINE_REQUIRED_TOOLS is defined as a Set', () => {
        expect(src).toContain('const ENGINE_REQUIRED_TOOLS = new Set(');
    });

    it('update_element_text is in ENGINE_REQUIRED_TOOLS', () => {
        const setBlock = src.slice(
            src.indexOf('ENGINE_REQUIRED_TOOLS = new Set'),
            src.indexOf(']);', src.indexOf('ENGINE_REQUIRED_TOOLS = new Set')) + 2
        );
        expect(setBlock).toContain("'update_element_text'");
    });

    it('update_element_property is in ENGINE_REQUIRED_TOOLS', () => {
        const setBlock = src.slice(
            src.indexOf('ENGINE_REQUIRED_TOOLS = new Set'),
            src.indexOf(']);', src.indexOf('ENGINE_REQUIRED_TOOLS = new Set')) + 2
        );
        expect(setBlock).toContain("'update_element_property'");
    });

    it('bypass returns null when engine exists', () => {
        expect(src).toContain('ENGINE_REQUIRED_TOOLS.has(toolName) && engineRef.current');
        expect(src).toContain('return null; // → falls through to commandExecutor');
    });

    it('engine bypass is checked BEFORE dashboard override', () => {
        const bypassIdx = src.indexOf('ENGINE_REQUIRED_TOOLS.has(toolName)');
        const dashIdx = src.indexOf('DASHBOARD_TOOL_NAMES.has(toolName)');
        expect(bypassIdx).toBeGreaterThan(-1);
        expect(dashIdx).toBeGreaterThan(bypassIdx);
    });

    it('generate_full_design is still intercepted (not bypassed)', () => {
        const genIdx = src.indexOf("toolName === 'generate_full_design'");
        const bypassIdx = src.indexOf('ENGINE_REQUIRED_TOOLS.has');
        expect(genIdx).toBeLessThan(bypassIdx);
    });
});

// ═══════════════════════════════════════════════════
// 2. applyPropertyToEngine — All Property Mappings (v642)
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v642): applyPropertyToEngine property coverage', () => {
    const src = readFileSync(resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8');

    // Extract the applyPropertyToEngine function body
    const fnStart = src.indexOf('function applyPropertyToEngine');
    const fnEnd = src.indexOf('\n/**', fnStart + 1);
    const fnBody = src.slice(fnStart, fnEnd);

    // ── Color properties ──
    it('handles "color" property', () => {
        expect(fnBody).toContain("case 'color':");
    });

    it('handles "fill" property', () => {
        expect(fnBody).toContain("case 'fill':");
    });

    it('handles "backgroundColor" property', () => {
        expect(fnBody).toContain("case 'backgroundColor':");
    });

    it('all color cases use set_fill_hex', () => {
        expect(fnBody).toContain('engine.set_fill_hex(nodeId, rawValue)');
    });

    // ── Typography properties ──
    it('handles "fontSize" → set_font_size', () => {
        expect(fnBody).toContain("case 'fontSize':");
        expect(fnBody).toContain('engine.set_font_size(nodeId, numVal)');
    });

    it('handles "fontFamily" → set_font_family', () => {
        expect(fnBody).toContain("case 'fontFamily':");
        expect(fnBody).toContain('engine.set_font_family(nodeId, rawValue)');
    });

    it('handles "fontWeight" → set_font_weight', () => {
        expect(fnBody).toContain("case 'fontWeight':");
        expect(fnBody).toContain('engine.set_font_weight(nodeId, numVal)');
    });

    // ── Transform properties ──
    it('handles "x" → set_position with -1 sentinel for y', () => {
        expect(fnBody).toContain("case 'x':");
        expect(fnBody).toContain('engine.set_position(nodeId, numVal, -1)');
    });

    it('handles "y" → set_position with -1 sentinel for x', () => {
        expect(fnBody).toContain("case 'y':");
        expect(fnBody).toContain('engine.set_position(nodeId, -1, numVal)');
    });

    it('handles "width" and "w" → set_size with -1 sentinel for h', () => {
        expect(fnBody).toContain("case 'width':");
        expect(fnBody).toContain("case 'w':");
        expect(fnBody).toContain('engine.set_size(nodeId, numVal, -1)');
    });

    it('handles "height" and "h" → set_size with -1 sentinel for w', () => {
        expect(fnBody).toContain("case 'height':");
        expect(fnBody).toContain("case 'h':");
        expect(fnBody).toContain('engine.set_size(nodeId, -1, numVal)');
    });

    it('handles "angle" and "rotation" → set_angle', () => {
        expect(fnBody).toContain("case 'angle':");
        expect(fnBody).toContain("case 'rotation':");
        expect(fnBody).toContain('engine.set_angle(nodeId, numVal)');
    });

    // ── Visual properties ──
    it('handles "opacity" → set_opacity', () => {
        expect(fnBody).toContain("case 'opacity':");
        expect(fnBody).toContain('engine.set_opacity(nodeId, numVal)');
    });

    // ── Safety ──
    it('returns false for unknown properties', () => {
        expect(fnBody).toContain('default:');
        expect(fnBody).toContain('return false;');
    });

    it('logs unknown properties for debugging', () => {
        expect(fnBody).toContain('No engine handler for');
    });

    it('checks engine method existence before calling', () => {
        // Every case checks if (engine.set_*) before calling
        const setChecks = fnBody.match(/if \(engine\.set_/g) ?? [];
        expect(setChecks.length).toBeGreaterThanOrEqual(9); // 9+ engine methods checked
    });
});

// ═══════════════════════════════════════════════════
// 3. Fabric Shim — New Methods & -1 Sentinel (v642)
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v642): Fabric shim new methods', () => {
    const src = readFileSync(resolve(__dirname, '../hooks/fabricEngineShim.ts'), 'utf-8');

    it('has set_font_family method', () => {
        expect(src).toContain('set_font_family:');
        expect(src).toContain("'fontFamily' in obj");
    });

    it('set_font_family calls setCoords + renderAll + syncState', () => {
        const block = src.slice(
            src.indexOf('set_font_family:'),
            src.indexOf('set_font_weight:')
        );
        expect(block).toContain('setCoords()');
        expect(block).toContain('fc.renderAll()');
        expect(block).toContain('syncState()');
    });

    it('has set_font_weight method', () => {
        expect(src).toContain('set_font_weight:');
        expect(src).toContain("'fontWeight' in obj");
    });

    it('set_font_weight calls setCoords + renderAll + syncState', () => {
        const block = src.slice(
            src.indexOf('set_font_weight:'),
            src.indexOf('set_position:')
        );
        expect(block).toContain('setCoords()');
        expect(block).toContain('fc.renderAll()');
        expect(block).toContain('syncState()');
    });
});

describe('★ REGRESSION (v642): Fabric shim -1 sentinel handling', () => {
    const src = readFileSync(resolve(__dirname, '../hooks/fabricEngineShim.ts'), 'utf-8');

    it('set_position handles -1 sentinel for x', () => {
        const block = src.slice(
            src.indexOf('set_position:'),
            src.indexOf('set_angle:')
        );
        expect(block).toContain('x >= 0 ? x : (obj.left');
    });

    it('set_position handles -1 sentinel for y', () => {
        const block = src.slice(
            src.indexOf('set_position:'),
            src.indexOf('set_angle:')
        );
        expect(block).toContain('y >= 0 ? y : (obj.top');
    });

    it('set_size handles -1 sentinel for w', () => {
        const block = src.slice(
            src.indexOf('set_size:'),
            src.indexOf('fill_to_page:')
        );
        expect(block).toContain('w >= 0 ? w : curW');
    });

    it('set_size handles -1 sentinel for h', () => {
        const block = src.slice(
            src.indexOf('set_size:'),
            src.indexOf('fill_to_page:')
        );
        expect(block).toContain('h >= 0 ? h : curH');
    });
});

describe('★ REGRESSION (v642): All mutating shim methods call syncState', () => {
    const src = readFileSync(resolve(__dirname, '../hooks/fabricEngineShim.ts'), 'utf-8');
    const methods = [
        { name: 'set_text_content', end: 'set_fill_hex' },
        { name: 'set_fill_hex', end: 'set_font_family' },
        { name: 'set_font_family', end: 'set_font_weight' },
        { name: 'set_font_weight', end: 'set_position' },
        { name: 'set_position', end: 'set_angle' },
        { name: 'set_angle', end: 'set_size' },
        { name: 'set_size', end: 'fill_to_page' },
        { name: 'set_font_size', end: 'set_text_content' },
    ];

    for (const { name, end } of methods) {
        it(`${name} calls syncState()`, () => {
            const block = src.slice(src.indexOf(`${name}:`), src.indexOf(`${end}:`));
            expect(block).toContain('syncState()');
        });
    }
});

// ═══════════════════════════════════════════════════
// 4. Engine diagnostic logging (v640)
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v640): update_element_text diagnostic logging', () => {
    const src = readFileSync(resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8');

    it('logs engine availability on every call', () => {
        expect(src).toContain('engine exists:');
    });

    it('logs total canvas node count', () => {
        expect(src).toContain('Canvas has');
        expect(src).toContain('total nodes');
    });

    it('logs text node names with IDs', () => {
        expect(src).toContain('text nodes:');
    });

    it('warns when engine is completely missing', () => {
        expect(src).toContain('⚠ NO ENGINE');
    });

    it('snapshots canvas BEFORE store update', () => {
        expect(src).toContain('canvasTextBefore');
        const snapshotIdx = src.indexOf('canvasTextBefore');
        const storeIdx = src.indexOf("executeDesignCommand('update_element_text'");
        expect(snapshotIdx).toBeLessThan(storeIdx);
    });
});
