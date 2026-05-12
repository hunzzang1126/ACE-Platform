// ─────────────────────────────────────────────────
// agentFlowHelpers.test.ts — Unit tests for extracted helpers
// ─────────────────────────────────────────────────
// Covers: recalcTextHeights, autoCreateSubheadline

import { describe, it, expect } from 'vitest';
import { recalcTextHeights, autoCreateSubheadline } from './agentFlowHelpers';

// ══════════════════════════════════════════════════
// recalcTextHeights
// ══════════════════════════════════════════════════
describe('recalcTextHeights', () => {
    it('preserves template height for short text (no overflow)', () => {
        const els = [{ type: 'text', content: 'Hello', font_size: 24, w: 300, h: 40, font_weight: '400' }];
        recalcTextHeights(els, 500);
        // ★ v736: template height is sacred — not recalculated
        expect(els[0].h).toBe(40); // Preserved from template
        expect(els[0].font_size).toBe(24); // Not shrunk
    });

    it('shrinks font for long text that would overflow canvas, preserves height', () => {
        const longText = 'About The Products Main Benefit For Your Business Growth';
        const els = [{ type: 'text', content: longText, font_size: 48, w: 300, h: 50, font_weight: '700' }];
        recalcTextHeights(els, 1080);
        // ★ v736: h is sacred. Font shrinks because estimated height > 40% of 1080 (432px)
        expect(els[0].h).toBe(50); // Template height preserved
        expect(els[0].font_size).toBeLessThan(48); // Font shrunk to fit
        expect(els[0].font_size).toBeGreaterThanOrEqual(12);
    });

    it('auto-shrinks font if text exceeds 40% of canvas height', () => {
        const longText = 'About The Products Main Benefit For Your Business';
        const els = [{ type: 'text', content: longText, font_size: 200, w: 300, h: 0, font_weight: '700' }];
        recalcTextHeights(els, 250);
        // maxH = 250 * 0.4 = 100. 200px font → many lines → way over 100.
        // Must shrink until h <= 100
        expect(els[0].h).toBeLessThanOrEqual(100);
        expect(els[0].font_size).toBeLessThan(200);
        expect(els[0].font_size).toBeGreaterThanOrEqual(12); // Never below 12
    });

    it('does not shrink font below 12px', () => {
        const veryLong = 'A'.repeat(500);
        const els = [{ type: 'text', content: veryLong, font_size: 20, w: 50, h: 0, font_weight: '400' }];
        recalcTextHeights(els, 100);
        // Even with shrinking, font_size should never go below 12
        expect(els[0].font_size).toBeGreaterThanOrEqual(12);
    });

    it('skips non-text elements', () => {
        const els = [
            { type: 'rect', content: 'test', font_size: 24, w: 300, h: 100 },
            { type: 'text', content: 'Hello', font_size: 24, w: 300, h: 40, font_weight: '400' },
        ];
        recalcTextHeights(els, 500);
        expect(els[0].h).toBe(100); // rect unchanged
        expect(els[1].h).toBe(40);  // ★ v736: template height preserved
    });

    it('skips text elements with missing content/font_size/width', () => {
        const els = [
            { type: 'text', content: '', font_size: 24, w: 300, h: 0 },
            { type: 'text', content: 'Hi', font_size: 0, w: 300, h: 0 },
            { type: 'text', content: 'Hi', font_size: 24, w: 0, h: 0 },
        ];
        recalcTextHeights(els, 500);
        expect(els[0].h).toBe(0); // No content
        expect(els[1].h).toBe(0); // No font_size
        expect(els[2].h).toBe(0); // No width
    });

    it('bold text uses wider char width estimate (0.65 vs 0.50)', () => {
        const text = 'Same Text Here';
        const regular = [{ type: 'text', content: text, font_size: 30, w: 200, h: 0, font_weight: '400' }];
        const bold = [{ type: 'text', content: text, font_size: 30, w: 200, h: 0, font_weight: '700' }];
        recalcTextHeights(regular, 1000);
        recalcTextHeights(bold, 1000);
        // Bold chars are wider → fewer per line → more lines → taller
        expect(bold[0].h).toBeGreaterThanOrEqual(regular[0].h);
    });
});

// ══════════════════════════════════════════════════
// autoCreateSubheadline
// ══════════════════════════════════════════════════
describe('autoCreateSubheadline', () => {
    it('creates a subheadline element and pushes it to the array', () => {
        const elements: any[] = [
            { type: 'text', name: 'headline', content: 'Main Title', x: 20, y: 50, w: 260, h: 40, font_size: 36, font_weight: '700', text_align: 'center', color_hex: '#FF0000' },
        ];
        const content = { headline: 'Main Title', subheadline: 'Supporting text here' };
        autoCreateSubheadline(elements, content, 300, 250);
        
        const sub = elements.find(el => el.name === 'subheadline');
        expect(sub).toBeDefined();
        expect(sub.content).toBe('Supporting text here');
        expect(sub.type).toBe('text');
    });

    it('positions subheadline below headline', () => {
        const elements: any[] = [
            { type: 'text', name: 'headline', content: 'Hello', x: 20, y: 50, w: 260, h: 40, font_size: 36, font_weight: '700' },
        ];
        const content = { headline: 'Hello', subheadline: 'World' };
        autoCreateSubheadline(elements, content, 300, 250);
        
        const sub = elements.find(el => el.name === 'subheadline');
        // Subheadline y should be after headline y + headline height + gap
        expect(sub.y).toBeGreaterThan(50);
    });

    it('inherits text_align from headline', () => {
        const elements: any[] = [
            { type: 'text', name: 'headline', content: 'Centered', x: 20, y: 50, w: 260, h: 40, font_size: 36, font_weight: '700', text_align: 'center' },
        ];
        autoCreateSubheadline(elements, { headline: 'Centered', subheadline: 'Sub' }, 300, 250);
        expect(elements.find(el => el.name === 'subheadline').text_align).toBe('center');
    });

    it('inherits color_hex from headline', () => {
        const elements: any[] = [
            { type: 'text', name: 'headline', content: 'Title', x: 20, y: 50, w: 260, h: 40, font_size: 36, font_weight: '700', color_hex: '#00FF00' },
        ];
        autoCreateSubheadline(elements, { headline: 'Title', subheadline: 'Sub' }, 300, 250);
        expect(elements.find(el => el.name === 'subheadline').color_hex).toBe('#00FF00');
    });

    it('uses canvas-proportional font size (3.5% of height, 14–32 range)', () => {
        const elements: any[] = [];
        autoCreateSubheadline(elements, { headline: 'H', subheadline: 'S' }, 300, 250);
        const sub = elements.find(el => el.name === 'subheadline');
        // canvasH * 0.035 = 8.75 → clamped to min 14
        expect(sub.font_size).toBeGreaterThanOrEqual(14);
        expect(sub.font_size).toBeLessThanOrEqual(32);
    });

    it('estimates height (never h: 0)', () => {
        const elements: any[] = [];
        autoCreateSubheadline(elements, { headline: 'H', subheadline: 'A longer subheadline text' }, 300, 250);
        const sub = elements.find(el => el.name === 'subheadline');
        expect(sub.h).toBeGreaterThan(0);
    });

    it('works when no headline element exists (uses defaults)', () => {
        const elements: any[] = [];
        const content = { headline: 'Missing', subheadline: 'But sub exists' };
        autoCreateSubheadline(elements, content, 300, 250);
        const sub = elements.find(el => el.name === 'subheadline');
        expect(sub).toBeDefined();
        expect(sub.w).toBeGreaterThan(0);
        expect(sub.text_align).toBe('center'); // Default
    });

    it('matches headline by content when name is missing', () => {
        const elements: any[] = [
            { type: 'text', content: 'Match Me', x: 10, y: 30, w: 280, h: 35, font_size: 28, font_weight: '700' },
        ];
        autoCreateSubheadline(elements, { headline: 'Match Me', subheadline: 'Found you' }, 300, 250);
        const sub = elements.find(el => el.name === 'subheadline');
        expect(sub).toBeDefined();
        // Should use headline's x and w
        expect(sub.x).toBe(10);
        expect(sub.w).toBe(280);
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION: set_text_content must call setCoords
// ══════════════════════════════════════════════════
describe('★ REGRESSION: Fabric shim text update includes setCoords', () => {
    const shimSrc = require('fs').readFileSync(
        require('path').resolve(__dirname, './fabricEngineShim.ts'), 'utf-8'
    );

    it('set_text_content calls setCoords after setting text', () => {
        expect(shimSrc).toContain('obj.setCoords()');
        // setCoords must appear in set_text_content block
        const setTextBlock = shimSrc.slice(
            shimSrc.indexOf('set_text_content'),
            shimSrc.indexOf('set_fill_hex')
        );
        expect(setTextBlock).toContain('setCoords');
    });

    it('set_text_content calls syncState after renderAll', () => {
        const setTextBlock = shimSrc.slice(
            shimSrc.indexOf('set_text_content'),
            shimSrc.indexOf('set_fill_hex')
        );
        expect(setTextBlock).toContain('syncState()');
    });

    it('set_fill_hex calls syncState (regression — was missing)', () => {
        const fillBlock = shimSrc.slice(
            shimSrc.indexOf('set_fill_hex'),
            shimSrc.indexOf('set_position')
        );
        expect(fillBlock).toContain('syncState()');
    });
});

describe('★ REGRESSION: commandExecutor update_element_text diagnostics', () => {
    const execSrc = require('fs').readFileSync(
        require('path').resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8'
    );

    it('reads canvas text BEFORE store update', () => {
        expect(execSrc).toContain('canvasTextBefore');
        // Store update must come after canvas snapshot
        const snapshotIdx = execSrc.indexOf('canvasTextBefore');
        const storeUpdateIdx = execSrc.indexOf("executeDesignCommand('update_element_text'");
        expect(snapshotIdx).toBeLessThan(storeUpdateIdx);
    });

    it('has Pass 1 name-based matching', () => {
        expect(execSrc).toContain('[update_element_text] ✓ Name match');
    });

    it('has Pass 2 store→canvas sync fallback', () => {
        expect(execSrc).toContain('Store→Canvas sync');
        expect(execSrc).toContain('store→canvas sync');
    });

    it('matches by font size similarity as last resort', () => {
        expect(execSrc).toContain('fontSize - seFontSize');
    });

    it('warns when no match found', () => {
        expect(execSrc).toContain('[update_element_text] ✗ No match at all');
    });

    it('calls set_text_content on matched nodes', () => {
        expect(execSrc).toContain('engine.set_text_content(');
    });
});
