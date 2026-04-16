// EditorToolbar.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './EditorToolbar.tsx'), 'utf-8');

describe('EditorToolbar.tsx — exports', () => {
    it('exports EditorToolbar', () => { expect(src).toContain('export function EditorToolbar'); });
});

describe('EditorToolbar.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from editorStore', () => { expect(src).toContain("editorStore"); });
    it('imports from uiStore', () => { expect(src).toContain("uiStore"); });
    it('imports from Icons', () => { expect(src).toContain("Icons"); });
    it('imports from BrandCompliancePanel', () => { expect(src).toContain("BrandCompliancePanel"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
});

describe('EditorToolbar.tsx — React patterns', () => {
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
