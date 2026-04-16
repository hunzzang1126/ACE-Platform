// screenshotCapture.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './screenshotCapture.ts'), 'utf-8');

describe('screenshotCapture — exports', () => {
    it('exports captureElementAsBase64', () => { expect(src).toContain('export async function captureElementAsBase64'); });
    it('exports renderVariantToCanvas', () => { expect(src).toContain('export function renderVariantToCanvas'); });
});

