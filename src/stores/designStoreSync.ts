// ─────────────────────────────────────────────────
// designStoreSync — Cross-tab BroadcastChannel sync
// ─────────────────────────────────────────────────
// ★ REGRESSION GUARD: Always use plain-object setState()
// (never immer callback) for cross-tab sync.

import type { DesignState } from './designStoreTypes';

type DesignStoreInstance = {
    getState: () => DesignState;
    setState: (partial: Partial<DesignState>) => void;
    subscribe: (listener: (state: DesignState) => void) => () => void;
};

let _designChannel: BroadcastChannel | null = null;
let _isBroadcasting = false;

function _applyDesignSync(raw: string, store: DesignStoreInstance) {
    try {
        const data = JSON.parse(raw) as Partial<Pick<DesignState, 'allCreativeSets' | 'activeCreativeSetId'>>;
        if (!data) return;
        const patch: Partial<DesignState> = {};
        if (data.allCreativeSets !== undefined) patch.allCreativeSets = data.allCreativeSets;
        if (data.activeCreativeSetId !== undefined) {
            patch.activeCreativeSetId = data.activeCreativeSetId;
            patch.creativeSet = data.activeCreativeSetId
                ? (data.allCreativeSets ?? store.getState().allCreativeSets)[data.activeCreativeSetId] ?? null
                : null;
        }
        if (Object.keys(patch).length > 0) {
            _isBroadcasting = true;
            store.setState(patch);
            _isBroadcasting = false;
        }
    } catch { /* malformed JSON */ }
}

export function setupDesignStoreSync(store: DesignStoreInstance) {
    if (typeof window === 'undefined') return;

    try {
        _designChannel = new BroadcastChannel('glid-design-sync');
        _designChannel.onmessage = (e) => {
            if (typeof e.data === 'string') _applyDesignSync(e.data, store);
        };
    } catch { /* BroadcastChannel not supported */ }

    store.subscribe((state) => {
        if (_isBroadcasting || !_designChannel) return;
        try {
            _designChannel.postMessage(JSON.stringify({
                allCreativeSets: state.allCreativeSets,
                activeCreativeSetId: state.activeCreativeSetId,
            }));
        } catch { /* ok */ }
    });
}

// No-op — subscribe-based broadcast handles this automatically
export function _broadcastDesignSync() {}
