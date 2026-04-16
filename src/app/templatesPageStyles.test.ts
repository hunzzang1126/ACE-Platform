// templatesPageStyles.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './templatesPageStyles.ts'), 'utf-8');

describe('templatesPageStyles.ts — exports', () => {
    it('exports S', () => { expect(src).toContain('export const S'); });
});

describe('templatesPageStyles.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

