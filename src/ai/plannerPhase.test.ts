// ─────────────────────────────────────────────────
// plannerPhase.test.ts — Plan extraction tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { extractPlan, formatPlanForDisplay, PLANNING_INSTRUCTION } from './plannerPhase';
import type { ClaudeContentBlock } from './aiServiceTypes';

function makeToolBlock(name: string, input: Record<string, unknown> = {}): ClaudeContentBlock {
    return { type: 'tool_use', id: `call_${name}`, name, input };
}

describe('plannerPhase', () => {
    describe('extractPlan', () => {
        it('should extract steps from tool blocks', () => {
            const tools = [
                makeToolBlock('generate_image', { prompt: 'dark gradient background' }),
                makeToolBlock('add_text', { content: 'Big Sale Today' }),
                makeToolBlock('add_button', { text: 'Shop Now' }),
            ];
            const plan = extractPlan('I will create a sale banner.', tools);
            expect(plan.steps).toHaveLength(3);
            expect(plan.estimatedTools).toBe(3);
            expect(plan.rawText).toBe('I will create a sale banner.');
        });

        it('should map tool names to human-readable actions', () => {
            const tools = [makeToolBlock('generate_full_design', { prompt: 'tech banner' })];
            const plan = extractPlan('', tools);
            expect(plan.steps[0]!.action).toBe('Create full design');
        });

        it('should extract detail from tool params', () => {
            const tools = [makeToolBlock('add_text', { content: 'Hello World' })];
            const plan = extractPlan('', tools);
            expect(plan.steps[0]!.detail).toContain('Hello World');
        });

        it('should handle update_element_property detail', () => {
            const tools = [makeToolBlock('update_element_property', {
                element_name: 'headline', property: 'color', value: '#FF0000',
            })];
            const plan = extractPlan('', tools);
            expect(plan.steps[0]!.detail).toContain('headline');
            expect(plan.steps[0]!.detail).toContain('color');
        });

        it('should handle execute_dynamic_action with description', () => {
            const tools = [makeToolBlock('execute_dynamic_action', {
                description: 'Set all text to uppercase', code: '...',
            })];
            const plan = extractPlan('', tools);
            expect(plan.steps[0]!.detail).toContain('uppercase');
        });

        it('should handle empty tool blocks', () => {
            const plan = extractPlan('Just a text response', []);
            expect(plan.steps).toHaveLength(0);
            expect(plan.estimatedTools).toBe(0);
        });

        it('should handle unknown tools gracefully', () => {
            const tools = [makeToolBlock('some_future_tool', { foo: 'bar' })];
            const plan = extractPlan('', tools);
            expect(plan.steps[0]!.action).toBe('some future tool');
        });
    });

    describe('formatPlanForDisplay', () => {
        it('should format steps with numbering', () => {
            const plan = extractPlan('', [
                makeToolBlock('generate_image', { prompt: 'sunset bg' }),
                makeToolBlock('add_text', { content: 'Hello' }),
            ]);
            const display = formatPlanForDisplay(plan);
            expect(display).toHaveLength(2);
            expect(display[0]).toContain('1.');
            expect(display[0]).toContain('Generate image');
            expect(display[1]).toContain('2.');
        });

        it('should include detail when available', () => {
            const plan = extractPlan('', [
                makeToolBlock('add_button', { text: 'Buy Now' }),
            ]);
            const display = formatPlanForDisplay(plan);
            expect(display[0]).toContain('Buy Now');
        });
    });

    describe('PLANNING_INSTRUCTION', () => {
        it('should be a non-empty string', () => {
            expect(PLANNING_INSTRUCTION.length).toBeGreaterThan(20);
        });

        it('should mention plan explanation', () => {
            expect(PLANNING_INSTRUCTION).toContain('plan');
        });
    });
});
