// ─────────────────────────────────────────────────
// Resize Orchestrator — Parallel multi-size processing
// ─────────────────────────────────────────────────
// Orchestrates resizing ALL variants from master in parallel.
// Inspired by OpenPencil's orchestrator.ts pattern.
//
// Flow:
// 1. Analyze master → build resize plan
// 2. Execute all variant resizes in parallel (Promise.all)
// 3. Run Smart Sizing QA + auto-fix on each result
// 4. Optional: Vision API self-check
// 5. Report aggregate results

import type { CreativeSet, BannerVariant } from '@/schema/design.types';
import { getAspectCategory } from '@/schema/layoutRoles';
import { analyzeVariantForResize, type VariantResizeResult, type ElementPatch } from './resizeSubAgent';
import {
    createInitialProgress,
    updateVariantStatus,
    buildProgressMessage,
    type ResizeProgress,
    type ProgressCallback,
} from './resizeProgress';

// ── Types ──

export interface ResizePlan {
    masterVariantId: string;
    masterSize: string;
    targets: Array<{
        variantId: string;
        label: string;
        width: number;
        height: number;
        aspectCategory: string;
    }>;
}

export interface OrchestrateResult {
    plan: ResizePlan;
    results: VariantResizeResult[];
    allPatches: Array<{ variantId: string; patches: ElementPatch[] }>;
    totalFixesApplied: number;
    totalIssues: number;
    message: string;
}

// ── Public API ──

/**
 * Orchestrate resizing all variants from master.
 * Processes variants in parallel batches for performance.
 */
export async function orchestrateResize(
    creativeSet: CreativeSet,
    onProgress?: ProgressCallback,
): Promise<OrchestrateResult> {
    const master = creativeSet.variants.find(v => v.id === creativeSet.masterVariantId);
    if (!master) {
        throw new Error('Master variant not found');
    }

    // Phase 1: Build resize plan
    const plan = buildResizePlan(creativeSet, master);
    const progress = createInitialProgress(
        plan.targets.map(t => ({ id: t.variantId, label: t.label })),
    );
    progress.phase = 'resizing';
    progress.message = buildProgressMessage(progress);
    onProgress?.(progress);

    // Phase 2: Execute resizes in parallel batches
    const BATCH_SIZE = 4; // Process 4 variants at a time to avoid UI jank
    const results: VariantResizeResult[] = [];

    for (let i = 0; i < plan.targets.length; i += BATCH_SIZE) {
        const batch = plan.targets.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
            batch.map(async (target) => {
                // Update progress: resizing
                const updated = updateVariantStatus(progress, target.variantId, 'resizing');
                Object.assign(progress, updated);
                onProgress?.(progress);

                const variant = creativeSet.variants.find(v => v.id === target.variantId);
                if (!variant) {
                    return {
                        variantId: target.variantId,
                        label: target.label,
                        patches: [],
                        qaFixCount: 0,
                        issueCount: 0,
                    };
                }

                // Execute analysis (returns patches, doesn't mutate store)
                const result = analyzeVariantForResize(variant, creativeSet);

                // Update progress: done
                const doneProgress = updateVariantStatus(
                    progress,
                    target.variantId,
                    'done',
                    result.qaFixCount,
                );
                Object.assign(progress, doneProgress);
                progress.message = buildProgressMessage(progress);
                onProgress?.(progress);

                return result;
            }),
        );

        results.push(...batchResults);

        // Yield to UI between batches
        if (i + BATCH_SIZE < plan.targets.length) {
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }

    // Phase 3: Aggregate results
    const allPatches = results.map(r => ({ variantId: r.variantId, patches: r.patches }));
    const totalFixesApplied = results.reduce((sum, r) => sum + r.qaFixCount + r.patches.length, 0);
    const totalIssues = results.reduce((sum, r) => sum + r.issueCount, 0);

    progress.phase = 'done';
    progress.message = buildProgressMessage(progress);
    onProgress?.(progress);

    const message = totalFixesApplied > 0
        ? `✓ Resized ${results.length} sizes, fixed ${totalFixesApplied} issues`
        : `✓ All ${results.length} sizes resized — no issues found`;

    return {
        plan,
        results,
        allPatches,
        totalFixesApplied,
        totalIssues,
        message,
    };
}

// ── Plan Builder ──

function buildResizePlan(creativeSet: CreativeSet, master: BannerVariant): ResizePlan {
    const masterSize = `${master.preset.width}×${master.preset.height}`;

    const targets = creativeSet.variants
        .filter(v => v.id !== creativeSet.masterVariantId)
        .map(v => ({
            variantId: v.id,
            label: v.preset.name || `${v.preset.width}×${v.preset.height}`,
            width: v.preset.width,
            height: v.preset.height,
            aspectCategory: getAspectCategory(v.preset.width, v.preset.height),
        }));

    return {
        masterVariantId: creativeSet.masterVariantId,
        masterSize,
        targets,
    };
}
