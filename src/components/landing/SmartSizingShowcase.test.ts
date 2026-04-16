// SmartSizingShowcase.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SmartSizingShowcase.tsx'), 'utf-8');

describe('SmartSizingShowcase.tsx — exports', () => {
    it('exports SmartSizingShowcase', () => { expect(src).toContain('export function SmartSizingShowcase'); });
});

describe('SmartSizingShowcase.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from framer-motion', () => { expect(src).toContain("framer-motion"); });
    it('imports from landingI18n', () => { expect(src).toContain("landingI18n"); });
});

describe('SmartSizingShowcase.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
