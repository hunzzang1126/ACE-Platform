// CloudSyncIndicator.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './CloudSyncIndicator.tsx'), 'utf-8');

describe('CloudSyncIndicator — exports', () => {
    it('exports CloudSyncIndicator', () => { expect(src).toContain('export function CloudSyncIndicator'); });
});

describe('CloudSyncIndicator — dependencies', () => {
    it('imports useCloudSync', () => { expect(src).toContain("useCloudSync"); });
});

