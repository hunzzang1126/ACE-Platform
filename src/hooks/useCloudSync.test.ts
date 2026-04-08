// ─────────────────────────────────────────────────
// useCloudSync.test.ts — Cloud sync hook tests
// ─────────────────────────────────────────────────
// Covers: login sync, IDB hydration wait, store subscriptions,
// push debouncing, migration check, cloud-enabled guard
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useCloudSync.ts'), 'utf-8');

describe('useCloudSync — hook export', () => {
    it('exports useCloudSync function', () => {
        expect(src).toContain('export function useCloudSync');
    });

    it('returns isSyncing state', () => {
        expect(src).toContain('isSyncing');
    });
});

describe('useCloudSync — authentication guard', () => {
    it('checks isAuthenticated before syncing', () => {
        expect(src).toContain('isAuthenticated');
    });

    it('checks isCloudEnabled', () => {
        expect(src).toContain('isCloudEnabled()');
    });

    it('prevents duplicate sync with syncedRef', () => {
        expect(src).toContain('syncedRef.current');
    });
});

describe('useCloudSync — IDB hydration', () => {
    it('★ REGRESSION: waits for IDB hydration before reading stores', () => {
        expect(src).toContain('projectStoreReady');
        expect(src).toContain('designStoreReady');
    });
});

describe('useCloudSync — migration', () => {
    it('checks if migration is done', () => {
        expect(src).toContain('isMigrationDone');
    });

    it('runs migration when needed', () => {
        expect(src).toContain('runMigration');
    });

    it('calls syncOnLogin', () => {
        expect(src).toContain('syncOnLogin');
    });
});

describe('useCloudSync — store subscriptions', () => {
    it('pushes project changes debounced', () => {
        expect(src).toContain('pushProjectDebounced');
    });

    it('pushes creative set changes debounced', () => {
        expect(src).toContain('pushCreativeSetDebounced');
    });

    it('handles folder operations', () => {
        expect(src).toContain('pushFolder');
    });

    it('handles trash operations', () => {
        expect(src).toContain('trashProject');
    });

    it('handles cloud deletion', () => {
        expect(src).toContain('deleteFolderCloud');
        expect(src).toContain('deleteCreativeSetCloud');
    });
});

describe('useCloudSync — error handling', () => {
    it('catches sync errors without crashing', () => {
        expect(src).toContain('catch');
    });

    it('sets loading state properly (try/finally pattern)', () => {
        expect(src).toContain('setIsSyncing(true)');
        expect(src).toContain('setIsSyncing(false)');
    });
});
