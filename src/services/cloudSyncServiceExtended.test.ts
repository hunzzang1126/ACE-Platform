// ─────────────────────────────────────────────────
// cloudSyncServiceExtended.test.ts — State machine + listener tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/services/supabaseClient', () => ({
    getSupabase: vi.fn().mockReturnValue(null),
    isCloudEnabled: vi.fn().mockReturnValue(false),
}));

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: { getState: vi.fn().mockReturnValue({ creativeSets: [] }) },
}));

vi.mock('@/stores/designStore', () => ({
    useDesignStore: { getState: vi.fn().mockReturnValue({ creativeSet: null }) },
}));

import {
    onCloudSyncChange, getCloudSyncState,
    pushToCloud, pullFromCloud, startAutoSync,
} from './cloudSyncService';

beforeEach(() => vi.clearAllMocks());

describe('cloudSyncService — getCloudSyncState', () => {
    it('should return initial idle state', () => {
        const state = getCloudSyncState();
        expect(state.status).toBeDefined();
        expect(['idle', 'offline', 'pushing', 'pulling', 'error']).toContain(state.status);
    });

    it('should return a copy (not the internal reference)', () => {
        const a = getCloudSyncState();
        const b = getCloudSyncState();
        expect(a).not.toBe(b);
        expect(a).toEqual(b);
    });
});

describe('cloudSyncService — onCloudSyncChange', () => {
    it('should subscribe and unsubscribe', () => {
        const listener = vi.fn();
        const unsub = onCloudSyncChange(listener);
        expect(typeof unsub).toBe('function');
        unsub(); // Should not throw
    });
});

describe('cloudSyncService — pushToCloud', () => {
    it('should return false when supabase is not configured', async () => {
        const result = await pushToCloud('user-1');
        expect(result).toBe(false);
    });

    it('should set status to offline when no supabase', async () => {
        await pushToCloud('user-1');
        const state = getCloudSyncState();
        expect(state.status).toBe('offline');
    });
});

describe('cloudSyncService — pullFromCloud', () => {
    it('should return false when supabase is not configured', async () => {
        const result = await pullFromCloud('user-1');
        expect(result).toBe(false);
    });

    it('should set status to offline when no supabase', async () => {
        await pullFromCloud('user-1');
        const state = getCloudSyncState();
        expect(state.status).toBe('offline');
    });
});

describe('cloudSyncService — startAutoSync', () => {
    it('should return cleanup function even when cloud is disabled', () => {
        const cleanup = startAutoSync('user-1', 60000);
        expect(typeof cleanup).toBe('function');
        cleanup();
    });
});

describe('cloudSyncService — Listener notifications', () => {
    it('should notify listeners on push', async () => {
        const listener = vi.fn();
        const unsub = onCloudSyncChange(listener);

        await pushToCloud('user-1');

        // Listener should have been called (status change: idle → offline)
        expect(listener).toHaveBeenCalled();
        const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
        expect(lastCall.status).toBe('offline');

        unsub();
    });

    it('should notify listeners on pull', async () => {
        const listener = vi.fn();
        const unsub = onCloudSyncChange(listener);

        await pullFromCloud('user-1');
        expect(listener).toHaveBeenCalled();

        unsub();
    });
});
