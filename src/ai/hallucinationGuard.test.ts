// ─────────────────────────────────────────────────
// hallucinationGuard.test.ts — Verification tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { verifyToolResults, buildVerificationMessage } from './hallucinationGuard';
import type { ToolCallRecord } from './agentContext';

function makeRecord(name: string, success: boolean, message: string, input: Record<string, unknown> = {}): ToolCallRecord {
    return { name, input, result: { success, message }, durationMs: 100 };
}

describe('hallucinationGuard', () => {
    describe('verifyToolResults', () => {
        it('should pass when no creation tools executed', () => {
            const records = [makeRecord('analyze_scene', true, 'Scene analyzed')];
            const result = verifyToolResults(records, () => 3, () => ['A', 'B', 'C'], 3);
            expect(result.verified).toBe(true);
        });

        it('should pass when element count matches', () => {
            const records = [
                makeRecord('add_text', true, 'Text added', { name: 'Headline' }),
                makeRecord('add_button', true, 'Button created', { name: 'CTA' }),
            ];
            const result = verifyToolResults(records, () => 5, () => ['BG', 'Img', 'Headline', 'Sub', 'CTA'], 3);
            expect(result.verified).toBe(true);
            expect(result.actualCount).toBe(5);
        });

        it('should fail when elements are missing', () => {
            const records = [
                makeRecord('add_text', true, 'Text added', { name: 'Headline' }),
                makeRecord('add_button', true, 'Button created', { name: 'CTA Button' }),
            ];
            // Only 3 elements exist, and CTA Button is missing
            const result = verifyToolResults(records, () => 3, () => ['BG', 'Img', 'Headline'], 3);
            expect(result.verified).toBe(false);
            expect(result.missingElements).toContain('CTA Button');
        });

        it('★ REGRESSION: should skip verification for generate_full_design (orchestrator-intercepted)', () => {
            // generate_full_design is intercepted by dashboardOverride — it returns
            // success but creates 0 elements. The guard must NOT trigger verification
            // for this tool, or it will burn all 3 rounds trying to fix a "mismatch".
            // The real dashboardOverride message is: "[GENERATE_FULL_DESIGN] Launching pipeline..."
            const records = [
                makeRecord('generate_full_design', true, '[GENERATE_FULL_DESIGN] Launching pipeline for: "iPhone 17 ad"'),
            ];
            const result = verifyToolResults(records, () => 0, () => [], 0);
            // Should skip verification entirely (not in CREATION_TOOLS + no CREATION_KEYWORDS match)
            expect(result.verified).toBe(true);
            expect(result.summary).toContain('No creation tools');
        });

        it('should skip failed tool calls', () => {
            const records = [
                makeRecord('add_text', false, 'Failed to add text', { name: 'Title' }),
            ];
            const result = verifyToolResults(records, () => 0, () => [], 0);
            expect(result.verified).toBe(true); // Failed tools don't count
        });

        it('should be lenient with 60% threshold for decorations', () => {
            // 3 add_text calls with 2 actually on canvas (66% > 60%)
            const records = [
                makeRecord('add_text', true, 'Text added', { name: 'headline' }),
                makeRecord('add_text', true, 'Text added', { name: 'subline' }),
                makeRecord('add_text', true, 'Text added', { name: 'cta_label' }),
            ];
            // preCount=0, expected=3, actual=2 → 66% ≥ 60%
            // All named elements present in canvas (no missing names triggers)
            const result = verifyToolResults(
                records,
                () => 2,
                () => ['headline', 'subline', 'cta_label'],
                0,
            );
            expect(result.verified).toBe(true);
        });
    });

    describe('buildVerificationMessage', () => {
        it('should return null for verified results', () => {
            const msg = buildVerificationMessage({ verified: true, expectedCount: 5, actualCount: 5, missingElements: [], summary: 'OK' });
            expect(msg).toBeNull();
        });

        it('should return message for failed verification', () => {
            const msg = buildVerificationMessage({ verified: false, expectedCount: 5, actualCount: 3, missingElements: ['CTA'], summary: 'Mismatch' });
            expect(msg).toContain('HALLUCINATION GUARD');
            expect(msg).toContain('analyze_scene');
        });
    });
});
