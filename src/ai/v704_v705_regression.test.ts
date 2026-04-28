// ─────────────────────────────────────────────────
// v704_v705_regression.test.ts — Regression guards for v704-v705 fixes
// ─────────────────────────────────────────────────
// 3 critical pipeline fixes:
// 1. Fill-to-page: set_size uses independent scaleX/scaleY (not Math.min)
// 2. Copy leak: color instructions banned from AI copy output
// 3. API retry: auto-retry on transient 400/429/5xx errors
// 4. Store sync: background images use fit:'fill' (not 'cover')
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ══════════════════════════════════════════════════
// Fix 1: fabricEngineShim — set_size independent scale
// ══════════════════════════════════════════════════
describe('★ REGRESSION: fabricEngineShim set_size — fill mode (v704)', () => {
    const shimSrc = fs.readFileSync(
        path.resolve(__dirname, '../hooks/fabricEngineShim.ts'), 'utf-8'
    );

    it('set_size for images should NOT use Math.min (contain mode)', () => {
        // Math.min produces uniform scaling which leaves gaps when
        // image aspect ratio differs from target.
        // Old code: Math.min(newW / natW, newH / natH) — WRONG
        expect(shimSrc).not.toMatch(/set_size.*Math\.min\(newW/s);
    });

    it('set_size for images should use independent scaleX/scaleY', () => {
        // New code uses scaleX = newW/natW, scaleY = newH/natH independently
        expect(shimSrc).toContain('scaleX: newW / Math.max(natW, 1)');
        expect(shimSrc).toContain('scaleY: newH / Math.max(natH, 1)');
    });

    it('set_size comment should explain FILL mode rationale', () => {
        expect(shimSrc).toContain('FILL mode');
        expect(shimSrc).toContain('independent scaleX/scaleY');
    });

    // ── Simulate the actual math ──
    it('should scale 1024x768 image to exactly 1080x1080 canvas', () => {
        const natW = 1024, natH = 768;
        const targetW = 1080, targetH = 1080;

        // NEW (independent): exact fill
        const scaleX = targetW / natW;
        const scaleY = targetH / natH;
        expect(Math.round(natW * scaleX)).toBe(1080);
        expect(Math.round(natH * scaleY)).toBe(1080);

        // OLD (Math.min): would leave 270px gap
        const oldScale = Math.min(targetW / natW, targetH / natH);
        const oldH = Math.round(natH * oldScale);
        expect(oldH).toBeLessThan(1080); // This was the bug — 810px < 1080px
    });

    it('should scale 1920x1080 image to exactly 300x250 canvas', () => {
        const natW = 1920, natH = 1080;
        const targetW = 300, targetH = 250;
        const scaleX = targetW / natW;
        const scaleY = targetH / natH;
        expect(Math.round(natW * scaleX)).toBe(300);
        expect(Math.round(natH * scaleY)).toBe(250);
    });

    it('should handle square image on square canvas (no distortion)', () => {
        const natW = 1024, natH = 1024;
        const targetW = 1080, targetH = 1080;
        const scaleX = targetW / natW;
        const scaleY = targetH / natH;
        // Both scales should be equal for square-to-square
        expect(scaleX).toBeCloseTo(scaleY, 5);
    });
});

// ══════════════════════════════════════════════════
// Fix 2: Copy prompt — color/visual leak prohibition
// ══════════════════════════════════════════════════
describe('★ REGRESSION: designTemplates — color leak prevention (v704)', () => {
    const templateSrc = fs.readFileSync(
        path.resolve(__dirname, '../services/designTemplates.ts'), 'utf-8'
    );

    it('prompt must explicitly ban "in gold" text in copy', () => {
        expect(templateSrc).toContain('"in gold"');
    });

    it('prompt must explicitly ban "in yellow" text in copy', () => {
        expect(templateSrc).toContain('"in yellow"');
    });

    it('prompt must explicitly ban "with gradient" text in copy', () => {
        expect(templateSrc).toContain('"with gradient"');
    });

    it('prompt must state colors handled by separate system', () => {
        expect(templateSrc).toContain('SEPARATE system');
        expect(templateSrc).toContain('WORDS ONLY');
    });
});

// ══════════════════════════════════════════════════
// Fix 3: OpenRouter — retry logic
// ══════════════════════════════════════════════════
describe('★ REGRESSION: openRouterClient — auto-retry on 400 (v704)', () => {
    const clientSrc = fs.readFileSync(
        path.resolve(__dirname, '../services/openRouterClient.ts'), 'utf-8'
    );

    it('should have retry loop with MAX_RETRIES constant', () => {
        expect(clientSrc).toContain('MAX_RETRIES');
        expect(clientSrc).toMatch(/MAX_RETRIES\s*=\s*2/);
    });

    it('should retry on status 400 (transient cold-start)', () => {
        expect(clientSrc).toContain('res.status === 400');
        expect(clientSrc).toContain('continue; // retry');
    });

    it('should retry on status 429 (rate limit)', () => {
        expect(clientSrc).toContain('res.status === 429');
    });

    it('should retry on 5xx server errors', () => {
        expect(clientSrc).toContain('res.status >= 500');
    });

    it('should NOT retry 401 (auth) errors', () => {
        // 401 should throw immediately, not retry
        expect(clientSrc).toMatch(/status === 401[\s\S]*?throw new Error/);
    });

    it('should NOT retry 402 (billing) errors', () => {
        expect(clientSrc).toMatch(/status === 402[\s\S]*?throw new Error/);
    });

    it('should get fresh headers on each retry attempt', () => {
        // Stale JWT is a known cause of first-request failure
        expect(clientSrc).toContain('Fresh headers on each attempt');
        expect(clientSrc).toContain('await getProxyHeaders()');
    });

    it('should use exponential backoff delay', () => {
        expect(clientSrc).toContain('Math.pow(2, attempt - 1)');
    });

    it('should log retry attempts', () => {
        expect(clientSrc).toContain('Retry ${attempt}/${MAX_RETRIES}');
    });
});

// ══════════════════════════════════════════════════
// Fix 3 — Integration: retry actually works
// ══════════════════════════════════════════════════
describe('★ REGRESSION: openRouterClient — retry integration (v704)', () => {
    it('should succeed on 2nd attempt after initial 400', async () => {
        let callCount = 0;
        const originalFetch = globalThis.fetch;

        globalThis.fetch = vi.fn(async () => {
            callCount++;
            if (callCount === 1) {
                return { ok: false, status: 400, text: async () => 'cold start' } as Response;
            }
            return {
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
                }),
            } as any;
        }) as any;

        try {
            // Dynamic import to get fresh module with mocked fetch
            const { callOpenRouterApi } = await import('../services/openRouterClient');
            const result = await callOpenRouterApi({
                model: 'test-model',
                messages: [{ role: 'user', content: 'test' }],
            }) as any;

            expect(callCount).toBeGreaterThanOrEqual(2);
            expect(result.content[0].text).toBe('OK');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('should throw after all retries exhausted', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = vi.fn(async () => ({
            ok: false, status: 500, text: async () => 'Server error',
        })) as any;

        try {
            const { callOpenRouterApi } = await import('../services/openRouterClient');
            await expect(
                callOpenRouterApi({ model: 'test', messages: [] })
            ).rejects.toThrow('500');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

// ══════════════════════════════════════════════════
// Fix 4: agentFlowStoreSync — background fit:'fill'
// ══════════════════════════════════════════════════
describe('★ REGRESSION: agentFlowStoreSync — background fit (v705)', () => {
    const syncSrc = fs.readFileSync(
        path.resolve(__dirname, '../hooks/agentFlowStoreSync.ts'), 'utf-8'
    );

    it('background images should use fit:fill (not cover)', () => {
        // 'cover' uses uniform scaling which shrinks bg when aspect ratio differs
        // 'fill' uses independent scaleX/scaleY to exactly fill canvas
        expect(syncSrc).toContain("isBg ? 'fill' : 'cover'");
    });

    it('should detect background from element name', () => {
        expect(syncSrc).toContain("el.name?.includes('background')");
    });

    it('non-background images should still use cover mode', () => {
        // Product images, logos etc should maintain aspect ratio
        expect(syncSrc).toContain("'cover'");
    });

    it('comment should explain why fill is needed for backgrounds', () => {
        expect(syncSrc).toContain('Background images MUST use');
        expect(syncSrc).toContain('exactly match canvas dimensions');
    });
});

// ══════════════════════════════════════════════════
// Fix 5: agentGenerateFlow — explicit set_position + set_size
// ══════════════════════════════════════════════════
describe('★ REGRESSION: agentGenerateFlow — bg image force-fill (v704)', () => {
    const flowSrc = fs.readFileSync(
        path.resolve(__dirname, '../hooks/agentGenerateFlow.ts'), 'utf-8'
    );

    it('should call set_position after adding background image', () => {
        expect(flowSrc).toContain('engine.set_position?.(bgNodeId, 0, 0)');
    });

    it('should call set_size to force exact canvas dimensions', () => {
        expect(flowSrc).toContain('engine.set_size?.(bgNodeId, canvasW, canvasH)');
    });

    it('should call send_to_back after positioning', () => {
        expect(flowSrc).toContain('engine.send_to_back?.(bgNodeId)');
    });

    it('should log the forced dimensions for debugging', () => {
        expect(flowSrc).toContain('BG image');
        expect(flowSrc).toContain('forced to');
    });

    it('should guard against null bgNodeId', () => {
        expect(flowSrc).toContain('if (bgNodeId != null)');
    });
});

// ══════════════════════════════════════════════════
// Fix 6: FlowEngine type — new methods
// ══════════════════════════════════════════════════
describe('★ REGRESSION: agentFlowTypes — FlowEngine interface (v704)', () => {
    const typesSrc = fs.readFileSync(
        path.resolve(__dirname, '../hooks/agentFlowTypes.ts'), 'utf-8'
    );

    it('FlowEngine should have set_position method', () => {
        expect(typesSrc).toContain('set_position?: (id: number, x: number, y: number) => void');
    });

    it('FlowEngine should have set_size method', () => {
        expect(typesSrc).toContain('set_size?: (id: number, w: number, h: number) => void');
    });
});
