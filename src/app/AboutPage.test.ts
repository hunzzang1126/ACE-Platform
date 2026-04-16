// AboutPage.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AboutPage.tsx'), 'utf-8');

describe('AboutPage — exports', () => {
    it('exports AboutPage', () => { expect(src).toContain('export function AboutPage'); });
});

describe('AboutPage — dependencies', () => {
    it('imports react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports GlidLogo', () => { expect(src).toContain("GlidLogo"); });
});

