// ─────────────────────────────────────────────────
// Resize Sub-Agent — Individual variant resize logic
// ─────────────────────────────────────────────────
// Handles analyzing a single variant using Smart Layout rules.
// Returns patches to apply — never mutates store objects directly.
// Inspired by OpenPencil's orchestrator-sub-agent.ts pattern.

import type { BannerVariant, CreativeSet } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { computeSmartConstraints, getSmartFontSize } from '@/engine/smartLayout';
import { runSmartSizingQA } from '@/engine/smartSizingQA';
import { generateFixes } from '@/engine/smartSizingFixer';
import type { ElementConstraints } from '@/schema/constraints.types';

export interface ElementPatch {
    elementId: string;
    elementName: string;
    patch: Partial<DesignElement>;
}

export interface VariantResizeResult {
    variantId: string;
    label: string;
    patches: ElementPatch[];
    qaFixCount: number;
    issueCount: number;
}

/**
 * Analyze a variant and return patches for smart layout + QA fixes.
 * IMPORTANT: Does NOT mutate any objects — returns patches to apply.
 */
export function analyzeVariantForResize(
    variant: BannerVariant,
    creativeSet: CreativeSet,
): VariantResizeResult {
    const w = variant.preset.width;
    const h = variant.preset.height;
    const label = variant.preset.name || `${w}×${h}`;
    const patches: ElementPatch[] = [];

    // Skip master — it's the source of truth
    if (variant.id === creativeSet.masterVariantId) {
        return { variantId: variant.id, label, patches: [], qaFixCount: 0, issueCount: 0 };
    }

    // Step 1: Compute smart layout constraints for elements with roles
    for (const el of variant.elements) {
        if (!el.role || variant.overriddenElementIds?.includes(el.id)) continue;

        const smartConstraints = computeSmartConstraints({
            role: el.role,
            canvasW: w,
            canvasH: h,
            fontSize: el.type === 'text' ? el.fontSize : undefined,
        });

        const patch: Partial<DesignElement> = {
            constraints: smartConstraints as ElementConstraints,
        };

        // Also compute smart font size for text elements
        if (el.type === 'text' && el.role) {
            const smartFont = getSmartFontSize(el.role, w, h);
            (patch as Partial<DesignElement> & { fontSize: number }).fontSize = smartFont;
        }

        patches.push({ elementId: el.id, elementName: el.name, patch });
    }

    // Step 2: Run QA checks (on original data — patches haven't been applied yet)
    const issues = runSmartSizingQA([variant]);
    let qaFixCount = 0;

    if (issues.length > 0) {
        const qaFixes = generateFixes(issues, [variant]);
        for (const fix of qaFixes) {
            // Add QA fix patches (may overlap with smart layout, that's ok — last wins)
            patches.push({
                elementId: fix.elementId,
                elementName: fix.elementName,
                patch: fix.patch,
            });
            qaFixCount++;
        }
    }

    return { variantId: variant.id, label, patches, qaFixCount, issueCount: issues.length };
}
