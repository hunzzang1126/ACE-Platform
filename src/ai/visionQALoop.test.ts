// ─────────────────────────────────────────────────
// visionQALoop.test.ts — Vision QA tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildCorrectionPrompt, shouldRunQA, DESIGN_TOOLS } from './visionQALoop';
import type { QAIssue } from './visionQALoop';

describe('visionQALoop', () => {
    describe('buildCorrectionPrompt', () => {
        it('should return null for empty issues', () => {
            expect(buildCorrectionPrompt(80, [])).toBeNull();
        });

        it('should build prompt with critical issues', () => {
            const issues: QAIssue[] = [
                { type: 'overlap', severity: 'error', element: 'headline', fix: 'Move headline up 20px' },
                { type: 'contrast', severity: 'error', element: 'subline', fix: 'Increase text contrast' },
            ];
            const prompt = buildCorrectionPrompt(55, issues);
            expect(prompt).not.toBeNull();
            expect(prompt).toContain('VISION QA');
            expect(prompt).toContain('55/100');
            expect(prompt).toContain('overlap');
            expect(prompt).toContain('headline');
            expect(prompt).toContain('Move headline up 20px');
        });

        it('should include warnings', () => {
            const issues: QAIssue[] = [
                { type: 'spacing', severity: 'warning', element: 'cta', fix: 'Add 8px padding' },
            ];
            const prompt = buildCorrectionPrompt(65, issues);
            expect(prompt).toContain('Warnings');
            expect(prompt).toContain('spacing');
        });

        it('should limit displayed issues to 5 errors + 3 warnings', () => {
            const issues: QAIssue[] = [];
            for (let i = 0; i < 8; i++) {
                issues.push({ type: `error_${i}`, severity: 'error', element: `el_${i}`, fix: `fix ${i}` });
            }
            for (let i = 0; i < 5; i++) {
                issues.push({ type: `warn_${i}`, severity: 'warning', element: `el_${i}`, fix: `fix ${i}` });
            }
            const prompt = buildCorrectionPrompt(30, issues)!;
            // Should only show 5 errors and 3 warnings
            const errorLines = prompt.split('\n').filter(l => l.includes('error_'));
            const warnLines = prompt.split('\n').filter(l => l.includes('warn_'));
            expect(errorLines.length).toBeLessThanOrEqual(5);
            expect(warnLines.length).toBeLessThanOrEqual(3);
        });

        it('should include fix instruction', () => {
            const issues: QAIssue[] = [
                { type: 'clipping', severity: 'error', element: 'logo', fix: 'Resize logo' },
            ];
            const prompt = buildCorrectionPrompt(40, issues)!;
            expect(prompt).toContain('execute_dynamic_action');
        });
    });

    describe('shouldRunQA', () => {
        it('should return true when design tools succeeded', () => {
            const records = [
                { name: 'generate_full_design', result: { success: true } },
            ];
            expect(shouldRunQA(records)).toBe(true);
        });

        it('should return true for execute_dynamic_action', () => {
            const records = [
                { name: 'execute_dynamic_action', result: { success: true } },
            ];
            expect(shouldRunQA(records)).toBe(true);
        });

        it('should return false when only analyze_scene ran', () => {
            const records = [
                { name: 'analyze_scene', result: { success: true } },
            ];
            expect(shouldRunQA(records)).toBe(false);
        });

        it('should return false when design tool failed', () => {
            const records = [
                { name: 'generate_full_design', result: { success: false } },
            ];
            expect(shouldRunQA(records)).toBe(false);
        });

        it('should return false for empty records', () => {
            expect(shouldRunQA([])).toBe(false);
        });
    });

    describe('DESIGN_TOOLS', () => {
        it('should include all creation tools', () => {
            expect(DESIGN_TOOLS.has('generate_full_design')).toBe(true);
            expect(DESIGN_TOOLS.has('add_text')).toBe(true);
            expect(DESIGN_TOOLS.has('add_button')).toBe(true);
            expect(DESIGN_TOOLS.has('replace_background_image')).toBe(true);
        });

        it('should not include analysis tools', () => {
            expect(DESIGN_TOOLS.has('analyze_scene')).toBe(false);
            expect(DESIGN_TOOLS.has('undo_ai_action')).toBe(false);
        });
    });
});
