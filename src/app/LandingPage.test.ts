// LandingPage.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LandingPage.tsx'), 'utf-8');

describe('LandingPage.tsx — exports', () => {
    it('exports LandingPage', () => { expect(src).toContain('export function LandingPage'); });
});

describe('LandingPage.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from framer-motion', () => { expect(src).toContain("framer-motion"); });
    it('imports from gsap', () => { expect(src).toContain("gsap"); });
    it('imports from ScrollTrigger', () => { expect(src).toContain("ScrollTrigger"); });
    it('imports from lenis', () => { expect(src).toContain("lenis"); });
    it('imports from authStore', () => { expect(src).toContain("authStore"); });
    it('imports from GlidLogo', () => { expect(src).toContain("GlidLogo"); });
    it('imports from BentoGrid', () => { expect(src).toContain("BentoGrid"); });
    it('imports from SmartSizingShowcase', () => { expect(src).toContain("SmartSizingShowcase"); });
});

describe('LandingPage.tsx — React patterns', () => {
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
