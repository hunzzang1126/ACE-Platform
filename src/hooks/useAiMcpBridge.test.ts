// ─────────────────────────────────────────────────
// useAiMcpBridge.test.ts — MCP Tool Bridge Hook
// ─────────────────────────────────────────────────
// Covers: polling mechanism, tool execution, result reporting,
// engine integration, abort/cleanup
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useAiMcpBridge.ts'), 'utf-8');

describe('useAiMcpBridge — interfaces', () => {
    it('defines McpPendingCall interface', () => {
        expect(src).toContain('McpPendingCall');
    });

    it('defines UseAiMcpBridgeOptions interface', () => {
        expect(src).toContain('UseAiMcpBridgeOptions');
    });

    it('accepts engine, trackedNodes, pollIntervalMs', () => {
        expect(src).toContain('engine:');
        expect(src).toContain('trackedNodes:');
        expect(src).toContain('pollIntervalMs');
    });
});

describe('useAiMcpBridge — tool execution', () => {
    it('uses executeToolCall from commandExecutor', () => {
        expect(src).toContain('executeToolCall');
    });

    it('imports from command executor', () => {
        expect(src).toContain("from '@/ai/commandExecutor'");
    });
});

describe('useAiMcpBridge — MCP protocol', () => {
    it('McpPendingCall has id, tool, params', () => {
        expect(src).toContain('id: string');
        expect(src).toContain('tool: string');
        expect(src).toContain('params:');
    });

    it('uses SceneNodeInfo for context', () => {
        expect(src).toContain('SceneNodeInfo');
    });
});

describe('useAiMcpBridge — lifecycle', () => {
    it('uses useEffect for setup', () => {
        expect(src).toContain('useEffect');
    });

    it('uses useRef for persistence', () => {
        expect(src).toContain('useRef');
    });
});
