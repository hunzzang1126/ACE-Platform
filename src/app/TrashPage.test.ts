// TrashPage.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './TrashPage.tsx'), 'utf-8');

describe('TrashPage.tsx — exports', () => {
    it('exports TrashPage', () => { expect(src).toContain('export function TrashPage'); });
});

describe('TrashPage.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from projectStore', () => { expect(src).toContain("projectStore"); });
    it('imports from AppSidebar', () => { expect(src).toContain("AppSidebar"); });
});

describe('TrashPage.tsx — React patterns', () => {
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
