// ─────────────────────────────────────────────────
// ContextToolbar.test.ts — Contract tests for main toolbar
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ContextToolbar.tsx'), 'utf-8');

describe('ContextToolbar — exports', () => {
    it('exports ContextToolbar component', () => {
        expect(src).toContain('export function ContextToolbar');
    });
});

describe('ContextToolbar — alignment controls', () => {
    it('supports horizontal alignment (left, center, right)', () => {
        expect(src).toContain('IcAlignLeft');
        expect(src).toContain('IcAlignCenterH');
        expect(src).toContain('IcAlignRight');
    });

    it('supports vertical alignment (top, center, bottom)', () => {
        expect(src).toContain('IcAlignTop');
        expect(src).toContain('IcAlignCenterV');
        expect(src).toContain('IcAlignBottom');
    });
});

describe('ContextToolbar — element-specific controls', () => {
    it('includes color picker', () => {
        expect(src).toContain('ColorPicker');
    });

    it('includes font family selector', () => {
        expect(src).toContain('FONT_FAMILIES');
    });

    it('supports background removal for images', () => {
        expect(src).toContain('removeBackgroundFromUrl');
    });
});

describe('ContextToolbar — Reimagine AI feature', () => {
    it('has Reimagine CTA button', () => {
        const hasReimagine = src.includes('Reimagine') || src.includes('reimagine');
        expect(hasReimagine).toBe(true);
    });

    it('uses replaceImageSrc (not deleteNode)', () => {
        expect(src).not.toContain('deleteNode');
    });
});

describe('ContextToolbar — dependencies', () => {
    it('uses uiStore for state', () => {
        expect(src).toContain('useUIStore');
    });

    it('uses proper engine types', () => {
        expect(src).toContain('EngineNode');
        expect(src).toContain('CanvasEngineActions');
    });
});
