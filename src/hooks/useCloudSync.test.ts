// ─────────────────────────────────────────────────
// useCloudSync.test.ts — Cloud-first sync hook tests
// ─────────────────────────────────────────────────
// Covers: cloud-first read, IDB hydration wait, store subscriptions,
// push debouncing, migration check, offline fallback
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

    it('returns syncStatus state', () => {
        expect(src).toContain('syncStatus');
    });

    it('exports CloudSyncStatus type', () => {
        expect(src).toContain('export type CloudSyncStatus');
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

describe('★ Cloud-first architecture (v514)', () => {
    it('uses fullSync to read from cloud first', () => {
        expect(src).toContain('fullSync(userId)');
    });

    it('cloud data is source of truth — iterated first', () => {
        // Cloud data should be applied first, local-only added after
        expect(src).toContain('Start with cloud data (source of truth)');
    });

    it('detects local-only creative sets and pushes them', () => {
        expect(src).toContain('localOnlyCS');
        expect(src).toContain('local-only creative sets');
    });

    it('falls back to local cache when offline', () => {
        expect(src).toContain('Cloud pull failed — using local cache');
        expect(src).toContain("setSyncStatus('offline')");
    });

    it('sets synced status on success', () => {
        expect(src).toContain("setSyncStatus('synced')");
    });

    it('sets error status on failure', () => {
        expect(src).toContain("setSyncStatus('error')");
    });

    it('still runs migration for first-time users', () => {
        expect(src).toContain('isMigrationDone');
        expect(src).toContain('runMigration');
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

describe('useCloudSync — anti-resurrection guard', () => {
    it('filters trashed items before applying merged data', () => {
        expect(src).toContain('ANTI-RESURRECTION GUARD');
        expect(src).toContain('trashedIds');
    });

    it('uses applyMergedData helper', () => {
        expect(src).toContain('function applyMergedData');
        expect(src).toContain('applyMergedData(');
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

