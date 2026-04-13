// ─────────────────────────────────────────────────
// useMasterSlave – Origin-Target sync subscription hook
// ─────────────────────────────────────────────────
import { useCallback } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { SyncEngine } from '@/engine/SyncEngine';
import type { DesignElement } from '@/schema/elements.types';

/**
 * Hook that propagates canvas manipulation events to SyncEngine.
 * Called when element drag/resize completes.
 */
export function useMasterSlave() {
    const creativeSet = useDesignStore((s) => s.creativeSet);
    const updateMasterElement = useDesignStore((s) => s.updateMasterElement);

    /**
     * Origin element absolute position change → reverse-calculate constraints → propagate to all targets
     */
    const onMasterElementMoved = useCallback(
        (elementId: string, x: number, y: number, width: number, height: number) => {
            if (!creativeSet) return;

            const master = creativeSet.variants.find(
                (v) => v.id === creativeSet.masterVariantId,
            );
            if (!master) return;

            // Absolute coordinates → reverse-calculate constraints
            const newConstraints = SyncEngine.absoluteToConstraints(
                x, y, width, height,
                master.preset.width,
                master.preset.height,
            );

            // Update Zustand Store (→ internally auto-propagates to targets)
            updateMasterElement(elementId, { constraints: newConstraints } as Partial<DesignElement>);
        },
        [creativeSet, updateMasterElement],
    );

    /**
     * Update non-layout properties on the origin element
     */
    const onMasterElementUpdated = useCallback(
        (elementId: string, patch: Partial<DesignElement>) => {
            updateMasterElement(elementId, patch);
        },
        [updateMasterElement],
    );

    return {
        onMasterElementMoved,
        onMasterElementUpdated,
    };
}
