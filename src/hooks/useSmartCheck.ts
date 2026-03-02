// ─────────────────────────────────────────────────
// useSmartCheck — One-click Smart Check hook
// ─────────────────────────────────────────────────
// Replaces the old useVisionQA. No report modal — just fix everything.
// Flow: detect issues → auto-fix → toast result.

import { useState, useCallback } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import { runSmartSizingQA } from '@/engine/smartSizingQA';
import { generateFixes, type FixResult } from '@/engine/smartSizingFixer';
import { useDesignStore } from '@/stores/designStore';

export type SmartCheckStatus = 'idle' | 'checking' | 'done' | 'error';

export interface SmartCheckResult {
    issueCount: number;
    fixCount: number;
    fixes: FixResult[];
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

            // Step 1: Detect issues (client-side, instant)
            const issues = runSmartSizingQA(variants);

            if (issues.length === 0) {
                setResult({
                    issueCount: 0,
                    fixCount: 0,
                    fixes: [],
                    message: '✓ All sizes look great!',
                });
                setStatus('done');
                return;
            }

            // Step 2: Generate fixes
            const fixes = generateFixes(issues, variants);

            // Step 3: Apply ALL fixes immediately (no report, just fix)
            let applied = 0;
            for (const fix of fixes) {
                try {
                    updateVariantElement(fix.variantId, fix.elementId, fix.patch);
                    applied++;
                } catch {
                    // Skip failed individual fixes, continue with the rest
                    console.warn(`[SmartCheck] Failed to apply fix for ${fix.elementName}`);
                }
            }

            // Build result message
            const unfixed = issues.length - applied;
            let message: string;
            if (applied > 0 && unfixed === 0) {
                message = `✓ Fixed ${applied} issue${applied !== 1 ? 's' : ''} — all sizes are clean!`;
            } else if (applied > 0) {
                message = `✓ Fixed ${applied} issue${applied !== 1 ? 's' : ''}. ${unfixed} info notice${unfixed !== 1 ? 's' : ''} remaining.`;
            } else {
                message = `Found ${issues.length} notice${issues.length !== 1 ? 's' : ''} — no auto-fix needed.`;
            }

            setResult({ issueCount: issues.length, fixCount: applied, fixes, message });
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
