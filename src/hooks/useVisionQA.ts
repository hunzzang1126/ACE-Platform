// ─────────────────────────────────────────────────
// useVisionQA — Hook for AI Vision QA + Auto-Fix
// Captures screenshots → sends to backend → returns report
// Auto-Fix: sends issues + elements → gets constraint fixes → applies to store
// ─────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { renderVariantToCanvas } from '@/utils/screenshotCapture';
import { runVisionQA, requestAutoFix, type VisionQAResponse, type AutoFixResponse } from '@/api/backendService';
import { resolveConstraints } from '@/schema/constraints.types';
import type { BannerVariant } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { useDesignStore } from '@/stores/designStore';

export type QAStatus = 'idle' | 'capturing' | 'analyzing' | 'done' | 'error' | 'fixing' | 'fixed';

/** Extract render-ready props from a design element */
function elementToRenderProps(el: DesignElement, canvasW: number, canvasH: number) {
    const resolved = resolveConstraints(el.constraints, canvasW, canvasH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = el as unknown as Record<string, unknown>;
    return {
        x: resolved.x,
        y: resolved.y,
        width: resolved.width,
        height: resolved.height,
        type: el.type,
        fill: (raw['fill'] as string) ?? undefined,
        color: (raw['color'] as string) ?? undefined,
        backgroundColor: (raw['backgroundColor'] as string) ?? undefined,
        content: (raw['content'] as string) ?? undefined,
        label: (raw['label'] as string) ?? undefined,
        fontSize: (raw['fontSize'] as number) ?? undefined,
        fontFamily: (raw['fontFamily'] as string) ?? undefined,
        opacity: el.opacity,
    };
}

/** Convert element to fix payload data */
function elementToFixData(el: DesignElement) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = el as unknown as Record<string, unknown>;
    return {
        id: el.id,
        name: el.name,
        type: el.type,
        constraints: el.constraints as unknown as Record<string, unknown>,
        content: (raw['content'] as string) ?? undefined,
        label: (raw['label'] as string) ?? undefined,
        fontSize: (raw['fontSize'] as number) ?? undefined,
        fill: (raw['fill'] as string) ?? undefined,
        color: (raw['color'] as string) ?? undefined,
        backgroundColor: (raw['backgroundColor'] as string) ?? undefined,
        opacity: el.opacity,
    };
}

export function useVisionQA() {
    const [status, setStatus] = useState<QAStatus>('idle');
    const [report, setReport] = useState<VisionQAResponse | null>(null);
    const [fixResult, setFixResult] = useState<AutoFixResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');

    const updateVariantElement = useDesignStore((s) => s.updateVariantElement);

    const runQA = useCallback(async (
        creativeSetId: string,
        masterVariantId: string,
        variants: BannerVariant[],
    ) => {
        try {
            setStatus('capturing');
            setError(null);
            setReport(null);
            setFixResult(null);

            const master = variants.find(v => v.id === masterVariantId);
            if (!master) throw new Error('Master variant not found');

            // ── Step 1: Capture master screenshot ──
            setProgress('Capturing master design...');
            const masterScreenshot = renderVariantToCanvas({
                width: master.preset.width,
                height: master.preset.height,
                backgroundColor: master.backgroundColor ?? '#FFFFFF',
                elements: master.elements.map(el => elementToRenderProps(el, master.preset.width, master.preset.height)),
            });

            // ── Step 2: Capture all variant screenshots ──
            const variantScreenshots = [];
            let idx = 0;
            for (const v of variants) {
                idx++;
                if (v.id === masterVariantId) continue;

                const sizeName = v.preset.name || `${v.preset.width}×${v.preset.height}`;
                setProgress(`Capturing ${sizeName} (${idx}/${variants.length})...`);

                const screenshot = renderVariantToCanvas({
                    width: v.preset.width,
                    height: v.preset.height,
                    backgroundColor: v.backgroundColor ?? '#FFFFFF',
                    elements: v.elements.map(el => elementToRenderProps(el, v.preset.width, v.preset.height)),
                });

                variantScreenshots.push({
                    variant_id: v.id,
                    width: v.preset.width,
                    height: v.preset.height,
                    name: sizeName,
                    screenshot_base64: screenshot,
                });
            }

            // ── Step 3: Send to backend ──
            setStatus('analyzing');
            setProgress('AI is analyzing your designs...');

            const result = await runVisionQA({
                creative_set_id: creativeSetId,
                master_screenshot_base64: masterScreenshot,
                master_width: master.preset.width,
                master_height: master.preset.height,
                variants: variantScreenshots,
            });

            setReport(result);
            setStatus('done');
            setProgress('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
            setProgress('');
        }
    }, []);

    // ── Auto-Fix: take QA report issues → get constraint fixes → apply to store ──
    const autoFix = useCallback(async (
        creativeSetId: string,
        masterVariantId: string,
        variants: BannerVariant[],
    ) => {
        if (!report) return;

        try {
            setStatus('fixing');
            setProgress('AI is generating design fixes...');

            const master = variants.find(v => v.id === masterVariantId);
            if (!master) throw new Error('Master variant not found');

            // Build fix request — only for variants with issues
            const variantsWithIssues = report.variants
                .filter(v => v.issues.length > 0)
                .map(qaResult => {
                    const variant = variants.find(v => v.id === qaResult.variant_id);
                    if (!variant) return null;
                    return {
                        variant_id: qaResult.variant_id,
                        width: variant.preset.width,
                        height: variant.preset.height,
                        name: qaResult.name,
                        issues: qaResult.issues,
                        elements: variant.elements.map(elementToFixData),
                    };
                })
                .filter((v): v is NonNullable<typeof v> => v !== null);

            if (variantsWithIssues.length === 0) {
                setStatus('fixed');
                setProgress('');
                return;
            }

            setProgress(`AI is fixing ${variantsWithIssues.length} variant${variantsWithIssues.length > 1 ? 's' : ''}...`);

            const fixResponse = await requestAutoFix({
                creative_set_id: creativeSetId,
                master_width: master.preset.width,
                master_height: master.preset.height,
                variants: variantsWithIssues,
            });

            // ── Apply fixes to the store ──
            let totalFixes = 0;
            for (const variantFix of fixResponse.variants) {
                for (const fix of variantFix.fixes) {
                    if (fix.element_id && fix.new_constraints) {
                        updateVariantElement(variantFix.variant_id, fix.element_id, {
                            constraints: fix.new_constraints as unknown as import('@/schema/constraints.types').ElementConstraints,
                        });
                        totalFixes++;
                    }
                }
            }

            setFixResult(fixResponse);
            setStatus('fixed');
            setProgress(`Applied ${totalFixes} fix${totalFixes !== 1 ? 'es' : ''} across ${fixResponse.variants.length} variant${fixResponse.variants.length !== 1 ? 's' : ''}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Auto-fix failed');
            setStatus('error');
            setProgress('');
        }
    }, [report, updateVariantElement]);

    const reset = useCallback(() => {
        setStatus('idle');
        setReport(null);
        setFixResult(null);
        setError(null);
        setProgress('');
    }, []);

    return { status, report, fixResult, error, progress, runQA, autoFix, reset };
}
