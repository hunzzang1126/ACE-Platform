import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ── MCP Bridge Middleware ──────────────────────────────
// Receives tool calls from ace-mcp server and queues them
// for the ACE React app to execute via useAiMcpBridge hook.
const pendingMcpCalls: Array<{ id: string; tool: string; params: unknown }> = [];
const resultMap = new Map<string, { success: boolean; message: string }>();

function mcpBridgePlugin(): Plugin {
    return {
        name: 'ace-mcp-bridge',
        configureServer(server) {
            server.middlewares.use('/api/mcp/tool', (req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { tool, params } = JSON.parse(body) as { tool: string; params: unknown };
                            const id = `mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                            pendingMcpCalls.push({ id, tool, params });

                            // Poll for result (max 8s)
                            let waited = 0;
                            const poll = setInterval(() => {
                                const result = resultMap.get(id);
                                if (result || waited > 8000) {
                                    clearInterval(poll);
                                    resultMap.delete(id);
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify(result ?? { success: false, message: 'Timeout — ACE app may not be running' }));
                                }
                                waited += 100;
                            }, 100);
                        } catch {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }));
                        }
                    });
                } else {
                    res.statusCode = 405;
                    res.end('Method not allowed');
                }
            });

            // Endpoint for ACE app to poll pending tool calls
            server.middlewares.use('/api/mcp/pending', (_req, res) => {
                res.setHeader('Content-Type', 'application/json');
                const calls = pendingMcpCalls.splice(0); // drain queue
                res.end(JSON.stringify(calls));
            });

            // Endpoint for ACE app to report tool execution results
            server.middlewares.use('/api/mcp/result', (req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { id, success, message } = JSON.parse(body) as { id: string; success: boolean; message: string };
                            resultMap.set(id, { success, message });
                            res.end('ok');
                        } catch {
                            res.statusCode = 400;
                            res.end('bad request');
                        }
                    });
                } else {
                    res.statusCode = 405;
                    res.end('Method not allowed');
                }
            });
        },
    };
}

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        wasm(),
        topLevelAwait(),
        mcpBridgePlugin(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    optimizeDeps: {
        exclude: ['ace-engine'],
    },
    server: {
        strictPort: true,
        port: 5173,
        proxy: {
            // Proxy OpenAI API calls to bypass CORS in dev mode
            '/api/openai': {
                target: 'https://api.openai.com',
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/api\/openai/, ''),
                secure: true,
            },
            // Proxy Anthropic (Claude) API calls to bypass CORS in dev mode
            '/api/anthropic': {
                target: 'https://api.anthropic.com',
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/api\/anthropic/, ''),
                secure: true,
            },
        },
    },
});
