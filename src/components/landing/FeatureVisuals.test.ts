// FeatureVisuals.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './FeatureVisuals.tsx'), 'utf-8');

describe('FeatureVisuals — exports', () => {
    it('exports GPUCanvasVisual', () => { expect(src).toContain('export function GPUCanvasVisual'); });
    it('exports AICoPilotVisual', () => { expect(src).toContain('export function AICoPilotVisual'); });
    it('exports AnimationVisual', () => { expect(src).toContain('export function AnimationVisual'); });
    it('exports ResizeVisual', () => { expect(src).toContain('export function ResizeVisual'); });
    it('exports ExportVisual', () => { expect(src).toContain('export function ExportVisual'); });
});

describe('FeatureVisuals — dependencies', () => {
    it('imports framer-motion', () => { expect(src).toContain("framer-motion"); });
});

