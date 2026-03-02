// ─────────────────────────────────────────────────
// Resize Sub-Agent — Individual variant resize logic
// ─────────────────────────────────────────────────
// Handles resizing a single variant using SyncEngine + Smart Layout.
// Inspired by OpenPencil's orchestrator-sub-agent.ts pattern.

import type { BannerVariant, CreativeSet } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { SyncEngine } from '@/engine/SyncEngine';
import { computeSmartConstraints, getSmartFontSize } from '@/engine/smartLayout';
import { runSmartSizingQA } from '@/engine/smartSizingQA';
import { generateFixes } from '@/engine/smartSizingFixer';

export interface VariantResizeResult {
    variantId: string;
    label: string;
    syncDeltas: number;
    fixesApplied: number;
    issues: number;
}

/**
 * Resize a single variant by syncing from master + applying smart layout.
 * Returns a summary of what was changed.
 */
export function resizeVariant(
    variant: BannerVariant,
    masterVariant: BannerVariant,
    creativeSet: CreativeSet,
): VariantResizeResult {
    const w = variant.preset.width;
    const h = variant.preset.height;
    const label = variant.preset.name || `${w}×${h}`;

    // Skip master — it's the source of truth
    if (variant.id === creativeSet.masterVariantId) {
        return { variantId: variant.id, label, syncDeltas: 0, fixesApplied: 0, issues: 0 };
    }

    // Step 1: Sync from master using SyncEngine
    const syncResult = SyncEngine.propagateChange(masterVariant.elements[0]!, creativeSet);
    let syncDeltas = 0;

    // Apply all sync deltas for this variant
    for (const delta of syncResult.deltas) {
        if (delta.variantId !== variant.id) continue;

        const el = variant.elements.find(e => e.id === delta.elementId);
        if (!el) continue;

        // Apply changes from sync engine
        Object.assign(el, delta.changes);
        syncDeltas++;
    }

    // Step 2: Apply smart layout constraints for elements with roles
    for (const el of variant.elements) {
        if (!el.role || variant.overriddenElementIds?.includes(el.id)) continue;

        const smartConstraints = computeSmartConstraints({
            role: el.role,
            canvasW: w,
            canvasH: h,
            fontSize: el.type === 'text' ? el.fontSize : undefined,
        });

        el.constraints = smartConstraints;

        // Also adjust font sizes for text elements
        if (el.type === 'text' && el.role) {
            const smartFont = getSmartFontSize(el.role, w, h);
            (el as DesignElement & { fontSize: number }).fontSize = smartFont;
        }
    }

    // Step 3: Run QA + auto-fix
    const issues = runSmartSizingQA([variant]);
    let fixesApplied = 0;

    if (issues.length > 0) {
        const fixes = generateFixes(issues, [variant]);
        for (const fix of fixes) {
            const el = variant.elements.find(e => e.id === fix.elementId);
            if (!el) continue;
            Object.assign(el, fix.patch);
            fixesApplied++;
        }
    }

    return { variantId: variant.id, label, syncDeltas, fixesApplied, issues: issues.length };
}

/**
 * Full sync of all elements from master to a variant.
 * Uses SyncEngine.fullSync but returns per-variant results.
 */
export function fullResyncVariant(
    variant: BannerVariant,
    creativeSet: CreativeSet,
): number {
    if (variant.id === creativeSet.masterVariantId) return 0;

    const result = SyncEngine.fullSync(creativeSet);
    return result.deltas.filter(d => d.variantId === variant.id).length;
}
