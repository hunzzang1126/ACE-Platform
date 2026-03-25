// ─────────────────────────────────────────────────
// AI Action Tracker — Bridges User UI Actions → AI Context
// ─────────────────────────────────────────────────
// Subscribes to editorStore and designStore to track
// what the user is selecting and modifying on the UI.
// This makes the AI aware of user interactions so
// "this", "the selected one", "it" resolve correctly.
//
// Call initActionTracker() once at app startup.
// ─────────────────────────────────────────────────

import { useEditorStore } from '@/stores/editorStore';
import { useDesignStore } from '@/stores/designStore';
import { pushLastTouched, pushAction } from '@/ai/smartContextBuilder';

let _initialized = false;

/**
 * Initialize the user action tracker.
 * Subscribes to Zustand stores to push user interactions into AI context.
 * Safe to call multiple times — only initializes once.
 */
export function initActionTracker(): void {
    if (_initialized) return;
    _initialized = true;

    // ── Track element selection changes ──
    useEditorStore.subscribe(
        (state, prevState) => {
            const newIds = state.selectedElementIds;
            const oldIds = prevState.selectedElementIds;

            // Only fire when selection actually changes
            if (newIds === oldIds) return;
            if (newIds.length === oldIds.length && newIds.every((id, i) => id === oldIds[i])) return;

            if (newIds.length === 0) {
                // User deselected everything — no action needed
                return;
            }

            // Resolve element names from designStore
            const cs = useDesignStore.getState().creativeSet;
            if (!cs) return;
            const masterVariant = cs.variants.find(v => v.id === cs.masterVariantId);
            if (!masterVariant) return;

            for (const id of newIds) {
                if (oldIds.includes(id)) continue; // Already was selected

                const el = masterVariant.elements.find(e => e.id === id);
                if (el) {
                    // Use index as a numeric ID for AI context
                    const numId = masterVariant.elements.indexOf(el);
                    pushLastTouched(el.name, numId, 'user-selected');
                    pushAction(`User selected "${el.name}" (${el.type})`);
                }
            }
        },
    );

    console.info('[ActionTracker] User action tracking initialized');
}
