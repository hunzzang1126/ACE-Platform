// PlanStatusBar.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PlanStatusBar.tsx'), 'utf-8');

describe('PlanStatusBar — exports', () => {
    it('exports PlanStatusBar', () => { expect(src).toContain('export function PlanStatusBar'); });
});

describe('PlanStatusBar — dependencies', () => {
    it('imports react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports usePlanLimits', () => { expect(src).toContain("usePlanLimits"); });
    it('imports i18n', () => { expect(src).toContain("i18n"); });
});

