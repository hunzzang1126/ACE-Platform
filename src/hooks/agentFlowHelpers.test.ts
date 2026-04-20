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
    it('recalculates height for a short text (single line)', () => {
        const els = [{ type: 'text', content: 'Hello', font_size: 24, w: 300, h: 0, font_weight: '400' }];
        recalcTextHeights(els, 500);
        // 'Hello' = 5 chars, charW = 24*0.5 = 12, charsPerLine = 300/12 = 25. 1 line.
        // h = round(24 * 1.45 * 1 + 8) = round(42.8) = 43
        expect(els[0].h).toBe(43);
    });

    it('recalculates height for a long text (multi-line)', () => {
        const longText = 'About The Products Main Benefit For Your Business Growth';
        const els = [{ type: 'text', content: longText, font_size: 48, w: 300, h: 50, font_weight: '700' }];
        recalcTextHeights(els, 1080);
        // Bold: charW = 48*0.65 = 31.2, charsPerLine = 300/31.2 = 9
        // 56 chars / 9 = 7 lines → h = round(48 * 1.45 * 7 + 8) = round(495.2) = 495
        expect(els[0].h).toBeGreaterThan(50); // Was 50 (stale), now recalculated
        expect(els[0].h).toBeGreaterThan(200); // Multi-line text
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
            { type: 'text', content: 'Hello', font_size: 24, w: 300, h: 0, font_weight: '400' },
        ];
        recalcTextHeights(els, 500);
        expect(els[0].h).toBe(100); // rect unchanged
        expect(els[1].h).toBeGreaterThan(0); // text recalculated
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

// ══════════════════════════════════════════════════
// ★ REGRESSION: update_element_text matching + logging
// ══════════════════════════════════════════════════
describe('★ REGRESSION: commandExecutor update_element_text diagnostics', () => {
    const execSrc = require('fs').readFileSync(
        require('path').resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8'
    );

    it('logs all available node names when searching', () => {
        expect(execSrc).toContain('[update_element_text] Looking for');
    });

    it('logs successful match with node id', () => {
        expect(execSrc).toContain('[update_element_text] ✓ Match');
    });

    it('warns when no match found with available nodes list', () => {
        expect(execSrc).toContain('[update_element_text] ✗ No match');
    });

    it('calls set_text_content on matched nodes', () => {
        expect(execSrc).toContain('engine.set_text_content(node.id, newText)');
    });
});
