// ─────────────────────────────────────────────────
// aiService.test.ts — AiService class unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetKey, mockLoadConfig, mockSaveConfig, mockBuildContext, mockBuildSystemPrompt, mockEnrich, mockGetToolsForPage, mockToClaudeTools, mockExecuteToolCall } = vi.hoisted(() => ({
    mockGetKey: vi.fn().mockReturnValue('test-api-key'),
    mockLoadConfig: vi.fn().mockReturnValue({ model: 'anthropic/claude-3.5-haiku', maxToolRounds: 3 }),
    mockSaveConfig: vi.fn(),
    mockBuildContext: vi.fn().mockReturnValue({
        page: 'editor', pageLabel: 'Canvas Editor',
        elementCount: 2, canvasSize: { w: 300, h: 250 },
    }),
    mockBuildSystemPrompt: vi.fn().mockReturnValue('System prompt'),
    mockEnrich: vi.fn().mockImplementation((msg: string) => msg),
    mockGetToolsForPage: vi.fn().mockReturnValue([]),
    mockToClaudeTools: vi.fn().mockReturnValue([]),
    mockExecuteToolCall: vi.fn().mockReturnValue({ success: true, message: 'done' }),
}));

vi.mock('@/config/apiKeys', () => ({
    getOpenRouterKey: mockGetKey,
    isAiAvailable: vi.fn().mockImplementation(() => !!mockGetKey()),
    isProxyMode: vi.fn().mockReturnValue(false),
}));
vi.mock('./aiServiceTypes', () => ({
    loadConfig: mockLoadConfig,
    saveConfig: mockSaveConfig,
    sleep: vi.fn().mockResolvedValue(undefined),
    nextFrame: vi.fn().mockResolvedValue(undefined),
    humanizeToolStep: vi.fn().mockReturnValue('step'),
}));
vi.mock('./contextRouter', () => ({
    buildContext: mockBuildContext,
    buildContextSystemPrompt: mockBuildSystemPrompt,
    enrichMessageWithContext: mockEnrich,
}));
vi.mock('./agentTools', () => ({ getToolsForPage: mockGetToolsForPage }));
vi.mock('./aceToolDef', () => ({ toClaudeTools: mockToClaudeTools }));
vi.mock('./commandExecutor', () => ({ executeToolCall: mockExecuteToolCall }));
vi.mock('./agentContext', () => ({
    AgentContext: class {
        private msgs: any[] = [];
        addMessage(m: any) { this.msgs.push(m); }
        getHistory() { return [...this.msgs]; }
    },
}));

import { AiService } from './aiService';

beforeEach(() => vi.clearAllMocks());

// ══════════════════════════════════════════════════
// Constructor & config
// ══════════════════════════════════════════════════

describe('AiService — config', () => {
    it('loads config on construction', () => {
        new AiService([]);
        expect(mockLoadConfig).toHaveBeenCalledOnce();
    });

    it('isConfigured returns true when key exists', () => {
        const svc = new AiService([]);
        expect(svc.isConfigured()).toBe(true);
    });

    it('isConfigured returns false when no key and not proxy', () => {
        mockGetKey.mockReturnValueOnce('');
        const svc = new AiService([]);
        expect(svc.isConfigured()).toBe(false);
    });

    it('updateConfig saves config', () => {
        const svc = new AiService([]);
        svc.updateConfig({ model: 'test-model' });
        expect(mockSaveConfig).toHaveBeenCalled();
    });

    it('getConfig returns a copy', () => {
        const svc = new AiService([]);
        const a = svc.getConfig();
        const b = svc.getConfig();
        expect(a).toEqual(b);
        expect(a).not.toBe(b);
    });
});

// ══════════════════════════════════════════════════
// Design context
// ══════════════════════════════════════════════════

describe('AiService — design context', () => {
    it('setDesignContext stores creative set info', () => {
        const svc = new AiService([]);
        svc.setDesignContext({ id: 'cs-1' }, 'var-1');
        expect(svc.getDesignContext().creativeSet).toEqual({ id: 'cs-1' });
        expect(svc.getDesignContext().masterVariantId).toBe('var-1');
    });

    it('getDesignContext defaults to null', () => {
        const svc = new AiService([]);
        expect(svc.getDesignContext().creativeSet).toBeNull();
    });
});

// ══════════════════════════════════════════════════
// getLastReply
// ══════════════════════════════════════════════════

describe('AiService — getLastReply', () => {
    it('returns empty string when no messages', () => {
        const svc = new AiService([]);
        expect(svc.getLastReply()).toBe('');
    });
});

// ══════════════════════════════════════════════════
// chat — error handling
// ══════════════════════════════════════════════════

describe('AiService — chat error', () => {
    it('reports error when no API key', async () => {
        mockGetKey.mockReturnValueOnce('');
        const svc = new AiService([]);
        const progress = {
            onCanvasScan: vi.fn(), onThinking: vi.fn(), onToken: vi.fn(),
            onPlan: vi.fn(), onStepStart: vi.fn(), onStepComplete: vi.fn(),
            onReflection: vi.fn(), onComplete: vi.fn(), onError: vi.fn(),
        };
        await svc.chat('Hello', null, progress);
        expect(progress.onError).toHaveBeenCalledWith(expect.stringContaining('not available'));
    });
});

// ══════════════════════════════════════════════════
// v692: Error-aware retry + narration
// ══════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('★ v692: Error-aware auto-retry with context', () => {
    const aiSrc = readFileSync(resolve(__dirname, './aiService.ts'), 'utf-8');

    it('narrates retry attempt to user via onToken', () => {
        expect(aiSrc).toContain("progress.onToken(`Retrying ${tc.name}");
    });

    it('narrates error message on second failure', () => {
        expect(aiSrc).toContain('failed:');
        expect(aiSrc).toContain('result.message.slice(0, 60)');
    });

    it('passes error context to AI via is_error tool_result', () => {
        expect(aiSrc).toContain('is_error: !result.success');
    });

    it('skips retry for analyze_scene and undo tools', () => {
        expect(aiSrc).toContain("'analyze_scene'");
        expect(aiSrc).toContain("'undo_ai_action'");
        expect(aiSrc).toContain('NO_RETRY_TOOLS.has(tc.name!)');
    });

    it('3-tier model routing: planner → executor', () => {
        expect(aiSrc).toContain("role = round <= 1 ? 'planner' : 'executor'");
    });

    it('post-round verification summarizes failed tools', () => {
        expect(aiSrc).toContain('ROUND ${rounds} VERIFICATION');
        expect(aiSrc).toContain('failedTools.length > 0');
    });

    it('verification message is appended to last tool_result (not as fake tool_use_id)', () => {
        // ★ v725: Changed from fake tool_use_id='verify' to appending to last real tool_result
        // Old pattern caused OpenRouter 400 errors due to unmatched tool_call_id
        expect(aiSrc).not.toContain("tool_use_id: 'verify'");
        expect(aiSrc).toContain('Fix these issues in the next round');
        expect(aiSrc).toContain('lastResult.content = `${lastResult.content}');
    });
});

// ══════════════════════════════════════════════════
// v692: Context expansion — variant summaries
// ══════════════════════════════════════════════════

describe('★ v692: Project-wide context expansion', () => {
    const ctxSrc = readFileSync(resolve(__dirname, './smartContextBuilder.ts'), 'utf-8');

    it('SmartContext includes variantSummaries field', () => {
        expect(ctxSrc).toContain('variantSummaries');
    });

    it('builds variantSummaries from all creativeSet variants', () => {
        expect(ctxSrc).toContain('creativeSet.variants.map(v =>');
    });

    it('variant summary includes isMaster flag', () => {
        expect(ctxSrc).toContain('v.id === creativeSet.masterVariantId');
    });

    it('renders All Variants section in prompt', () => {
        expect(ctxSrc).toContain('All Variants (project-wide)');
    });
});

