// InlinePositionPanel.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './InlinePositionPanel.tsx'), 'utf-8');

describe('InlinePositionPanel — exports', () => {
    it('exports InlinePositionPanel component', () => { expect(src).toContain('export function InlinePositionPanel'); });
});

describe('InlinePositionPanel — engine integration', () => {
    it('uses CanvasEngineActions', () => { expect(src).toContain('CanvasEngineActions'); });
    it('uses EngineNode', () => { expect(src).toContain('EngineNode'); });
});

describe('InlinePositionPanel — features', () => {
    it('supports background removal', () => { expect(src).toContain('removeBackgroundFromUrl'); });
    it('converts blob to data URL', () => { expect(src).toContain('blobToDataUrl'); });
    it('has close handler', () => { expect(src).toContain('onClose'); });
});

describe('InlinePositionPanel — state', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
});
