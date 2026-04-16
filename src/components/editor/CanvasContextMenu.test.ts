// CanvasContextMenu.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './CanvasContextMenu.tsx'), 'utf-8');

describe('CanvasContextMenu.tsx — exports', () => {
    it('exports CanvasContextMenu', () => { expect(src).toContain('export function CanvasContextMenu'); });
});

describe('CanvasContextMenu.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
    it('imports from backgroundRemovalService', () => { expect(src).toContain("backgroundRemovalService"); });
});

describe('CanvasContextMenu.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
});
