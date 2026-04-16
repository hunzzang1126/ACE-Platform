// DashboardEmptyState.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './DashboardEmptyState.tsx'), 'utf-8');

describe('DashboardEmptyState — exports', () => {
    it('exports DashboardEmptyState', () => { expect(src).toContain('export function DashboardEmptyState'); });
});

describe('DashboardEmptyState — dependencies', () => {
    it('imports i18n', () => { expect(src).toContain("i18n"); });
});

