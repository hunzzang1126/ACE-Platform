// KeyframeInspector.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './KeyframeInspector.tsx'), 'utf-8');

describe('KeyframeInspector — exports', () => {
    it('exports KeyframeInspector component', () => { expect(src).toContain('export function KeyframeInspector'); });
});

describe('KeyframeInspector — timeline integration', () => {
    it('uses timeline store', () => { expect(src).toContain('useTimelineStore'); });
    it('uses EasingType', () => { expect(src).toContain('EasingType'); });
    it('uses AnimatableProperty', () => { expect(src).toContain('AnimatableProperty'); });
});

describe('KeyframeInspector — UI', () => {
    it('has close handler', () => { expect(src).toContain('onClose'); });
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
