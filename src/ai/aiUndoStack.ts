// ─────────────────────────────────────────────────
// AI Undo Stack — Snapshot-based undo for AI operations
// ─────────────────────────────────────────────────
// Before each AI operation, we snapshot the design store state.
// If the user says "undo" or "되돌려", we restore the snapshot.
// Max 5 snapshots — old ones drop off.
// ─────────────────────────────────────────────────

import { useDesignStore } from '@/stores/designStore';

/** Serializable snapshot of design state */
export interface AiSnapshot {
    timestamp: number;
    label: string;
    /** JSON string of creativeSet variants + elements */
    data: string;
}

const MAX_SNAPSHOTS = 5;
let _stack: AiSnapshot[] = [];

// ── Public API ───────────────────────────────────

/**
 * Take a snapshot of the current design state BEFORE an AI operation.
 * @param label - Human-readable description (e.g. "Before generate_full_design")
 */
export function pushSnapshot(label: string): void {
    try {
        const cs = useDesignStore.getState().creativeSet;
        if (!cs) return;

        // Deep-clone variants (elements + constraints) — the part AI modifies
        const data = JSON.stringify(cs.variants.map(v => ({
            id: v.id,
            preset: v.preset,
            elements: v.elements,
            overrides: (v as any).overrides,
        })));

        _stack.push({ timestamp: Date.now(), label, data });

        // Cap at MAX_SNAPSHOTS
        if (_stack.length > MAX_SNAPSHOTS) {
            _stack = _stack.slice(-MAX_SNAPSHOTS);
        }

        console.info(`[AiUndo] Snapshot saved: "${label}" (${_stack.length}/${MAX_SNAPSHOTS})`);
    } catch (err) {
        console.warn('[AiUndo] Failed to save snapshot:', err);
    }
}

/**
 * Restore the most recent snapshot (undo the last AI operation).
 * @returns The label of what was undone, or null if no snapshots.
 */
export function popSnapshot(): string | null {
    if (_stack.length === 0) return null;

    const snapshot = _stack.pop()!;
    try {
        const variants = JSON.parse(snapshot.data);
        const cs = useDesignStore.getState().creativeSet;
        if (!cs) return null;

        // Restore each variant's elements
        useDesignStore.setState(state => {
            for (const saved of variants) {
                const target = state.creativeSet.variants.find((v: any) => v.id === saved.id);
                if (target) {
                    (target as any).elements = saved.elements;
                    if (saved.overrides) (target as any).overrides = saved.overrides;
                }
            }
        });

        console.info(`[AiUndo] Restored: "${snapshot.label}" (${_stack.length} remaining)`);
        return snapshot.label;
    } catch (err) {
        console.warn('[AiUndo] Failed to restore snapshot:', err);
        return null;
    }
}

/** Check if undo is available */
export function canUndo(): boolean {
    return _stack.length > 0;
}

/** Get the label of what would be undone */
export function peekUndoLabel(): string | null {
    return _stack.length > 0 ? _stack[_stack.length - 1]!.label : null;
}

/** Get the number of available undo steps */
export function undoDepth(): number {
    return _stack.length;
}

/** Clear all snapshots (e.g. on project switch) */
export function clearSnapshots(): void {
    _stack = [];
}

// For testing only
export function _getStack(): AiSnapshot[] {
    return _stack;
}
