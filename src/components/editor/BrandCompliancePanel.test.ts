// BrandCompliancePanel.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './BrandCompliancePanel.tsx'), 'utf-8');

describe('BrandCompliancePanel.tsx — exports', () => {
    it('exports BrandCompliancePanel', () => { expect(src).toContain('export function BrandCompliancePanel'); });
});

describe('BrandCompliancePanel.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from brandCompliance', () => { expect(src).toContain("brandCompliance"); });
    it('imports from brandKitStore', () => { expect(src).toContain("brandKitStore"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
});

describe('BrandCompliancePanel.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
});
