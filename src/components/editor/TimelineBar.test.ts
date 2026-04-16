// TimelineBar.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './TimelineBar.tsx'), 'utf-8');

describe('TimelineBar — exports', () => {
    it('exports TimelineBar', () => { expect(src).toContain('export function TimelineBar'); });
});

describe('TimelineBar — dependencies', () => {
    it('imports timelineStore', () => { expect(src).toContain("timelineStore"); });
});

