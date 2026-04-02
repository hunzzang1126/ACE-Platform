// ─────────────────────────────────────────────────
// agentPipelineOrchestration.test.ts — Pipeline flow tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRunPlanner, mockRunExecutor, mockApplyFix, mockStructuralCritic, mockVisionCritic, mockBuildSG, mockCapture } = vi.hoisted(() => ({
    mockRunPlanner: vi.fn(),
    mockRunExecutor: vi.fn(),
    mockApplyFix: vi.fn(),
    mockStructuralCritic: vi.fn(),
    mockVisionCritic: vi.fn(),
    mockBuildSG: vi.fn(),
    mockCapture: vi.fn(),
}));

vi.mock('./plannerAgent', () => ({ runPlanner: mockRunPlanner }));
vi.mock('./executorAgent', () => ({ runExecutor: mockRunExecutor, applyFixPatches: mockApplyFix }));
vi.mock('./criticAgent', () => ({ runStructuralCritic: mockStructuralCritic, runVisionCritic: mockVisionCritic }));
vi.mock('@/services/sceneGraphBuilder', () => ({ buildSceneGraph: mockBuildSG }));
vi.mock('@/services/visionService', () => ({ captureCanvas: mockCapture }));

import { runAgentPipeline } from './agentPipeline';

const plan = { description: 'Test', elements: [{ name: 'BG' }, { name: 'HL' }] };
const toolResults = [{ tool: 'a', success: true }, { tool: 'b', success: true }];

const ctx = {
    canvasW: 300, canvasH: 250, activeVariantId: 'v1',
    designActions: {
        getCreativeSet: vi.fn().mockReturnValue({
            variants: [{ id: 'v1', width: 300, height: 250, elements: [] }],
        }),
    },
} as any;

beforeEach(() => {
    vi.clearAllMocks();
    mockRunPlanner.mockResolvedValue(plan);
    mockRunExecutor.mockResolvedValue(toolResults);
    mockApplyFix.mockResolvedValue([]);
    mockStructuralCritic.mockReturnValue({ score: 90, pass: true, issues: [], brandComplianceScore: null });
    mockVisionCritic.mockResolvedValue({ score: 85, issues: [] });
    mockBuildSG.mockReturnValue({ canvas: { width: 300, height: 250 }, elements: [] });
    mockCapture.mockReturnValue('data:image/png;base64,mock');
});

describe('runAgentPipeline — orchestration', () => {
    it('completes successfully when critic passes', async () => {
        const r = await runAgentPipeline('Banner', ctx, null, new AbortController().signal);
        expect(r.success).toBe(true);
        expect(r.steps.length).toBeGreaterThanOrEqual(3);
    });

    it('records planner step with element count', async () => {
        const r = await runAgentPipeline('Test', ctx, null, new AbortController().signal);
        const step = r.steps.find(s => s.agent === 'planner');
        expect(step!.output?.elementCount).toBe(2);
    });

    it('records executor step with success count', async () => {
        const r = await runAgentPipeline('Test', ctx, null, new AbortController().signal);
        const step = r.steps.find(s => s.agent === 'executor');
        expect(step!.output?.succeeded).toBe(2);
    });

    it('returns error result on planner failure', async () => {
        mockRunPlanner.mockRejectedValueOnce(new Error('API fail'));
        const r = await runAgentPipeline('Test', ctx, null, new AbortController().signal);
        expect(r.success).toBe(false);
    });

    it('includes totalDuration', async () => {
        const r = await runAgentPipeline('Test', ctx, null, new AbortController().signal);
        expect(r.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('includes plan in result', async () => {
        const r = await runAgentPipeline('Test', ctx, null, new AbortController().signal);
        expect(r.plan?.elements.length).toBe(2);
    });
});
