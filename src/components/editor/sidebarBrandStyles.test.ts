// sidebarBrandStyles.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './sidebarBrandStyles.ts'), 'utf-8');

describe('sidebarBrandStyles.ts — exports', () => {
    it('exports sidebarBrandStyles', () => { expect(src).toContain('export const sidebarBrandStyles'); });
});

describe('sidebarBrandStyles.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

