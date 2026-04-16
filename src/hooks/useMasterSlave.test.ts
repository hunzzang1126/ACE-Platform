// useMasterSlave.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useMasterSlave.ts'), 'utf-8');

describe('useMasterSlave.ts — exports', () => {
    it('exports useMasterSlave', () => { expect(src).toContain('export function useMasterSlave'); });
});

describe('useMasterSlave.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
    it('imports from SyncEngine', () => { expect(src).toContain("SyncEngine"); });
    it('imports from elements.types', () => { expect(src).toContain("elements.types"); });
});

