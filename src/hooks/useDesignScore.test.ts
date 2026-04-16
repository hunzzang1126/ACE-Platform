// useDesignScore.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useDesignScore.ts'), 'utf-8');

describe('useDesignScore.ts — exports', () => {
    it('exports useDesignScore', () => { expect(src).toContain('export function useDesignScore'); });
});

describe('useDesignScore.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from designScoreEngine', () => { expect(src).toContain("designScoreEngine"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
    it('imports from editorStore', () => { expect(src).toContain("editorStore"); });
    it('imports from brandKitStore', () => { expect(src).toContain("brandKitStore"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
});

