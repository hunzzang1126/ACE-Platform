// ─────────────────────────────────────────────────
// agentTypes — Type Structure Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import type {
    AgentMessage, AgentStep, DesignPlan, PlannedElement,
    CriticResult, CriticIssue, PipelineResult, ProgressCallback,
} from './agentTypes';

describe('agentTypes — Type Shapes', () => {
    it('AgentMessage accepts all valid roles', () => {
        const msgs: AgentMessage[] = [
            { role: 'system', content: 'System prompt' },
            { role: 'user', content: 'User input' },
            { role: 'assistant', content: 'Response' },
        ];
        expect(msgs).toHaveLength(3);
    });

    it('AgentStep tracks execution metadata', () => {
        const step: AgentStep = {
            agent: 'planner', action: 'design_plan',
            input: { prompt: 'test' }, output: { plan: {} },
            duration: 1500, timestamp: '2026-01-01T00:00:00Z',
        };
        expect(step.agent).toBe('planner');
        expect(step.duration).toBe(1500);
    });

    it('AgentStep agent can be planner, executor, or critic', () => {
        const agents: AgentStep['agent'][] = ['planner', 'executor', 'critic'];
        expect(agents).toHaveLength(3);
    });

    it('DesignPlan has required layout fields', () => {
        const plan: DesignPlan = {
            description: 'Modern ad layout',
            elements: [],
            colorPalette: ['#2DD4BF', '#6366F1'],
            fontChoices: { heading: 'Inter', body: 'Inter', cta: 'Inter' },
        };
        expect(plan.colorPalette).toHaveLength(2);
        expect(plan.fontChoices.heading).toBe('Inter');
    });

    it('PlannedElement has role, type, tool, params, reasoning', () => {
        const el: PlannedElement = {
            role: 'headline', type: 'text', tool: 'create_text',
            params: { content: 'Hello', fontSize: 32 },
            reasoning: 'Primary message',
        };
        expect(el.role).toBe('headline');
        expect(el.tool).toBe('create_text');
    });

    it('CriticResult has pass threshold at 82', () => {
        const pass: CriticResult = {
            score: 85, pass: true, issues: [], suggestions: [],
        };
        const fail: CriticResult = {
            score: 60, pass: false, issues: [], suggestions: ['Fix overlap'],
        };
        expect(pass.pass).toBe(true);
        expect(fail.pass).toBe(false);
    });

    it('CriticIssue covers all issue types', () => {
        const types: CriticIssue['type'][] = [
            'overlap', 'clipping', 'contrast', 'hierarchy',
            'spacing', 'brand_violation', 'missing_logo', 'font_mismatch',
        ];
        expect(types).toHaveLength(8);
    });

    it('CriticIssue severity is error or warning', () => {
        const issue: CriticIssue = {
            type: 'overlap', severity: 'error',
            element: 'headline', description: 'Overlaps CTA',
            fixTool: 'move_node', fixParams: { y: 50 },
        };
        expect(issue.severity).toBe('error');
    });

    it('PipelineResult aggregates all stages', () => {
        const result: PipelineResult = {
            success: true, steps: [], plan: null,
            toolResults: [], criticResult: null,
            totalDuration: 3000, iterationCount: 1,
        };
        expect(result.totalDuration).toBe(3000);
    });

    it('ProgressCallback is a function type', () => {
        const cb: ProgressCallback = (msg, agent) => {
            expect(typeof msg).toBe('string');
        };
        cb('Testing...', 'planner');
    });
});
