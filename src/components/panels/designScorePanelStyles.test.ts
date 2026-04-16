// designScorePanelStyles.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './designScorePanelStyles.ts'), 'utf-8');

describe('designScorePanelStyles.ts — exports', () => {
    it('exports designScorePanelStyles', () => { expect(src).toContain('export const designScorePanelStyles'); });
});

describe('designScorePanelStyles.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

