// HowItWorks.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './HowItWorks.tsx'), 'utf-8');

describe('HowItWorks.tsx — exports', () => {
    it('exports HowItWorks', () => { expect(src).toContain('export function HowItWorks'); });
});

describe('HowItWorks.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from StepVisual', () => { expect(src).toContain("StepVisual"); });
});

describe('HowItWorks.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
