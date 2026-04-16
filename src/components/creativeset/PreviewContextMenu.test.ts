// PreviewContextMenu.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PreviewContextMenu.tsx'), 'utf-8');

describe('PreviewContextMenu.tsx — exports', () => {
    it('exports PreviewContextMenu', () => { expect(src).toContain('export function PreviewContextMenu'); });
});

describe('PreviewContextMenu.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
    it('imports from previewRenderer', () => { expect(src).toContain("previewRenderer"); });
    it('imports from fabricHeadlessRenderer', () => { expect(src).toContain("fabricHeadlessRenderer"); });
    it('imports from fabricVideoExporter', () => { expect(src).toContain("fabricVideoExporter"); });
    it('imports from useAnimationPresets', () => { expect(src).toContain("useAnimationPresets"); });
});

describe('PreviewContextMenu.tsx — React patterns', () => {
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
