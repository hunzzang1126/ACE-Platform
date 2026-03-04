#!/usr/bin/env node
// ─────────────────────────────────────────────────
// ACE MCP Server — Model Context Protocol bridge
// For Claude Desktop integration
// ─────────────────────────────────────────────────
// Usage in claude_desktop_config.json:
//   {
//     "mcpServers": {
//       "ace": {
//         "command": "node",
//         "args": ["/path/to/ACE/ace-mcp/dist/index.js"],
//         "env": { "ACE_DEV_URL": "http://localhost:5173" }
//       }
//     }
//   }
// ─────────────────────────────────────────────────

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ALL_TOOLS_SCHEMA } from './tools.js';

// ── Config ──────────────────────────────────────

const ACE_DEV_URL = process.env.ACE_DEV_URL ?? 'http://localhost:5173';
const SERVER_VERSION = '0.1.0';

// ── Server Setup ─────────────────────────────────

const server = new Server(
    { name: 'ace-creative-engine', version: SERVER_VERSION },
    { capabilities: { tools: {} } }
);

// ── Tool Registry ────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: ALL_TOOLS_SCHEMA.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
        }))
    };
});

// ── Tool Execution ───────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        // Forward tool calls to ACE dev server via HTTP bridge
        const aceUrl = `${ACE_DEV_URL}/api/mcp/tool`;
        const response = await fetch(aceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: name, params: args }),
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            const errText = await response.text();
            return {
                content: [{
                    type: 'text' as const,
                    text: `ACE server error (${response.status}): ${errText}`,
                }],
                isError: true,
            };
        }

        const result = await response.json() as { success: boolean; message: string; data?: unknown };

        return {
            content: [{
                type: 'text' as const,
                text: result.message,
            }],
            isError: !result.success,
        };

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        // Check if ACE app is running
        if (msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
            return {
                content: [{
                    type: 'text' as const,
                    text: `ACE app is not running. Please start the ACE app (npm run dev) and try again.\nExpected URL: ${ACE_DEV_URL}`,
                }],
                isError: true,
            };
        }

        return {
            content: [{ type: 'text' as const, text: `Error: ${msg}` }],
            isError: true,
        };
    }
});

// ── Start ─────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(`[ACE MCP] Server started — forwarding to ${ACE_DEV_URL}`);
