// EasingEditor.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './EasingEditor.tsx'), 'utf-8');

describe('EasingEditor.tsx — exports', () => {
    it('exports EasingEditor', () => { expect(src).toContain('export function EasingEditor'); });
});

describe('EasingEditor.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from timelineStore', () => { expect(src).toContain("timelineStore"); });
});

describe('EasingEditor.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
