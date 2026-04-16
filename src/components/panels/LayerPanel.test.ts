// LayerPanel.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LayerPanel.tsx'), 'utf-8');

describe('LayerPanel — exports', () => {
    it('exports LayerPanel', () => { expect(src).toContain('export function LayerPanel'); });
});

describe('LayerPanel — dependencies', () => {
    it('imports designStore', () => { expect(src).toContain("designStore"); });
    it('imports editorStore', () => { expect(src).toContain("editorStore"); });
    it('imports Icons', () => { expect(src).toContain("Icons"); });
});

