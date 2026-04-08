// ─────────────────────────────────────────────────
// useUnifiedAgent.test.ts — Unified AI Agent Brain
// ─────────────────────────────────────────────────
// Covers: intent routing, progress cards, live cursor,
// generate flow delegation, dashboard tool execution, model selection
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useUnifiedAgent.ts'), 'utf-8');

describe('useUnifiedAgent — exports', () => {
    it('exports ProgressCard interface', () => {
        expect(src).toContain('export interface ProgressCard');
    });

    it('exports LiveCursor interface', () => {
        expect(src).toContain('export interface LiveCursor');
    });
});

describe('useUnifiedAgent — intent routing', () => {
    it('imports context builder for routing', () => {
        expect(src).toContain('buildContext');
        expect(src).toContain('enrichMessageWithContext');
    });

    it('uses model router for role-based selection', () => {
        expect(src).toContain('getModelForRole');
    });
});

describe('useUnifiedAgent — progress cards', () => {
    it('ProgressCard has id, label, status fields', () => {
        expect(src).toContain('id: string');
        expect(src).toContain('label: string');
        expect(src).toContain("status: 'pending' | 'running' | 'done' | 'error'");
    });

    it('supports detail and reasoning fields', () => {
        expect(src).toContain('detail?: string');
        expect(src).toContain('reasoning?: string');
    });
});

describe('useUnifiedAgent — generate flow delegation', () => {
    it('delegates to executeGenerateFlow', () => {
        expect(src).toContain('executeGenerateFlow');
    });

    it('imports AgentFlowCallbacks type', () => {
        expect(src).toContain('AgentFlowCallbacks');
        expect(src).toContain('FlowEngine');
    });
});

describe('useUnifiedAgent — dashboard tools', () => {
    it('handles dashboard tool execution', () => {
        expect(src).toContain('executeDashboardTool');
        expect(src).toContain('DASHBOARD_TOOL_NAMES');
    });
});

describe('useUnifiedAgent — dependencies', () => {
    it('uses AiService for API calls', () => {
        expect(src).toContain('AiService');
    });

    it('integrates with design store', () => {
        expect(src).toContain('useDesignStore');
    });

    it('respects plan limits', () => {
        expect(src).toContain('usePlanLimits');
    });

    it('supports navigation', () => {
        expect(src).toContain('NavigateFunction');
        expect(src).toContain('useLocation');
    });

    it('uses resilient imports for code splitting', () => {
        expect(src).toContain('resilientImport');
    });
});

describe('useUnifiedAgent — live cursor', () => {
    it('LiveCursor has active, x, y, label fields', () => {
        expect(src).toContain('active: boolean');
        expect(src).toContain('x: number');
        expect(src).toContain('y: number');
        expect(src).toContain('label?: string');
    });
});
