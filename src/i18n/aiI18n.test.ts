// aiI18n.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './aiI18n.ts'), 'utf-8');

describe('aiI18n — exports', () => {
    it('is a valid module', () => { expect(src.length).toBeGreaterThan(0); });
});

describe('aiI18n — dependencies', () => {
    it('imports useAppI18n', () => { expect(src).toContain("useAppI18n"); });
});

