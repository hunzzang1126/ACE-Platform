// ─────────────────────────────────────────────────
// cloudMigration.test.ts — Migration helpers
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
});

// Mock supabase
vi.mock('@/services/supabaseClient', () => ({
    getSupabase: vi.fn().mockReturnValue(null),
}));

vi.mock('@/stores/designStore', () => ({
    useDesignStore: { getState: vi.fn().mockReturnValue({ allCreativeSets: {} }) },
}));

import { isMigrationDone } from './cloudMigration';

beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
});

describe('isMigrationDone', () => {
    it('returns false when no flag set', () => {
        expect(isMigrationDone('user-123')).toBe(false);
    });

    it('returns true after flag is set', () => {
        store['glid-cloud-migration-done-user-123'] = 'true';
        expect(isMigrationDone('user-123')).toBe(true);
    });

    it('different users have independent flags', () => {
        store['glid-cloud-migration-done-user-A'] = 'true';
        expect(isMigrationDone('user-A')).toBe(true);
        expect(isMigrationDone('user-B')).toBe(false);
    });
});
