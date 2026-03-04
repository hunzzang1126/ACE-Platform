// ─────────────────────────────────────────────────
// useAiMcpBridge — MCP Tool Bridge Hook
// ─────────────────────────────────────────────────
// Polls /api/mcp/pending for tool calls from Claude Desktop
// and executes them via commandExecutor, then reports results.
//
// Usage in EditorCanvas (or any root component):
//   useAiMcpBridge({ engine, trackedNodes });
// ─────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { executeToolCall } from '@/ai/commandExecutor';
import type { SceneNodeInfo } from '@/ai/agentContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface McpPendingCall {
    id: string;
    tool: string;
    params: Record<string, unknown>;
}

interface UseAiMcpBridgeOptions {
    /** Canvas engine ref (from useFabricCanvas / createEngineShim) */
    engine: Engine | null;
    /** Mutable tracked nodes list (shared with AI context) */
    trackedNodes: SceneNodeInfo[];
    /** Poll interval in ms (default 500) */
    pollIntervalMs?: number;
    /** Only active in dev mode (default: import.meta.env.DEV) */
    onlyInDev?: boolean;
}

/**
 * Polls the Vite dev server's /api/mcp/pending endpoint every 500ms.
 * When pending tool calls arrive from Claude Desktop via ace-mcp,
 * executes them and reports results back to /api/mcp/result.
 *
 * This hook is a no-op in production builds (onlyInDev defaults to true).
 */
export function useAiMcpBridge({
    engine,
    trackedNodes,
    pollIntervalMs = 500,
    onlyInDev = true,
}: UseAiMcpBridgeOptions): void {
    const engineRef = useRef(engine);
    engineRef.current = engine;

    const trackedRef = useRef(trackedNodes);
    trackedRef.current = trackedNodes;

    useEffect(() => {
        // Skip in production builds
        if (onlyInDev && !import.meta.env.DEV) return;

        let active = true;

        const poll = async () => {
            if (!active) return;
            // Skip polling if engine is not yet connected
            if (!engineRef.current) return;

            try {
                const res = await fetch('/api/mcp/pending');
                if (!res.ok) return;

                const calls = await res.json() as McpPendingCall[];
                if (calls.length === 0) return;

                const eng = engineRef.current;
                if (!eng) {
                    // Report all as failed if no engine
                    for (const call of calls) {
                        await reportResult(call.id, false, 'Canvas engine not initialized');
                    }
                    return;
                }

                for (const call of calls) {
                    try {
                        const result = executeToolCall(
                            eng,
                            call.tool,
                            call.params,
                            trackedRef.current,
                        );

                        await reportResult(call.id, result.success, result.message);
                    } catch (err) {
                        await reportResult(call.id, false, String(err));
                    }
                }
            } catch {
                // Vite server not running or endpoint not found — silent fail
            }
        };

        const interval = setInterval(poll, pollIntervalMs);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [pollIntervalMs, onlyInDev]);
}

async function reportResult(id: string, success: boolean, message: string): Promise<void> {
    try {
        await fetch('/api/mcp/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, success, message }),
        });
    } catch {
        // Silent — Vite server may have restarted
    }
}
