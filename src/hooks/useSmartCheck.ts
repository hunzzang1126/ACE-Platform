// ─────────────────────────────────────────────────
// useSmartCheck — One-click Smart Check hook (v3)
// ─────────────────────────────────────────────────
// Now with Vision QA: after proportional scaling, captures each 
// variant's canvas preview and sends to Claude Vision for
// quality analysis (contrast, readability, clipping, hierarchy).
//
// Pipeline:
//   1. Proportional scale master → each slave variant
//   2. Clip out-of-bounds elements
//   3. Heuristic fixes for social sizes
//   4. Math-based QA check
//   5. Vision QA: screenshot each variant → Claude Vision → scoring
//   6. Report combined results
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import type { CreativeSet, BannerVariant } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { resolveConstraints } from '@/schema/constraints.types';
import { runSmartSizingQA } from '@/engine/smartSizingQA';
import { classifyRatio } from '@/engine/smartSizing';
import { useDesignStore } from '@/stores/designStore';
import { analyzeDesign, captureElement } from '@/services/visionService';
import type { DesignAnalysis } from '@/services/visionService';

export type SmartCheckStatus = 'idle' | 'checking' | 'done' | 'error';

export interface VariantVisionResult {
    variantId: string;
    label: string;
    score: number;
    issues: string[];
    impression: string;
}

export interface SmartCheckResult {
    issueCount: number;
    fixCount: number;
    resizedCount: number;
    visionIssueCount: number;
    visionResults: VariantVisionResult[];
    avgVisionScore: number;
    message: string;
}

// ── Proportional Scale ────────────────────────────

/**
 * Proportionally scale a single element's constraints
 * from master size (mW×mH) to target size (tW×tH).
 *
 * SAFE: Never changes anchor type. Keeps relative constraints as-is.
 * Only adjusts fixed offset values proportionally.
 */
function scaleElementToTarget(
    el: DesignElement,
    masterW: number,
    masterH: number,
    targetW: number,
    targetH: number,
): Partial<DesignElement> {
    const scaleX = targetW / masterW;
    const scaleY = targetH / masterH;

    const c = el.constraints;
    const patch: Record<string, unknown> = {};

    // Clone constraints first
    const newConstraints = JSON.parse(JSON.stringify(c));
    let changed = false;

    // Horizontal
    if (c.horizontal.anchor === 'stretch') {
        // stretch: keep marginLeft/Right proportional
        if (c.horizontal.marginLeft !== undefined) {
            newConstraints.horizontal.marginLeft = Math.round(c.horizontal.marginLeft * scaleX);
            changed = true;
        }
        if (c.horizontal.marginRight !== undefined) {
            newConstraints.horizontal.marginRight = Math.round(c.horizontal.marginRight * scaleX);
            changed = true;
        }
    } else {
        // left/right/center: scale the offset
        newConstraints.horizontal.offset = Math.round(c.horizontal.offset * scaleX);
        changed = true;
    }

    // Vertical
    if (c.vertical.anchor === 'stretch') {
        if (c.vertical.marginTop !== undefined) {
            newConstraints.vertical.marginTop = Math.round(c.vertical.marginTop * scaleY);
            changed = true;
        }
        if (c.vertical.marginBottom !== undefined) {
            newConstraints.vertical.marginBottom = Math.round(c.vertical.marginBottom * scaleY);
            changed = true;
        }
    } else {
        newConstraints.vertical.offset = Math.round(c.vertical.offset * scaleY);
        changed = true;
    }

    // Size: scale fixed dimensions; keep relative as-is
    if (c.size.widthMode === 'fixed') {
        newConstraints.size.width = Math.max(1, Math.round(c.size.width * scaleX));
        changed = true;
    }
    if (c.size.heightMode === 'fixed') {
        newConstraints.size.height = Math.max(1, Math.round(c.size.height * scaleY));
        changed = true;
    }

    if (changed) {
        patch.constraints = newConstraints;
    }

    // Scale font size for text / button elements
    if ((el.type === 'text' || el.type === 'button') && 'fontSize' in el) {
        const el2 = el as DesignElement & { fontSize: number };
        const uniformScale = Math.min(scaleX, scaleY);
        const newFs = Math.max(8, Math.round(el2.fontSize * uniformScale));
        if (newFs !== el2.fontSize) {
            patch.fontSize = newFs;
        }
    }

    return patch as Partial<DesignElement>;
}

// ── Clip-only QA Fix ─────────────────────────────

/**
 * If an element is completely outside the canvas, nudge it back in.
 * Does NOT move elements that are partially visible.
 * Does NOT reposition elements that are inside bounds.
 */
function clipOutOfBounds(
    el: DesignElement,
    canvasW: number,
    canvasH: number,
    variantId: string,
): { elementId: string; patch: Partial<DesignElement> } | null {
    const bounds = resolveConstraints(el.constraints, canvasW, canvasH);

    // Only fix completely out-of-bounds elements
    const isCompletelyOut =
        bounds.x + bounds.width < 0 ||
        bounds.y + bounds.height < 0 ||
        bounds.x > canvasW ||
        bounds.y > canvasH;

    if (!isCompletelyOut) return null;

    // Nudge back in using left/top anchors
    const newX = Math.max(8, Math.min(bounds.x, canvasW - bounds.width - 8));
    const newY = Math.max(8, Math.min(bounds.y, canvasH - bounds.height - 8));

    return {
        elementId: el.id,
        patch: {
            constraints: {
                ...el.constraints,
                horizontal: { anchor: 'left', offset: Math.round(newX) },
                vertical: { anchor: 'top', offset: Math.round(newY) },
            },
        },
    };
}

// ── Main Hook ─────────────────────────────────────

export function useSmartCheck() {
    const [status, setStatus] = useState<SmartCheckStatus>('idle');
    const [result, setResult] = useState<SmartCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const abortRef = useRef<AbortController | null>(null);

    const updateVariantElement = useDesignStore((s) => s.updateVariantElement);

    /**
     * Run Smart Check on a creative set.
     *
     * SAFE algorithm:
     * 1. Get master variant dimensions
     * 2. For each slave: proportionally scale all element positions
     * 3. Clip any element that ended up completely out-of-bounds
     * 4. Run QA to count remaining issues (informational only)
     */
    const runSmartCheck = useCallback(async (
        creativeSet: CreativeSet,
    ) => {
        try {
            setStatus('checking');
            setError(null);
            setResult(null);

            const master = creativeSet.variants.find(v => v.id === creativeSet.masterVariantId);
            if (!master) throw new Error('Master variant not found');

            const masterW = master.preset.width;
            const masterH = master.preset.height;

            let totalPatched = 0;
            let totalClipped = 0;

            // Process each slave variant
            const slaves = creativeSet.variants.filter(v => v.id !== creativeSet.masterVariantId);

            for (const slave of slaves) {
                const tW = slave.preset.width;
                const tH = slave.preset.height;

                // Skip variants with same dimensions as master
                if (tW === masterW && tH === masterH) continue;

                // Use master elements as source of truth
                // (to avoid compounding errors from prior Smart Check runs)
                const sourceElements = master.elements;

                for (const el of sourceElements) {
                    // Skip overridden elements (user has manually adjusted them)
                    if (slave.overriddenElementIds?.includes(el.id)) continue;

                    // Proportionally scale from master dimensions
                    const patch = scaleElementToTarget(el, masterW, masterH, tW, tH);

                    if (Object.keys(patch).length > 0) {
                        try {
                            updateVariantElement(slave.id, el.id, patch);
                            totalPatched++;
                        } catch {
                            // Skip if element doesn't exist in this variant
                        }
                    }
                }

                // After scaling, clip any completely out-of-bounds elements
                // (read fresh state from store)
                const freshVariant = useDesignStore.getState().creativeSet?.variants.find(
                    v => v.id === slave.id
                );
                if (freshVariant) {
                    for (const el of freshVariant.elements) {
                        const clipFix = clipOutOfBounds(el, tW, tH, slave.id);
                        if (clipFix) {
                            try {
                                updateVariantElement(slave.id, clipFix.elementId, clipFix.patch);
                                totalClipped++;
                            } catch { /* skip */ }
                        }
                    }
                }

                // ── Heuristic fixes for social sizes ──
                const slaveRatio = classifyRatio(tW, tH);
                const isSocial = slaveRatio === 'square' || slaveRatio === 'portrait' || slaveRatio === 'ultra-tall';

                const freshVariant2 = useDesignStore.getState().creativeSet?.variants.find(
                    v => v.id === slave.id
                );
                if (freshVariant2 && isSocial) {
                    for (const el of freshVariant2.elements) {
                        // Skip overridden elements
                        if (slave.overriddenElementIds?.includes(el.id)) continue;

                        const bounds = resolveConstraints(el.constraints, tW, tH);
                        const patch: Record<string, unknown> = {};

                        // Enforce minimum font size (readability)
                        if ((el.type === 'text' || el.type === 'button') && 'fontSize' in el) {
                            const minFont = Math.max(10, Math.round(Math.min(tW, tH) * 0.03));
                            const fontSize = (el as DesignElement & { fontSize: number }).fontSize;
                            if (fontSize < minFont) {
                                patch.fontSize = minFont;
                            }
                        }

                        // Center-align text horizontally for social
                        if (el.type === 'text' || el.type === 'button') {
                            const centerX = Math.round((tW - bounds.width) / 2);
                            if (Math.abs(bounds.x - centerX) > 8) {
                                patch.constraints = {
                                    ...el.constraints,
                                    horizontal: { anchor: 'left' as const, offset: centerX },
                                };
                            }
                        }

                        if (Object.keys(patch).length > 0) {
                            try {
                                updateVariantElement(slave.id, el.id, patch);
                                totalPatched++;
                            } catch { /* skip */ }
                        }
                    }
                }
            }

            // Yield to UI before Vision QA
            await new Promise(resolve => requestAnimationFrame(resolve));

            // ── Step 4: Math-based QA ──
            setProgressMessage('Running QA analysis...');
            const freshVariants = useDesignStore.getState().creativeSet?.variants ?? creativeSet.variants;
            const issues = runSmartSizingQA(freshVariants as BannerVariant[]);

            // ── Step 5: Vision QA (screenshot → Claude Vision) ──
            const visionResults: VariantVisionResult[] = [];
            let totalVisionIssues = 0;
            const controller = new AbortController();
            abortRef.current = controller;

            // Get all banner card DOM elements for screenshot capture
            const cardElements = document.querySelectorAll('.banner-card') as NodeListOf<HTMLElement>;
            const allVariants = freshVariants as BannerVariant[];

            for (let i = 0; i < allVariants.length; i++) {
                if (controller.signal.aborted) break;
                const variant = allVariants[i]!;
                const label = `${variant.preset.width}x${variant.preset.height}`;

                setProgressMessage(`Vision QA: analyzing ${label} (${i + 1}/${allVariants.length})...`);

                try {
                    // Try to capture from DOM card
                    const cardEl = cardElements[i];
                    let base64: string | null = null;
                    if (cardEl) {
                        base64 = captureElement(cardEl);
                    }

                    if (base64) {
                        const analysis: DesignAnalysis | null = await analyzeDesign(
                            base64,
                            variant.preset.width,
                            variant.preset.height,
                            controller.signal,
                        );

                        if (analysis) {
                            const variantIssues = analysis.issues.map(
                                i => `[${i.severity}] ${i.type}: ${i.description}`,
                            );
                            totalVisionIssues += variantIssues.length;
                            visionResults.push({
                                variantId: variant.id,
                                label,
                                score: analysis.qualityScore,
                                issues: variantIssues,
                                impression: analysis.impression,
                            });
                        }
                    }
                } catch {
                    // Vision failed for this variant — skip, don't block
                    console.warn(`[SmartCheck] Vision QA skipped for ${label}`);
                }
            }

            abortRef.current = null;

            const avgVisionScore = visionResults.length > 0
                ? Math.round(visionResults.reduce((sum, r) => sum + r.score, 0) / visionResults.length)
                : -1;

            // ── Build result ──
            const resizedCount = slaves.length;
            let message: string;
            if (totalPatched === 0 && issues.length === 0 && totalVisionIssues === 0) {
                message = `All ${resizedCount} sizes look great.`;
            } else {
                const parts: string[] = [];
                if (resizedCount > 0) parts.push(`Synced ${resizedCount} sizes`);
                if (totalClipped > 0) parts.push(`clipped ${totalClipped} out-of-bounds`);
                if (issues.length > 0) parts.push(`${issues.length} QA notes`);
                if (avgVisionScore >= 0) parts.push(`Vision avg: ${avgVisionScore}/100`);
                if (totalVisionIssues > 0) parts.push(`${totalVisionIssues} visual issues`);
                message = parts.join(' · ') + '.';
            }

            setResult({
                issueCount: issues.length,
                fixCount: totalPatched,
                resizedCount,
                visionIssueCount: totalVisionIssues,
                visionResults,
                avgVisionScore,
                message,
            });
            setProgressMessage('');
            setStatus('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Smart Check failed');
            setProgressMessage('');
            setStatus('error');
        }
    }, [updateVariantElement]);

    const reset = useCallback(() => {
        setStatus('idle');
        setResult(null);
        setError(null);
        setProgressMessage('');
        // Cancel any in-progress Vision QA
        abortRef.current?.abort();
    }, []);

    return { status, result, error, progressMessage, runSmartCheck, reset };
}
