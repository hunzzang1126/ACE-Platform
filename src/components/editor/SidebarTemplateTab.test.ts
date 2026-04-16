// SidebarTemplateTab.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SidebarTemplateTab.tsx'), 'utf-8');

describe('SidebarTemplateTab — exports', () => {
    it('exports as component', () => {
        const has = src.includes('export function') || src.includes('export default');
        expect(has).toBe(true);
    });
});

describe('SidebarTemplateTab — template integration', () => {
    it('uses template store', () => { expect(src).toContain('useTemplateStore'); });
    it('supports template categories', () => { expect(src).toContain('TemplateCategory'); });
    it('uses DesignTemplate type', () => { expect(src).toContain('DesignTemplate'); });
});

describe('SidebarTemplateTab — rendering', () => {
    it('uses constraintsToAbsolute for positioning', () => { expect(src).toContain('constraintsToAbsolute'); });
    it('uses uniform scaling', () => { expect(src).toContain('computeUniformScale'); });
    it('uses text effect helpers', () => { expect(src).toContain('textEffectToCSS'); });
    it('ensures Google Fonts are loaded', () => { expect(src).toContain('ensureGoogleFont'); });
});

describe('SidebarTemplateTab — types', () => {
    it('uses CanvasEngineActions', () => { expect(src).toContain('CanvasEngineActions'); });
    it('uses BannerVariant', () => { expect(src).toContain('BannerVariant'); });
});
