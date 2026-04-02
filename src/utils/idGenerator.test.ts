// ─────────────────────────────────────────────────
// idGenerator.test.ts — UUID generation
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { shortId, generateId } from './idGenerator';

describe('shortId', () => {
    it('returns 8 characters', () => {
        expect(shortId().length).toBe(8);
    });

    it('generates unique IDs', () => {
        const ids = new Set(Array.from({ length: 100 }, () => shortId()));
        expect(ids.size).toBe(100);
    });
});

describe('generateId', () => {
    it('returns valid UUID format', () => {
        const id = generateId();
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('generates unique UUIDs', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId()));
        expect(ids.size).toBe(100);
    });
});
