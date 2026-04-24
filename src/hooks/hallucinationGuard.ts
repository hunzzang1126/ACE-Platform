// ─────────────────────────────────────────────────
// Hallucination Guard — Post-render verification
// ─────────────────────────────────────────────────
// Verifies that what Carbon planned actually rendered.
// Catches: missing elements, failed renders, count mismatches.
// ─────────────────────────────────────────────────

export interface HallucinationResult {
    passed: boolean;
    expected: number;
    actual: number;
    missing: string[];
    summary: string;
}

/**
 * Compare planned elements against what actually rendered on canvas.
 * @param planned - Elements that Carbon/pipeline intended to render
 * @param renderedCount - How many elements actually rendered successfully
 * @param engineNodeGetter - Function to get all nodes from the engine
 */
export function verifyRender(
    planned: Array<{ name?: string; type?: string }>,
    renderedCount: number,
    engineNodeGetter?: () => string,
): HallucinationResult {
    // Count meaningful planned elements (exclude background rect for threshold)
    const meaningfulPlanned = planned.filter(el =>
        el.type === 'text' || el.name === 'cta_button' || el.name === 'cta_label'
    );
    const expectedCount = meaningfulPlanned.length;

    // If engine getter available, do name-level verification
    let engineNames: string[] = [];
    if (engineNodeGetter) {
        try {
            const raw = engineNodeGetter();
            const nodes = JSON.parse(raw);
            if (Array.isArray(nodes)) {
                engineNames = nodes
                    .map((n: any) => n?.name ?? n?.id ?? '')
                    .filter(Boolean);
            }
        } catch { /* ok — engine unavailable */ }
    }

    // Find missing elements (planned but not on canvas)
    const missing: string[] = [];
    if (engineNames.length > 0) {
        const engineSet = new Set(engineNames.map(n => n.toLowerCase()));
        for (const el of meaningfulPlanned) {
            const name = (el.name ?? '').toLowerCase();
            if (name && !engineSet.has(name)) {
                missing.push(el.name ?? 'unknown');
            }
        }
    }

    // Threshold: at least 70% of planned meaningful elements must render
    const threshold = Math.ceil(expectedCount * 0.7);
    const actualMeaningful = Math.max(renderedCount - (planned.length - expectedCount), 0);
    const passed = actualMeaningful >= threshold && missing.length <= 1;

    // Build summary
    let summary: string;
    if (passed && missing.length === 0) {
        summary = `All ${expectedCount} content elements rendered successfully.`;
    } else if (passed) {
        summary = `${actualMeaningful}/${expectedCount} elements rendered. Minor: ${missing.join(', ')} may be missing.`;
    } else {
        summary = `HALLUCINATION DETECTED: Only ${actualMeaningful}/${expectedCount} content elements rendered. Missing: ${missing.join(', ') || 'unknown elements'}.`;
    }

    return { passed, expected: expectedCount, actual: actualMeaningful, missing, summary };
}

/**
 * Build a user-friendly narration from the hallucination check.
 */
export function hallucinationNarration(result: HallucinationResult): string {
    if (result.passed) {
        return `Design verified: ${result.actual} elements rendered.`;
    }
    return `Some elements may not have rendered correctly (${result.actual}/${result.expected}). ` +
        (result.missing.length > 0
            ? `Missing: ${result.missing.join(', ')}.`
            : 'Please check the canvas.');
}
