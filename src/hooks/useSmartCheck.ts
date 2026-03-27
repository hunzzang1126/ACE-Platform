// ─────────────────────────────────────────────────
// useSmartCheck — One-click Smart Check hook (v3)
// ─────────────────────────────────────────────────
// Scaling + Clipping → smartCheckScaling.ts
// Renderers → smartCheckRenderers.ts
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import type { CreativeSet, BannerVariant } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { constraintsToAbsolute } from '@/engine/elementConverters';
import { runSmartSizingQA } from '@/engine/smartSizingQA';
import { classifyRatio } from '@/engine/smartSizing';
import { useDesignStore } from '@/stores/designStore';
import { analyzeDesign } from '@/services/visionService';
import type { DesignAnalysis } from '@/services/visionService';
import { scaleElementToTarget, clipOutOfBounds } from './smartCheckScaling';
import { renderVariantToCanvas } from './smartCheckRenderers';

export type SmartCheckStatus = 'idle' | 'checking' | 'done' | 'error';

export interface VariantVisionResult {
    variantId: string; label: string; score: number; issues: string[]; impression: string;
}

export interface SmartCheckResult {
    issueCount: number; fixCount: number; resizedCount: number;
    visionIssueCount: number; visionResults: VariantVisionResult[];
    avgVisionScore: number; message: string;
}

export function useSmartCheck() {
    const [status, setStatus] = useState<SmartCheckStatus>('idle');
    const [result, setResult] = useState<SmartCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const abortRef = useRef<AbortController | null>(null);
    const updateVariantElement = useDesignStore((s) => s.updateVariantElement);

    const runSmartCheck = useCallback(async (creativeSet: CreativeSet) => {
        try {
            setStatus('checking'); setError(null); setResult(null);
            const master = creativeSet.variants.find(v => v.id === creativeSet.masterVariantId);
            if (!master) throw new Error('Master variant not found');
            const masterW = master.preset.width, masterH = master.preset.height;
            let totalPatched = 0, totalClipped = 0;
            const slaves = creativeSet.variants.filter(v => v.id !== creativeSet.masterVariantId);

            for (const slave of slaves) {
                const tW = slave.preset.width, tH = slave.preset.height;
                if (tW === masterW && tH === masterH) continue;

                for (const el of master.elements) {
                    if (slave.overriddenElementIds?.includes(el.id)) continue;
                    const patch = scaleElementToTarget(el, masterW, masterH, tW, tH);
                    if (Object.keys(patch).length > 0) { try { updateVariantElement(slave.id, el.id, patch); totalPatched++; } catch { /* skip */ } }
                }

                // Clip out-of-bounds
                const freshVariant = useDesignStore.getState().creativeSet?.variants.find(v => v.id === slave.id);
                if (freshVariant) {
                    for (const el of freshVariant.elements) {
                        const clipFix = clipOutOfBounds(el, tW, tH);
                        if (clipFix) { try { updateVariantElement(slave.id, clipFix.elementId, clipFix.patch); totalClipped++; } catch { /* skip */ } }
                    }
                }

                // Heuristic fixes for social sizes
                applySocialHeuristics(slave, tW, tH, updateVariantElement, (n) => { totalPatched += n; });
            }

            await new Promise(resolve => requestAnimationFrame(resolve));

            // Math-based QA
            setProgressMessage('Running QA analysis...');
            const freshVariants = useDesignStore.getState().creativeSet?.variants ?? creativeSet.variants;
            const issues = runSmartSizingQA(freshVariants as BannerVariant[]);

            // Vision QA
            const { visionResults, totalVisionIssues } = await runVisionQA(
                freshVariants as BannerVariant[], abortRef, setProgressMessage,
            );

            const avgVisionScore = visionResults.length > 0
                ? Math.round(visionResults.reduce((sum, r) => sum + r.score, 0) / visionResults.length) : -1;

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

            setResult({ issueCount: issues.length, fixCount: totalPatched, resizedCount, visionIssueCount: totalVisionIssues, visionResults, avgVisionScore, message });
            setProgressMessage(''); setStatus('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Smart Check failed');
            setProgressMessage(''); setStatus('error');
        }
    }, [updateVariantElement]);

    const reset = useCallback(() => {
        setStatus('idle'); setResult(null); setError(null); setProgressMessage('');
        abortRef.current?.abort();
    }, []);

    return { status, result, error, progressMessage, runSmartCheck, reset };
}

// ── Social heuristics ──

function applySocialHeuristics(
    slave: { id: string; overriddenElementIds?: string[] },
    tW: number, tH: number,
    updateVariantElement: (vId: string, eId: string, patch: Partial<DesignElement>) => void,
    addPatched: (n: number) => void,
): void {
    const slaveRatio = classifyRatio(tW, tH);
    const isSocial = slaveRatio === 'square' || slaveRatio === 'portrait' || slaveRatio === 'ultra-tall';
    const freshVariant = useDesignStore.getState().creativeSet?.variants.find(v => v.id === slave.id);
    if (!freshVariant || !isSocial) return;

    let patched = 0;
    for (const el of freshVariant.elements) {
        if (slave.overriddenElementIds?.includes(el.id)) continue;
        const bounds = constraintsToAbsolute(el.constraints, tW, tH);
        const patch: Record<string, unknown> = {};

        if ((el.type === 'text' || el.type === 'button') && 'fontSize' in el) {
            const minFont = Math.max(10, Math.round(Math.min(tW, tH) * 0.03));
            if ((el as DesignElement & { fontSize: number }).fontSize < minFont) patch.fontSize = minFont;
        }
        if (el.type === 'text' || el.type === 'button') {
            const centerX = Math.round((tW - bounds.w) / 2);
            if (Math.abs(bounds.x - centerX) > 8) patch.constraints = { ...el.constraints, horizontal: { anchor: 'left' as const, offset: centerX } };
        }

        if (Object.keys(patch).length > 0) { try { updateVariantElement(slave.id, el.id, patch); patched++; } catch { /* skip */ } }
    }
    addPatched(patched);
}

// ── Vision QA ──

async function runVisionQA(
    allVariants: BannerVariant[],
    abortRef: React.MutableRefObject<AbortController | null>,
    setProgressMessage: (msg: string) => void,
): Promise<{ visionResults: VariantVisionResult[]; totalVisionIssues: number }> {
    const visionResults: VariantVisionResult[] = [];
    let totalVisionIssues = 0;
    const controller = new AbortController();
    abortRef.current = controller;
    const MAX_CONCURRENT = 3;
    let completedCount = 0;

    setProgressMessage(`Vision QA: analyzing ${allVariants.length} variants (${MAX_CONCURRENT} parallel)...`);

    for (let batch = 0; batch < allVariants.length; batch += MAX_CONCURRENT) {
        if (controller.signal.aborted) break;
        const chunk = allVariants.slice(batch, batch + MAX_CONCURRENT);
        const settled = await Promise.allSettled(chunk.map(async (variant) => {
            if (controller.signal.aborted) return null;
            const vW = variant.preset.width, vH = variant.preset.height;
            try {
                const base64 = renderVariantToCanvas(variant);
                if (!base64) return null;
                const analysis: DesignAnalysis | null = await analyzeDesign(base64, vW, vH, controller.signal);
                completedCount++;
                setProgressMessage(`Vision QA: ${completedCount}/${allVariants.length} analyzed...`);
                if (!analysis) return null;
                return { variantId: variant.id, label: `${vW}x${vH}`, score: analysis.qualityScore, issues: analysis.issues.map(i => `[${i.severity}] ${i.type}: ${i.description}`), impression: analysis.impression } as VariantVisionResult;
            } catch { return null; }
        }));
        for (const r of settled) { if (r.status === 'fulfilled' && r.value) { totalVisionIssues += r.value.issues.length; visionResults.push(r.value); } }
    }

    abortRef.current = null;
    return { visionResults, totalVisionIssues };
}
