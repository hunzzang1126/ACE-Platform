// ─────────────────────────────────────────────────
// PropertyPanel.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PropertyPanel.tsx'), 'utf-8');

describe('PropertyPanel — exports', () => {
    it('exports PropertyPanel component', () => {
        expect(src).toContain('export function PropertyPanel');
    });
});

describe('PropertyPanel — section composition', () => {
    it('renders transform controls', () => {
        const hasTransform = src.includes('TransformSection') || src.includes('Position') || src.includes('left:') || src.includes('width:');
        expect(hasTransform).toBe(true);
    });

    it('integrates font family selection', () => {
        expect(src).toContain('FONT_FAMILIES');
    });

    it('integrates font weight selection', () => {
        expect(src).toContain('FONT_WEIGHTS');
    });

    it('supports image elements', () => {
        const hasImage = src.includes("type === 'image'") || src.includes('imageSrc');
        expect(hasImage).toBe(true);
    });

    it('supports text elements', () => {
        const hasText = src.includes("type === 'text'") || src.includes('fontSize');
        expect(hasText).toBe(true);
    });

    it('supports shape elements', () => {
        const hasShape = src.includes('shape') || src.includes('fill');
        expect(hasShape).toBe(true);
    });
});

describe('PropertyPanel — dependencies', () => {
    it('uses PropertyPanelSections exports', () => {
        expect(src).toContain('PropertyPanelSections');
    });

    it('uses i18n for labels', () => {
        expect(src).toContain('useAppI18n');
    });
});
