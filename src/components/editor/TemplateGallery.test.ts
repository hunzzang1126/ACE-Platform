// TemplateGallery.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './TemplateGallery.tsx'), 'utf-8');

describe('TemplateGallery.tsx — exports', () => {
    it('exports TemplateGallery', () => { expect(src).toContain('export function TemplateGallery'); });
});

describe('TemplateGallery.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from templateStore', () => { expect(src).toContain("templateStore"); });
});

describe('TemplateGallery.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
});
