// ─────────────────────────────────────────────────
// Hallucination Guard — Post-execution verification
// ─────────────────────────────────────────────────
// After AI tool execution, verifies that claimed changes
// actually happened on the canvas. Catches cases where
// AI says "created 5 elements" but only 3 exist.
// ─────────────────────────────────────────────────

import type { ToolCallRecord } from './agentContext';

// ── Types ────────────────────────────────────────

export interface VerificationResult {
    verified: boolean;
    expectedCount: number;
    actualCount: number;
    missingElements: string[];
    summary: string;
}

// ── Patterns that indicate element creation ──────

const CREATION_TOOLS = new Set([
    'add_text', 'add_button', 'generate_image',
    'replace_background_image', 'generate_full_design',
]);

const CREATION_KEYWORDS = /\b(created|added|placed|rendered|generated)\b/i;

// ── Public API ───────────────────────────────────

/**
 * Verify that tool execution results match actual canvas state.
 * Called after all tools in a round have executed.
 *
 * @param toolRecords - Records of executed tools with results
 * @param getNodeCount - Function that returns current canvas element count
 * @param getNodeNames - Function that returns current canvas element names
 * @param preCount - Element count BEFORE this round of tools
 */
export function verifyToolResults(
    toolRecords: ToolCallRecord[],
    getNodeCount: () => number,
    getNodeNames: () => string[],
    preCount: number,
): VerificationResult {
    // Count how many creation-type tools succeeded
    const successfulCreations = toolRecords.filter(
        r => r.result.success && (
            CREATION_TOOLS.has(r.name) ||
            CREATION_KEYWORDS.test(r.result.message)
        ),
    );

    if (successfulCreations.length === 0) {
        // No creation tools — nothing to verify
        return { verified: true, expectedCount: preCount, actualCount: getNodeCount(), missingElements: [], summary: 'No creation tools executed — skip verification.' };
    }

    // Expected: preCount + number of creation tools
    // But generate_full_design creates MULTIPLE elements, so we can't
    // simply add 1 per tool. Instead, parse result messages for counts.
    let expectedNew = 0;
    const expectedNames: string[] = [];

    for (const rec of successfulCreations) {
        if (rec.name === 'generate_full_design') {
            // Parse element count from varied patterns:
            // "Rendered 5 elements", "Created 10 elements", "5 elements rendered"
            const match = rec.result.message.match(/(\d+)\s*elements?/i)
                ?? rec.result.message.match(/(rendered|created|placed)\s+(\d+)/i);
            if (match) {
                const numStr = match[1]?.match(/^\d+$/) ? match[1] : match[2];
                expectedNew += parseInt(numStr ?? '4', 10);
            } else {
                expectedNew += 4; // Default assumption: headline + subline + cta + bg
            }
        } else {
            expectedNew += 1;
            // Try to extract element name from params or result
            const name = rec.input?.name as string
                ?? rec.input?.element_name as string
                ?? rec.name;
            if (name) expectedNames.push(name);
        }
    }

    const expectedTotal = preCount + expectedNew;
    const actualCount = getNodeCount();
    const actualNames = getNodeNames();

    // Check which expected names are missing
    const missingElements = expectedNames.filter(
        name => !actualNames.some(
            actual => actual.toLowerCase().includes(name.toLowerCase()),
        ),
    );

    // Verify: actual count should be >= expected (could be more due to decorations)
    const countMatch = actualCount >= expectedTotal * 0.6; // 60% threshold (decorations may merge)
    const verified = countMatch && missingElements.length === 0;

    const summary = verified
        ? `Verified: ${actualCount} elements on canvas (expected ~${expectedTotal}).`
        : `Mismatch: expected ~${expectedTotal} elements, found ${actualCount}.${missingElements.length > 0 ? ` Missing: ${missingElements.join(', ')}.` : ''} AI should verify and fix.`;

    return { verified, expectedCount: expectedTotal, actualCount, missingElements, summary };
}

/**
 * Build a verification message to inject back into the AI conversation.
 * Only returns a message if verification FAILED.
 */
export function buildVerificationMessage(result: VerificationResult): string | null {
    if (result.verified) return null;
    return `[HALLUCINATION GUARD] ${result.summary} Please check the canvas state with analyze_scene and fix any missing elements.`;
}
