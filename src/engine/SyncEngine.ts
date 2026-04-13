// ─────────────────────────────────────────────────
// SyncEngine – Plug-based Synchronization Core
// ─────────────────────────────────────────────────
// Origin element changes → propagate only to plugged targets.
// Recalculates coordinates based on constraints for different size variants.
// Elements with a role use the Smart Layout engine for aspect-ratio-optimal positioning.

import type { BannerVariant, CreativeSet } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';
import { resolveConstraints } from '@/schema/constraints.types';
import { absoluteToConstraints as canonicalAbsToConstraints } from '@/engine/elementConverters';
import { computeSmartConstraints, getSmartFontSize } from './smartLayout';

// ── Types ──

export interface SyncDelta {
    variantId: string;
    elementId: string;
    /** Changed properties */
    changes: Partial<DesignElement>;
    /** Recalculated coordinates */
    resolved: { x: number; y: number; width: number; height: number };
}

export interface SyncResult {
    deltas: SyncDelta[];
    skipped: { variantId: string; reason: string }[];
}

// ── Core Sync Engine ──

export class SyncEngine {
    /**
     * Origin element change → compute propagation coordinates for targets
     *
     * ★ Plug-aware propagation:
     * Only propagates to variants that are plugged into the source variant.
     * Falls back to legacy master→all if no plugConnections exist.
     */
    static propagateChange(
        masterElement: DesignElement,
        creativeSet: CreativeSet,
        /** Which variant this element belongs to (for plug graph lookup) */
        sourceVariantId?: string,
    ): SyncResult {
        const result: SyncResult = { deltas: [], skipped: [] };
        const plugs = creativeSet.plugConnections ?? {};
        const originId = sourceVariantId ?? creativeSet.masterVariantId;

        // Find targets plugged into this origin
        const pluggedTargetIds = Object.entries(plugs)
            .filter(([, oId]) => oId === originId)
            .map(([targetId]) => targetId);
        const hasPlugConnections = Object.keys(plugs).length > 0;

        for (const variant of creativeSet.variants) {
            // Skip the source variant itself
            if (variant.id === originId) continue;

            // ★ Only propagate to plugged targets
            // If plug connections exist, only targets connected to this origin
            // If no plug connections (legacy), propagate to all non-origin variants
            if (hasPlugConnections && !pluggedTargetIds.includes(variant.id)) {
                result.skipped.push({ variantId: variant.id, reason: 'not-plugged' });
                continue;
            }

            // Sync-locked variant
            if (variant.syncLocked) {
                result.skipped.push({ variantId: variant.id, reason: 'syncLocked' });
                continue;
            }

            // Element individually overridden
            if (variant.overriddenElementIds.includes(masterElement.id)) {
                result.skipped.push({ variantId: variant.id, reason: 'overridden' });
                continue;
            }

            // Find corresponding element in target variant
            const slaveElement = variant.elements.find((el) => el.id === masterElement.id);
            if (!slaveElement) continue;

            // ── Smart Layout: use aspect-ratio-optimal placement when role is set, otherwise use constraints ──
            let smartConstraints: ElementConstraints | undefined;
            if (masterElement.role) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const raw = masterElement as any;
                smartConstraints = computeSmartConstraints({
                    role: masterElement.role,
                    canvasW: variant.preset.width,
                    canvasH: variant.preset.height,
                    elWidth: raw.constraints?.size?.width,
                    elHeight: raw.constraints?.size?.height,
                    fontSize: raw.fontSize ?? raw.size ?? undefined,
                });
            }

            const constraintsToUse = smartConstraints ?? masterElement.constraints;
            const resolved = resolveConstraints(
                constraintsToUse,
                variant.preset.width,
                variant.preset.height,
            );

            // Compute changes (constraints + non-layout properties)
            const changes = SyncEngine.computeChanges(masterElement, slaveElement);

            // If smart layout computed new constraints, use those instead of master's
            if (smartConstraints) {
                changes.constraints = smartConstraints;
            }

            // Adapt font size for text/button elements based on role + target size
            if (masterElement.role && (masterElement.type === 'text' || masterElement.type === 'button')) {
                const smartFontSize = getSmartFontSize(
                    masterElement.role,
                    variant.preset.width,
                    variant.preset.height,
                );
                (changes as Record<string, unknown>).fontSize = smartFontSize;
            }

            result.deltas.push({
                variantId: variant.id,
                elementId: masterElement.id,
                changes,
                resolved,
            });
        }

        return result;
    }

    /**
     * Synchronize all elements in the entire creative set
     * (Used on initial load or bulk changes)
     */
    static fullSync(creativeSet: CreativeSet): SyncResult {
        const master = creativeSet.variants.find(
            (v) => v.id === creativeSet.masterVariantId,
        );
        if (!master) return { deltas: [], skipped: [] };

        const allDeltas: SyncDelta[] = [];
        const allSkipped: { variantId: string; reason: string }[] = [];

        for (const element of master.elements) {
            const result = SyncEngine.propagateChange(element, creativeSet);
            allDeltas.push(...result.deltas);
            allSkipped.push(...result.skipped);
        }

        return { deltas: allDeltas, skipped: allSkipped };
    }

    /**
     * Batch update: synchronize multiple elements at once
     * (Call within requestAnimationFrame for render optimization)
     */
    static batchPropagate(
        masterElements: DesignElement[],
        creativeSet: CreativeSet,
    ): SyncResult {
        const allDeltas: SyncDelta[] = [];
        const allSkipped: { variantId: string; reason: string }[] = [];

        for (const element of masterElements) {
            const result = SyncEngine.propagateChange(element, creativeSet);
            allDeltas.push(...result.deltas);
            allSkipped.push(...result.skipped);
        }

        return { deltas: allDeltas, skipped: allSkipped };
    }

    /**
     * Compute non-layout property differences between origin and target elements
     */
    private static computeChanges(
        master: DesignElement,
        slave: DesignElement,
    ): Partial<DesignElement> {
        const changes: Record<string, unknown> = {};

        // Constraints always follow the origin
        changes.constraints = { ...master.constraints };

        // Sync common properties
        if (master.opacity !== slave.opacity) changes.opacity = master.opacity;
        if (master.visible !== slave.visible) changes.visible = master.visible;
        if (master.zIndex !== slave.zIndex) changes.zIndex = master.zIndex;
        if (master.blendMode !== slave.blendMode) changes.blendMode = master.blendMode;

        // Sync type-specific properties
        if (master.type === slave.type) {
            switch (master.type) {
                case 'text': {
                    const s = slave as typeof master;
                    if (master.content !== s.content) changes.content = master.content;
                    if (master.fontFamily !== s.fontFamily) changes.fontFamily = master.fontFamily;
                    if (master.fontSize !== s.fontSize) changes.fontSize = master.fontSize;
                    if (master.fontWeight !== s.fontWeight) changes.fontWeight = master.fontWeight;
                    if (master.color !== s.color) changes.color = master.color;
                    if (master.textAlign !== s.textAlign) changes.textAlign = master.textAlign;
                    if (master.lineHeight !== s.lineHeight) changes.lineHeight = master.lineHeight;
                    break;
                }
                case 'shape': {
                    const s = slave as typeof master;
                    if (master.fill !== s.fill) changes.fill = master.fill;
                    if (master.stroke !== s.stroke) changes.stroke = master.stroke;
                    if (master.strokeWidth !== s.strokeWidth) changes.strokeWidth = master.strokeWidth;
                    if (master.borderRadius !== s.borderRadius) changes.borderRadius = master.borderRadius;
                    break;
                }
                case 'button': {
                    const s = slave as typeof master;
                    if (master.label !== s.label) changes.label = master.label;
                    if (master.color !== s.color) changes.color = master.color;
                    if (master.backgroundColor !== s.backgroundColor) changes.backgroundColor = master.backgroundColor;
                    if (master.borderRadius !== s.borderRadius) changes.borderRadius = master.borderRadius;
                    break;
                }
            }
        }

        return changes as Partial<DesignElement>;
    }

    /**
     * Constraints re-calculation utility.
     * Delegates to the canonical implementation in elementConverters.ts
     * to ensure consistent anchor selection across all code paths.
     * ★ REGRESSION GUARD: NEVER duplicate this logic — use the canonical function.
     */
    static absoluteToConstraints(
        x: number,
        y: number,
        width: number,
        height: number,
        parentWidth: number,
        parentHeight: number,
    ): ElementConstraints {
        return canonicalAbsToConstraints(x, y, width, height, parentWidth, parentHeight);
    }
}
