// ─────────────────────────────────────────────────
// apiKeys.test.ts — API key retrieval
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getOpenRouterKey, getAnthropicKey } from './apiKeys';

describe('getOpenRouterKey', () => {
    it('returns a string', () => {
        const k = getOpenRouterKey();
        expect(typeof k).toBe('string');
    });
});

describe('getAnthropicKey', () => {
    it('returns a string', () => {
        const k = getAnthropicKey();
        expect(typeof k).toBe('string');
    });
});
