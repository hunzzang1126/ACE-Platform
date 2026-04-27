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

        it('should handle generate_full_design with parsed element count', () => {
            const records = [
                makeRecord('generate_full_design', true, 'Rendered 5 elements on canvas'),
            ];
            const result = verifyToolResults(records, () => 5, () => ['A', 'B', 'C', 'D', 'E'], 0);
            expect(result.verified).toBe(true);
            expect(result.expectedCount).toBe(5);
        });

        it('should fail when generate_full_design claims more than exist', () => {
            const records = [
                makeRecord('generate_full_design', true, 'Rendered 6 elements on canvas'),
            ];
            // Only 2 elements exist — way below 60% threshold
            const result = verifyToolResults(records, () => 2, () => ['A', 'B'], 0);
            expect(result.verified).toBe(false);
        });

        it('should skip failed tool calls', () => {
            const records = [
                makeRecord('add_text', false, 'Failed to add text', { name: 'Title' }),
            ];
            const result = verifyToolResults(records, () => 0, () => [], 0);
            expect(result.verified).toBe(true); // Failed tools don't count
        });

        it('should be lenient with 60% threshold for decorations', () => {
            const records = [
                makeRecord('generate_full_design', true, 'Created 10 elements'),
            ];
            // 7 out of 10 = 70% > 60% threshold
            const result = verifyToolResults(records, () => 7, () => Array(7).fill('el'), 0);
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
