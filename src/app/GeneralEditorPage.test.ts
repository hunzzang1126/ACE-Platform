// GeneralEditorPage.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './GeneralEditorPage.tsx'), 'utf-8');

describe('GeneralEditorPage.tsx — exports', () => {
    it('exports GeneralEditorPage', () => { expect(src).toContain('export function GeneralEditorPage'); });
});

describe('GeneralEditorPage.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
    it('imports from CreativeSetTopBar', () => { expect(src).toContain("CreativeSetTopBar"); });
    it('imports from SizeSidebar', () => { expect(src).toContain("SizeSidebar"); });
    it('imports from BannerPreviewGrid', () => { expect(src).toContain("BannerPreviewGrid"); });
    it('imports from AddSizeModal', () => { expect(src).toContain("AddSizeModal"); });
    it('imports from useSmartCheck', () => { expect(src).toContain("useSmartCheck"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from uuid', () => { expect(src).toContain("uuid"); });
});

describe('GeneralEditorPage.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
});
