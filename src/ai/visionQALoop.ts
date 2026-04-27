// ─────────────────────────────────────────────────
// Vision QA Loop — Post-generation quality verifier
// ─────────────────────────────────────────────────
// After AI generates/modifies a design, captures a
// canvas screenshot and runs vision analysis.
// If quality score < threshold or critical issues
// found, returns a correction prompt for the AI
// to fix automatically.
// ─────────────────────────────────────────────────

// ── Types ────────────────────────────────────────

export interface QAIssue {
    type: string;           // 'overlap', 'contrast', 'clipping', etc.
    severity: 'error' | 'warning';
    element: string;
    fix: string;            // Actionable fix description
}

export interface QAResult {
    score: number;
    passed: boolean;
    issues: QAIssue[];
    correctionPrompt: string | null;
    screenshotCaptured: boolean;
}

// ── Constants ────────────────────────────────────

const PASS_THRESHOLD = 70;
const CRITICAL_ISSUE_TYPES = new Set([
    'overlap', 'clipping', 'contrast', 'text_overflow', 'readability',
]);

// ── Tools that indicate design creation/modification ──

export const DESIGN_TOOLS = new Set([
    // ★ generate_full_design excluded — intercepted by orchestrator, has its own QA
    'execute_dynamic_action',
    'add_text', 'add_button', 'add_shape',
    'replace_background_image', 'generate_image',
]);

// ── Public API ───────────────────────────────────

/**
 * Run Vision QA on the current canvas state.
 * Captures a screenshot, sends it to the vision model,
 * and evaluates the result.
 *
 * @param canvasW - Canvas width in pixels
 * @param canvasH - Canvas height in pixels
 * @param signal - Optional abort signal
 */
export async function runVisionQA(
    canvasW: number,
    canvasH: number,
    signal?: AbortSignal,
): Promise<QAResult> {
    // Step 1: Capture canvas screenshot
    let base64: string | null = null;
    try {
        const { captureCanvas } = await import('@/services/visionService');
        base64 = captureCanvas({ maxDimension: 512, format: 'image/jpeg', quality: 0.7 });
    } catch {
        return makeSkipResult('Canvas capture failed');
    }

    if (!base64 || base64.length < 100) {
        return makeSkipResult('Canvas screenshot too small or empty');
    }

    // Step 2: Analyze with vision model
    try {
        const { analyzeDesign } = await import('@/services/visionService');
        const analysis = await analyzeDesign(base64, canvasW, canvasH, signal);

        if (!analysis) {
            return makeSkipResult('Vision analysis returned null');
        }

        // Step 3: Extract issues and build correction prompt
        const issues = extractCriticalIssues(analysis);
        const passed = analysis.qualityScore >= PASS_THRESHOLD && issues.filter(i => i.severity === 'error').length === 0;
        const correctionPrompt = passed ? null : buildCorrectionPrompt(analysis.qualityScore, issues);

        return {
            score: analysis.qualityScore,
            passed,
            issues,
            correctionPrompt,
            screenshotCaptured: true,
        };
    } catch (err) {
        console.warn('[VisionQA] Analysis failed:', err);
        return makeSkipResult('Vision analysis error');
    }
}

// ── Internal Helpers ─────────────────────────────

function makeSkipResult(reason: string): QAResult {
    console.info(`[VisionQA] Skipped: ${reason}`);
    return { score: -1, passed: true, issues: [], correctionPrompt: null, screenshotCaptured: false };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCriticalIssues(analysis: any): QAIssue[] {
    const issues: QAIssue[] = [];
    if (!Array.isArray(analysis.issues)) return issues;

    for (const issue of analysis.issues) {
        if (!issue.type || !issue.severity) continue;
        const isCritical = CRITICAL_ISSUE_TYPES.has(issue.type);
        if (isCritical || issue.severity === 'error') {
            issues.push({
                type: issue.type,
                severity: issue.severity === 'error' ? 'error' : 'warning',
                element: issue.element ?? 'unknown',
                fix: issue.suggestion ?? issue.description ?? 'Fix this issue',
            });
        }
    }
    return issues;
}

/**
 * Build a correction prompt for the AI to fix detected issues.
 * Injected as a user message in the agentic loop.
 */
export function buildCorrectionPrompt(score: number, issues: QAIssue[]): string | null {
    if (issues.length === 0) return null;

    const errorIssues = issues.filter(i => i.severity === 'error');
    const warningIssues = issues.filter(i => i.severity === 'warning');

    const lines = [
        `[VISION QA] Design quality: ${score}/100 (needs ${PASS_THRESHOLD}+ to pass).`,
    ];

    if (errorIssues.length > 0) {
        lines.push(`Critical issues (${errorIssues.length}):`);
        for (const issue of errorIssues.slice(0, 5)) {
            lines.push(`  - ${issue.type} on "${issue.element}": ${issue.fix}`);
        }
    }

    if (warningIssues.length > 0) {
        lines.push(`Warnings (${warningIssues.length}):`);
        for (const issue of warningIssues.slice(0, 3)) {
            lines.push(`  - ${issue.type} on "${issue.element}": ${issue.fix}`);
        }
    }

    lines.push('Fix these issues using execute_dynamic_action or update_element_property.');
    return lines.join('\n');
}

/**
 * Check if any tool records indicate a design creation/modification.
 * Only run QA if design-related tools were used.
 */
export function shouldRunQA(toolRecords: Array<{ name: string; result: { success: boolean } }>): boolean {
    return toolRecords.some(r => r.result.success && DESIGN_TOOLS.has(r.name));
}
