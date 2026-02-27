// ─────────────────────────────────────────────────
// useVisionQA — Hook for AI Vision QA orchestration
// Captures screenshots → sends to backend → returns report
// ─────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { renderVariantToCanvas } from '@/utils/screenshotCapture';
import { runVisionQA, type VisionQAResponse } from '@/api/backendService';
import { resolveConstraints } from '@/schema/constraints.types';
import type { BannerVariant } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';

export type QAStatus = 'idle' | 'capturing' | 'analyzing' | 'done' | 'error';

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

export function useVisionQA() {
    const [status, setStatus] = useState<QAStatus>('idle');
    const [report, setReport] = useState<VisionQAResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');

    const runQA = useCallback(async (
        creativeSetId: string,
        masterVariantId: string,
        variants: BannerVariant[],
    ) => {
        try {
            setStatus('capturing');
            setError(null);
            setReport(null);

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

    const reset = useCallback(() => {
        setStatus('idle');
        setReport(null);
        setError(null);
        setProgress('');
    }, []);

    return { status, report, error, progress, runQA, reset };
}
