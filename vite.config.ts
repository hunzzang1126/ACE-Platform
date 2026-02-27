import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        wasm(),
        topLevelAwait(),
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
