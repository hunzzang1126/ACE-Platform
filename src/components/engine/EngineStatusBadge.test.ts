// EngineStatusBadge.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './EngineStatusBadge.tsx'), 'utf-8');

describe('EngineStatusBadge.tsx — exports', () => {
    it('exports EngineStatusBadge', () => { expect(src).toContain('export function EngineStatusBadge'); });
});

describe('EngineStatusBadge.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from tauriBridge', () => { expect(src).toContain("tauriBridge"); });
});

describe('EngineStatusBadge.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
});
