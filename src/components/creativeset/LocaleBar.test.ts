// LocaleBar.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LocaleBar.tsx'), 'utf-8');

describe('LocaleBar.tsx — exports', () => {
    it('exports LocaleBar', () => { expect(src).toContain('export function LocaleBar'); });
});

describe('LocaleBar.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from LocalePickerPopover', () => { expect(src).toContain("LocalePickerPopover"); });
    it('imports from i18n', () => { expect(src).toContain("i18n"); });
});

describe('LocaleBar.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
