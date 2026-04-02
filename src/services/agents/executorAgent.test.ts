// ─────────────────────────────────────────────────
// executorAgent.test.ts — Design executor agent tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecuteTool = vi.fn();
const mockExecuteBatch = vi.fn();

vi.mock('@/services/toolRegistry', () => ({
    executeTool: (...args: any[]) => mockExecuteTool(...args),
    executeBatch: (...args: any[]) => mockExecuteBatch(...args),
}));

import { runExecutor, runBatchExecutor, applyFixPatches } from './executorAgent';
import type { DesignPlan } from './agentTypes';
import type { ToolContext } from '@/services/tools/toolTypes';

const mockCtx: ToolContext = {} as any;

function makePlan(elements: any[]): DesignPlan {
    return { description: 'test', elements } as DesignPlan;
}

describe('executorAgent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── runExecutor ──
    describe('runExecutor', () => {
        it('should execute each planned tool', async () => {
            mockExecuteTool.mockResolvedValue({ success: true, message: 'ok' });
            const plan = makePlan([
                { tool: 'add_shape', params: { fill: '#000' }, role: 'background' },
                { tool: 'add_text', params: { content: 'Hello' }, role: 'headline' },
            ]);
            const results = await runExecutor(plan, mockCtx, new AbortController().signal);
            expect(results).toHaveLength(2);
            expect(mockExecuteTool).toHaveBeenCalledTimes(2);
        });

        it('should continue after failed tool', async () => {
            mockExecuteTool
                .mockResolvedValueOnce({ success: false, message: 'fail' })
                .mockResolvedValueOnce({ success: true, message: 'ok' });
            const plan = makePlan([
                { tool: 'bad_tool', params: {} },
                { tool: 'add_text', params: { content: 'Hello' } },
            ]);
            const results = await runExecutor(plan, mockCtx, new AbortController().signal);
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(false);
            expect(results[1].success).toBe(true);
        });

        it('should report progress', async () => {
            mockExecuteTool.mockResolvedValue({ success: true, message: 'ok' });
            const progress = vi.fn();
            await runExecutor(
                makePlan([{ tool: 'add_text', params: {} }]),
                mockCtx, new AbortController().signal, progress,
            );
            expect(progress).toHaveBeenCalledWith(expect.stringContaining('Executing'), 'executor');
        });

        it('should stop on abort signal', async () => {
            const ac = new AbortController();
            ac.abort();
            mockExecuteTool.mockResolvedValue({ success: true, message: 'ok' });
            const results = await runExecutor(
                makePlan([{ tool: 'add_text', params: {} }]),
                mockCtx, ac.signal,
            );
            expect(results).toHaveLength(0);
        });
    });

    // ── runBatchExecutor ──
    describe('runBatchExecutor', () => {
        it('should call executeBatch with operations', async () => {
            mockExecuteBatch.mockResolvedValue({
                success: true, totalOps: 2, succeeded: 2, failed: 0,
                results: [], message: 'ok',
            });
            const result = await runBatchExecutor(
                makePlan([{ tool: 'add_shape', params: {}, role: 'bg' }, { tool: 'add_text', params: {}, role: 'headline' }]),
                mockCtx, new AbortController().signal,
            );
            expect(result.succeeded).toBe(2);
            expect(mockExecuteBatch).toHaveBeenCalled();
        });

        it('should return failure on abort', async () => {
            const ac = new AbortController();
            ac.abort();
            const result = await runBatchExecutor(makePlan([]), mockCtx, ac.signal);
            expect(result.success).toBe(false);
        });
    });

    // ── applyFixPatches ──
    describe('applyFixPatches', () => {
        it('should return empty for no fixes', async () => {
            const results = await applyFixPatches([], mockCtx, new AbortController().signal);
            expect(results).toHaveLength(0);
        });

        it('should apply each fix via executeTool', async () => {
            mockExecuteTool.mockResolvedValue({ success: true, message: 'fixed' });
            const fixes = [
                { tool: 'setFill', params: { elementId: 'e1', fill: '#ff0000' } },
                { tool: 'moveNode', params: { elementId: 'e2', x: 10, y: 20 } },
            ];
            const results = await applyFixPatches(fixes, mockCtx, new AbortController().signal);
            expect(results).toHaveLength(2);
            expect(mockExecuteTool).toHaveBeenCalledTimes(2);
        });
    });
});
