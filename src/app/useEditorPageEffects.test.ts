// useEditorPageEffects.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useEditorPageEffects.ts'), 'utf-8');

describe('useEditorPageEffects.ts — exports', () => {
    it('exports useEditorPageSave', () => { expect(src).toContain('export function useEditorPageSave'); });
    it('exports useEditorRestore', () => { expect(src).toContain('export function useEditorRestore'); });
    it('exports useEditorAutoSync', () => { expect(src).toContain('export function useEditorAutoSync'); });
    it('exports useEditorAutoSave', () => { expect(src).toContain('export function useEditorAutoSave'); });
});

describe('useEditorPageEffects.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
    it('imports from templateStore', () => { expect(src).toContain("templateStore"); });
    it('imports from useOverlayElements', () => { expect(src).toContain("useOverlayElements"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
    it('imports from canvasSyncSave', () => { expect(src).toContain("canvasSyncSave"); });
    it('imports from TemplatePreviewCard', () => { expect(src).toContain("TemplatePreviewCard"); });
});

