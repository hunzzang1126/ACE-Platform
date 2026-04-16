// CreativeSetTable.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './CreativeSetTable.tsx'), 'utf-8');

describe('CreativeSetTable — exports', () => {
    it('exports CreativeSetTable component', () => { expect(src).toContain('export function CreativeSetTable'); });
});

describe('CreativeSetTable — data', () => {
    it('uses project store', () => { expect(src).toContain('useProjectStore'); });
    it('uses SortColumn type', () => { expect(src).toContain('SortColumn'); });
    it('uses CreativeSetSummary type', () => { expect(src).toContain('CreativeSetSummary'); });
    it('uses Folder type', () => { expect(src).toContain('Folder'); });
});

describe('CreativeSetTable — interactions', () => {
    it('handles opening a set', () => { expect(src).toContain('onOpenSet'); });
    it('handles opening a folder', () => { expect(src).toContain('onOpenFolder'); });
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
