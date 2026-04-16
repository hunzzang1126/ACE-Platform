// ProjectThumbnail.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ProjectThumbnail.tsx'), 'utf-8');

describe('ProjectThumbnail.tsx — exports', () => {
    it('exports ProjectThumbnail', () => { expect(src).toContain('export function ProjectThumbnail'); });
});

describe('ProjectThumbnail.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
});

describe('ProjectThumbnail.tsx — React patterns', () => {
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
});
