// DesignScorePanel.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './DesignScorePanel.tsx'), 'utf-8');

describe('DesignScorePanel.tsx — exports', () => {
    it('exports DesignScorePanel', () => { expect(src).toContain('export function DesignScorePanel'); });
    it('exports DesignScoreBadge', () => { expect(src).toContain('export function DesignScoreBadge'); });
});

describe('DesignScorePanel.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from designScoreEngine', () => { expect(src).toContain("designScoreEngine"); });
    it('imports from designScorePanelStyles', () => { expect(src).toContain("designScorePanelStyles"); });
});

describe('DesignScorePanel.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
});
