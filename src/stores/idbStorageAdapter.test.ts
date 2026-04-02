// ─────────────────────────────────────────────────
// idbStorageAdapter.test.ts — Zustand persist adapter tests
// ─────────────────────────────────────────────────
// ★ REGRESSION GUARD: This is the PERSISTENCE LAYER.
// If this breaks, ALL design data is lost between sessions.
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must use vi.hoisted for mock variables used in vi.mock factories
const { mockKvStore, mockLocalStorage } = vi.hoisted(() => ({
    mockKvStore: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
    mockLocalStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
        clear: vi.fn(),
    },
}));

vi.mock('./aceDB', () => ({
    aceDB: { kvStore: mockKvStore },
}));

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });

import { idbStorage } from './idbStorageAdapter';

describe('idbStorageAdapter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getItem', () => {
        it('should read from IndexedDB via aceDB.kvStore', async () => {
            mockKvStore.get.mockResolvedValue({ key: 'test', value: '{"state":"data"}', updatedAt: 1000 });
            const result = await idbStorage.getItem('test');
            expect(result).toBe('{"state":"data"}');
            expect(mockKvStore.get).toHaveBeenCalledWith('test');
        });

        it('should return null when key not found', async () => {
            mockKvStore.get.mockResolvedValue(undefined);
            const result = await idbStorage.getItem('missing');
            expect(result).toBeNull();
        });

        it('★ REGRESSION: should fallback to localStorage when IndexedDB fails', async () => {
            mockKvStore.get.mockRejectedValue(new Error('IDB corrupted'));
            mockLocalStorage.getItem.mockReturnValue('{"fallback":"data"}');
            const result = await idbStorage.getItem('test');
            expect(result).toBe('{"fallback":"data"}');
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test');
        });
    });

    describe('setItem', () => {
        it('should write to IndexedDB via aceDB.kvStore', async () => {
            mockKvStore.put.mockResolvedValue(undefined);
            await idbStorage.setItem('test', '{"state":"new"}');
            expect(mockKvStore.put).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'test', value: '{"state":"new"}' })
            );
        });

        it('should include updatedAt timestamp', async () => {
            mockKvStore.put.mockResolvedValue(undefined);
            await idbStorage.setItem('test', 'val');
            const call = mockKvStore.put.mock.calls[0][0];
            expect(call.updatedAt).toBeGreaterThan(0);
        });

        it('★ REGRESSION: should fallback to localStorage when IndexedDB fails', async () => {
            mockKvStore.put.mockRejectedValue(new Error('IDB quota'));
            await idbStorage.setItem('test', '{"data":"important"}');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test', '{"data":"important"}');
        });

        it('should not crash when both IndexedDB and localStorage fail', async () => {
            mockKvStore.put.mockRejectedValue(new Error('IDB fail'));
            mockLocalStorage.setItem.mockImplementation(() => { throw new Error('LS full'); });
            // Should not throw
            await expect(idbStorage.setItem('test', 'val')).resolves.not.toThrow();
        });
    });

    describe('removeItem', () => {
        it('should delete from IndexedDB', async () => {
            mockKvStore.delete.mockResolvedValue(undefined);
            await idbStorage.removeItem('test');
            expect(mockKvStore.delete).toHaveBeenCalledWith('test');
        });

        it('should also clean localStorage (migration cleanup)', async () => {
            mockKvStore.delete.mockResolvedValue(undefined);
            await idbStorage.removeItem('test');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test');
        });

        it('should not crash when IndexedDB delete fails', async () => {
            mockKvStore.delete.mockRejectedValue(new Error('IDB fail'));
            await expect(idbStorage.removeItem('test')).resolves.not.toThrow();
        });
    });
});
