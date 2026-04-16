// LangSelector.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LangSelector.tsx'), 'utf-8');

describe('LangSelector.tsx — exports', () => {
    it('exports LangSelector', () => { expect(src).toContain('export function LangSelector'); });
});

describe('LangSelector.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from landingI18n', () => { expect(src).toContain("landingI18n"); });
    it('imports from landingI18n', () => { expect(src).toContain("landingI18n"); });
});

describe('LangSelector.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
