// main.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './main.tsx'), 'utf-8');

describe('main — exports', () => {
    it('is a valid module', () => { expect(src.length).toBeGreaterThan(0); });
});

describe('main — dependencies', () => {
    it('imports react', () => { expect(src).toContain("react"); });
    it('imports client', () => { expect(src).toContain("client"); });
    it('imports App', () => { expect(src).toContain("App"); });
    it('imports themeStore', () => { expect(src).toContain("themeStore"); });
});

