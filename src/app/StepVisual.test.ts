// StepVisual.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './StepVisual.tsx'), 'utf-8');

describe('StepVisual — exports', () => {
    it('exports StepVisual', () => { expect(src).toContain('export function StepVisual'); });
});

