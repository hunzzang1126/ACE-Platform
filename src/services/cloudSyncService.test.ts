// ─────────────────────────────────────────────────
// cloudSyncService.test.ts — Cloud sync service tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock all external dependencies ──
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn();

vi.mock('./supabaseClient', () => ({
    getSupabase: () => ({
        from: () => ({
            upsert: mockUpsert,
            select: mockSelect.mockReturnValue({
                eq: () => ({
                    order: () => ({
                        limit: () => Promise.resolve({ data: [], error: null }),
                    }),
                }),
            }),
        }),
    }),
    isCloudEnabled: () => true,
}));

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: { getState: () => ({ creativeSets: [] }) },
}));

vi.mock('@/stores/designStore', () => ({
    useDesignStore: { getState: () => ({ allCreativeSets: {}, creativeSet: null }) },
}));

import {
    getCloudSyncState,
    onCloudSyncChange,
    pushToCloud,
    pullFromCloud,
    startAutoSync,
} from './cloudSyncService';

describe('cloudSyncService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── getCloudSyncState ──

    describe('getCloudSyncState', () => {
        it('should return an object with status and timestamps', () => {
            const state = getCloudSyncState();
            expect(state).toHaveProperty('status');
            expect(state).toHaveProperty('lastSyncAt');
            expect(state).toHaveProperty('error');
        });

        it('should start with idle status', () => {
            const state = getCloudSyncState();
            expect(state.status).toBe('idle');
        });
    });

    // ── onCloudSyncChange ──

    describe('onCloudSyncChange', () => {
        it('should return an unsubscribe function', () => {
            const unsub = onCloudSyncChange(() => {});
            expect(typeof unsub).toBe('function');
            unsub();
        });
    });

    // ── pushToCloud ──

    describe('pushToCloud', () => {
        it('should return true on success', async () => {
            const result = await pushToCloud('user-001');
            expect(result).toBe(true);
        });

        it('should accept a userId parameter', async () => {
            await expect(pushToCloud('user-001')).resolves.not.toThrow();
        });
    });

    // ── pullFromCloud ──

    describe('pullFromCloud', () => {
        it('should return a boolean', async () => {
            const result = await pullFromCloud('user-001');
            expect(typeof result).toBe('boolean');
        });
    });

    // ── startAutoSync ──

    describe('startAutoSync', () => {
        it('should return a cleanup function', () => {
            const cleanup = startAutoSync('user-001', 60_000);
            expect(typeof cleanup).toBe('function');
            cleanup(); // Stop auto-sync
        });

        it('should accept custom interval', () => {
            const cleanup = startAutoSync('user-001', 120_000);
            expect(typeof cleanup).toBe('function');
            cleanup();
        });
    });
});
