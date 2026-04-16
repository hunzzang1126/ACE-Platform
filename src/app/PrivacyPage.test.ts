// PrivacyPage.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PrivacyPage.tsx'), 'utf-8');

describe('PrivacyPage — exports', () => {
    it('exports PrivacyPage', () => { expect(src).toContain('export function PrivacyPage'); });
});

describe('PrivacyPage — dependencies', () => {
    it('imports react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports GlidLogo', () => { expect(src).toContain("GlidLogo"); });
});

