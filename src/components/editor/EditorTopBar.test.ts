// EditorTopBar.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './EditorTopBar.tsx'), 'utf-8');

describe('EditorTopBar.tsx — exports', () => {
    it('exports EditorTopBar', () => { expect(src).toContain('export function EditorTopBar'); });
});

describe('EditorTopBar.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from editorStore', () => { expect(src).toContain("editorStore"); });
    it('imports from uiStore', () => { expect(src).toContain("uiStore"); });
    it('imports from Icons', () => { expect(src).toContain("Icons"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
});

describe('EditorTopBar.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
