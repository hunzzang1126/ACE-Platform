// ─────────────────────────────────────────────────
// designStoreSyncExtended.test.ts — Deep cross-tab sync tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BroadcastChannel
class MockBroadcastChannel {
    static instances: MockBroadcastChannel[] = [];
    onmessage: ((e: { data: any }) => void) | null = null;
    postMessage = vi.fn();
    close = vi.fn();
    constructor() { MockBroadcastChannel.instances.push(this); }
}
vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

import { setupDesignStoreSync, _broadcastDesignSync } from './designStoreSync';

function makeMockStore(initial?: Partial<any>) {
    const state: any = {
        allCreativeSets: { 'cs-1': { id: 'cs-1', name: 'Set 1' } },
        activeCreativeSetId: 'cs-1',
        creativeSet: { id: 'cs-1', name: 'Set 1' },
        ...initial,
    };
    const listeners: Array<(s: any) => void> = [];
    return {
        getState: () => state,
        setState: vi.fn((partial: any) => Object.assign(state, partial)),
        subscribe: vi.fn((listener: (s: any) => void) => {
            listeners.push(listener);
            return () => { listeners.splice(listeners.indexOf(listener), 1); };
        }),
        _listeners: listeners,
        _notify: () => listeners.forEach(l => l(state)),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    MockBroadcastChannel.instances = [];
});

describe('designStoreSync — Channel message handling', () => {
    it('should apply allCreativeSets from incoming message', () => {
        const store = makeMockStore();
        setupDesignStoreSync(store);

        const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];
        expect(channel).toBeDefined();

        // Simulate incoming message
        channel!.onmessage!({ data: JSON.stringify({
            allCreativeSets: { 'cs-new': { id: 'cs-new', name: 'New Set' } },
            activeCreativeSetId: 'cs-new',
        }) });

        expect(store.setState).toHaveBeenCalledWith(
            expect.objectContaining({ activeCreativeSetId: 'cs-new' })
        );
    });

    it('should set creativeSet to null when activeCreativeSetId is null', () => {
        const store = makeMockStore();
        setupDesignStoreSync(store);

        const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];
        channel!.onmessage!({ data: JSON.stringify({
            activeCreativeSetId: null,
        }) });

        expect(store.setState).toHaveBeenCalledWith(
            expect.objectContaining({ activeCreativeSetId: null, creativeSet: null })
        );
    });

    it('should ignore non-string messages', () => {
        const store = makeMockStore();
        setupDesignStoreSync(store);
        const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];
        channel!.onmessage!({ data: 12345 });
        expect(store.setState).not.toHaveBeenCalled();
    });

    it('should ignore malformed JSON', () => {
        const store = makeMockStore();
        setupDesignStoreSync(store);
        const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];
        channel!.onmessage!({ data: 'not{json' });
        expect(store.setState).not.toHaveBeenCalled();
    });

    it('should ignore empty object', () => {
        const store = makeMockStore();
        setupDesignStoreSync(store);
        const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];
        channel!.onmessage!({ data: '{}' });
        expect(store.setState).not.toHaveBeenCalled();
    });
});

describe('designStoreSync — Outgoing broadcast', () => {
    it('should subscribe to store changes', () => {
        const store = makeMockStore();
        setupDesignStoreSync(store);
        expect(store.subscribe).toHaveBeenCalled();
    });

    it('should broadcast on store change', () => {
        const store = makeMockStore();
        setupDesignStoreSync(store);
        const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];

        // Trigger subscriber
        store._notify();
        expect(channel!.postMessage).toHaveBeenCalled();
    });
});

describe('designStoreSync — lookupCreativeSet from incoming allCreativeSets', () => {
    it('should use incoming allCreativeSets to set creativeSet', () => {
        const store = makeMockStore();
        setupDesignStoreSync(store);
        const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];

        channel!.onmessage!({ data: JSON.stringify({
            allCreativeSets: { 'cs-x': { id: 'cs-x', name: 'X' } },
            activeCreativeSetId: 'cs-x',
        }) });

        expect(store.setState).toHaveBeenCalledWith(
            expect.objectContaining({ creativeSet: { id: 'cs-x', name: 'X' } })
        );
    });

    it('should fallback to store allCreativeSets when incoming is missing', () => {
        const store = makeMockStore({ allCreativeSets: { 'cs-1': { id: 'cs-1', name: 'Existing' } } });
        setupDesignStoreSync(store);
        const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];

        channel!.onmessage!({ data: JSON.stringify({
            activeCreativeSetId: 'cs-1',
        }) });

        expect(store.setState).toHaveBeenCalledWith(
            expect.objectContaining({ creativeSet: { id: 'cs-1', name: 'Existing' } })
        );
    });
});
