// ─────────────────────────────────────────────────
// useSmartCheck — One-click Smart Check hook
// ─────────────────────────────────────────────────
// Replaces the old useVisionQA. No report modal — just fix everything.
// Flow: detect issues → auto-fix → (optional) vision verify → toast result.

import { useState, useCallback } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import { runSmartSizingQA } from '@/engine/smartSizingQA';
import { generateFixes, type FixResult } from '@/engine/smartSizingFixer';
import { runBatchVisionCheck } from '@/ai/visionSelfCheck';
import { useDesignStore } from '@/stores/designStore';

export type SmartCheckStatus = 'idle' | 'checking' | 'done' | 'error';

export interface SmartCheckResult {
    issueCount: number;
    fixCount: number;
    fixes: FixResult[];
    visionIssueCount: number;
    message: string;
}

export function useSmartCheck() {
    const [status, setStatus] = useState<SmartCheckStatus>('idle');
    const [result, setResult] = useState<SmartCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const updateVariantElement = useDesignStore((s) => s.updateVariantElement);

    const runSmartCheck = useCallback(async (variants: BannerVariant[]) => {
        try {
            setStatus('checking');
            setError(null);
            setResult(null);

            // Pass 1: Client-side rule check (instant)
            const issues = runSmartSizingQA(variants);

            // Generate and apply fixes
            let applied = 0;
            if (issues.length > 0) {
                const fixes = generateFixes(issues, variants);
                for (const fix of fixes) {
                    try {
                        updateVariantElement(fix.variantId, fix.elementId, fix.patch);
                        applied++;
                    } catch {
                        console.warn(`[SmartCheck] Failed to apply fix for ${fix.elementName}`);
                    }
                }
            }

            // Pass 2: Vision API self-check (optional, skips if no API key)
            let visionIssueCount = 0;
            try {
                const visionResults = await runBatchVisionCheck(variants);
                for (const [, vr] of visionResults) {
                    visionIssueCount += vr.issues.length;
                }
            } catch {
                // Vision check is optional — silently skip on failure
            }

            // Build result message
            const totalIssues = issues.length + visionIssueCount;
            let message: string;
            if (totalIssues === 0) {
                message = '✓ All sizes look great!';
            } else if (applied > 0 && visionIssueCount === 0) {
                message = `✓ Fixed ${applied} issue${applied !== 1 ? 's' : ''} — all sizes are clean!`;
            } else if (applied > 0 && visionIssueCount > 0) {
                message = `✓ Fixed ${applied} issue${applied !== 1 ? 's' : ''}. ${visionIssueCount} visual note${visionIssueCount !== 1 ? 's' : ''} detected.`;
            } else {
                message = `Found ${totalIssues} notice${totalIssues !== 1 ? 's' : ''} — no auto-fix needed.`;
            }

            setResult({
                issueCount: issues.length,
                fixCount: applied,
                fixes: issues.length > 0 ? generateFixes(issues, variants) : [],
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

