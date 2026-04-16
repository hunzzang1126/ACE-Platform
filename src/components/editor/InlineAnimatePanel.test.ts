// InlineAnimatePanel.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './InlineAnimatePanel.tsx'), 'utf-8');

describe('InlineAnimatePanel.tsx — exports', () => {
    it('exports InlineAnimatePanel', () => { expect(src).toContain('export function InlineAnimatePanel'); });
});

describe('InlineAnimatePanel.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from useAnimationPresets', () => { expect(src).toContain("useAnimationPresets"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
});

describe('InlineAnimatePanel.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
