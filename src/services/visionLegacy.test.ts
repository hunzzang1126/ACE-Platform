// ─────────────────────────────────────────────────
// visionLegacy.test.ts — Legacy vision check tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCallApi } = vi.hoisted(() => ({
    mockCallApi: vi.fn(),
}));

vi.mock('@/services/anthropicClient', () => ({
    callAnthropicApi: mockCallApi,
    DEFAULT_CLAUDE_MODEL: 'claude-3-haiku-20240307',
}));

import { callVisionCheck } from './visionLegacy';

function goodResponse() {
    return {
        content: [{ type: 'text', text: JSON.stringify({
            score: 85,
            issues: [{ element: 'CTA', problem: 'too_small', severity: 'warning', detail: 'CTA small' }],
            patches: [{ elementName: 'CTA', w: 150, h: 50 }],
            reasoning: 'CTA needs to be larger.',
        })}],
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockCallApi.mockResolvedValue(goodResponse());
});

describe('callVisionCheck', () => {
    it('returns parsed VisionResult', async () => {
        const r = await callVisionCheck('data:image/png;base64,abc', 300, 250, 'banner', [{ name: 'CTA', type: 'text', role: 'cta' }]);
        expect(r.score).toBe(85);
        expect(r.issues).toHaveLength(1);
        expect(r.patches).toHaveLength(1);
        expect(r.reasoning).toContain('CTA');
    });

    it('strips data: prefix from base64', async () => {
        await callVisionCheck('data:image/png;base64,abc123', 300, 250, 'banner', []);
        const body = mockCallApi.mock.calls[0][0];
        const imgContent = body.messages[0].content[0];
        expect(imgContent.source.data).toBe('abc123');
    });

    it('throws on non-JSON response', async () => {
        mockCallApi.mockResolvedValueOnce({
            content: [{ type: 'text', text: 'Sorry, unable to analyze.' }],
        });
        await expect(callVisionCheck('b64', 300, 250, 'banner', []))
            .rejects.toThrow('Vision API returned non-JSON');
    });

    it('includes canvas dims in prompt', async () => {
        await callVisionCheck('data:image/png;base64,x', 1920, 1080, 'hero', []);
        const body = mockCallApi.mock.calls[0][0];
        const txt = body.messages[0].content[1].text;
        expect(txt).toContain('1920x1080');
        expect(txt).toContain('hero');
    });
});
