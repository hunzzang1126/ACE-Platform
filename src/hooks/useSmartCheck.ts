// ─────────────────────────────────────────────────
// useSmartCheck — One-click Smart Check hook
// ─────────────────────────────────────────────────
// Replaces the old useVisionQA. No report modal — just fix everything.
// Flow: orchestrate resize → QA + auto-fix → (optional) vision verify → toast.

import { useState, useCallback } from 'react';
import type { BannerVariant, CreativeSet } from '@/schema/design.types';
import { runSmartSizingQA } from '@/engine/smartSizingQA';
import { generateFixes, type FixResult } from '@/engine/smartSizingFixer';
import { runDesignHeuristics } from '@/engine/designHeuristics';
import { runBatchVisionCheck } from '@/ai/visionSelfCheck';
import { orchestrateResize } from '@/ai/services/resizeOrchestrator';
import { resolveAllRoleDefaults } from '@/engine/bannerRoleResolver';
import { useDesignStore } from '@/stores/designStore';

export type SmartCheckStatus = 'idle' | 'checking' | 'done' | 'error';

export interface SmartCheckResult {
    issueCount: number;
    fixCount: number;
    resizedCount: number;
    visionIssueCount: number;
    message: string;
}

export function useSmartCheck() {
    const [status, setStatus] = useState<SmartCheckStatus>('idle');
    const [result, setResult] = useState<SmartCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const updateVariantElement = useDesignStore((s) => s.updateVariantElement);

    /**
     * Run Smart Check on a creative set.
     * 1. Orchestrate: re-sync all variants from master (parallel)
     * 2. QA: detect layout issues
     * 3. Fix: auto-apply fixes
     * 4. Vision: optional screenshot verification
     */
    const runSmartCheck = useCallback(async (
        creativeSet: CreativeSet,
    ) => {
        try {
            setStatus('checking');
            setError(null);
            setResult(null);

            // Step 1: Orchestrate resize — compute patches for ALL variants
            let resizedCount = 0;
            let orchestratorFixes = 0;
            try {
                const orchResult = await orchestrateResize(creativeSet);
                resizedCount = orchResult.results.length;

                // Apply all patches through the store (safe mutation)
                for (const { variantId, patches } of orchResult.allPatches) {
                    for (const { elementId, patch } of patches) {
                        try {
                            updateVariantElement(variantId, elementId, patch);
                            orchestratorFixes++;
                        } catch {
                            // Skip failed patches
                        }
                    }
                }
            } catch (err) {
                console.warn('[SmartCheck] Orchestrator failed, falling back to QA-only:', err);
            }

            // Step 2: Role Resolver — apply role-based defaults to all variants
            let rolePatches = 0;
            for (const variant of creativeSet.variants) {
                const patches = resolveAllRoleDefaults(
                    variant.elements,
                    variant.preset.width,
                    variant.preset.height,
                );
                for (const { elementId, patch } of patches) {
                    try {
                        updateVariantElement(variant.id, elementId, patch);
                        rolePatches++;
                    } catch {
                        // Skip failed patches
                    }
                }
            }

            // Step 3: Re-read variants (may have been updated by orchestrator + role resolver)
            const variants = creativeSet.variants;

            // Step 4: QA + auto-fix (catch anything previous steps missed)
            const issues = runSmartSizingQA(variants);
            let qaFixes = 0;
            if (issues.length > 0) {
                const fixes = generateFixes(issues, variants);
                for (const fix of fixes) {
                    try {
                        updateVariantElement(fix.variantId, fix.elementId, fix.patch);
                        qaFixes++;
                    } catch {
                        console.warn(`[SmartCheck] Failed to apply fix for ${fix.elementName}`);
                    }
                }
            }

            // Step 5: Design quality heuristics (safe zone, contrast, text overflow)
            let heuristicFixes = 0;
            for (const variant of variants) {
                const hFixes = runDesignHeuristics(variant);
                for (const fix of hFixes) {
                    try {
                        updateVariantElement(fix.variantId, fix.elementId, fix.patch);
                        heuristicFixes++;
                    } catch {
                        // Skip failed patches
                    }
                }
            }

            // Step 6: Vision API self-check (optional, skips if no API key)
            let visionIssueCount = 0;
            try {
                const visionResults = await runBatchVisionCheck(variants);
                for (const [, vr] of visionResults) {
                    visionIssueCount += vr.issues.length;
                }
            } catch {
                // Vision check is optional
            }

            // Build result message
            const totalFixed = orchestratorFixes + qaFixes;
            let message: string;
            if (totalFixed === 0 && issues.length === 0 && visionIssueCount === 0) {
                message = `✓ All ${resizedCount + 1} sizes look great!`;
            } else if (totalFixed > 0 && visionIssueCount === 0) {
                message = `✓ Synced ${resizedCount} sizes, fixed ${totalFixed} issue${totalFixed !== 1 ? 's' : ''} — all clean!`;
            } else if (totalFixed > 0) {
                message = `✓ Synced ${resizedCount} sizes, fixed ${totalFixed} issue${totalFixed !== 1 ? 's' : ''}. ${visionIssueCount} visual note${visionIssueCount !== 1 ? 's' : ''}.`;
            } else {
                message = `✓ Synced ${resizedCount} sizes — no issues found.`;
            }

            setResult({
                issueCount: issues.length,
                fixCount: totalFixed,
                resizedCount,
                visionIssueCount,
                message,
            });
            setStatus('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Smart Check failed');
            setStatus('error');
        }
    }, [updateVariantElement]);

    const reset = useCallback(() => {
        setStatus('idle');
        setResult(null);
        setError(null);
    }, []);

    return { status, result, error, runSmartCheck, reset };
}

