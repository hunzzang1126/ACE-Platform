// ─────────────────────────────────────────────────
// Brand Asset AI + Selector — Test Suite
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { parseAIResponse } from './brandAssetAI';
import { mergeDecisions } from './brandAssetSelector';
import type { AssetPreScore } from './brandAssetRelevance';
import type { BrandAsset } from '@/stores/brandKitStore';

// ── Fixtures ──

function makeAsset(overrides: Partial<BrandAsset> & { name: string; category: BrandAsset['category'] }): BrandAsset {
    return {
        id: `test-${overrides.name}`,
        tags: [],
        role: null,
        src: 'data:image/png;base64,test',
        thumbSrc: '',
        width: 200,
        height: 200,
        format: 'png',
        sizeBytes: 1000,
        hash: 'test-hash',
        uploadedAt: '2026-01-01',
        usageCount: 0,
        isFavorite: false,
        deletedAt: null,
        metadata: { hasTransparency: false, dominantColors: [], suggestedPlacement: null },
        ...overrides,
    };
}

// ── parseAIResponse ──

describe('parseAIResponse', () => {
    it('parses valid JSON response', () => {
        const raw = JSON.stringify({
            decisions: [
                { assetId: 'test-bg', decision: 'skip', role: 'none', reasoning: 'Style mismatch' },
                { assetId: 'test-chips', decision: 'use', role: 'product', reasoning: 'Topic match' },
            ],
        });
        const result = parseAIResponse(raw);
        expect(result).toHaveLength(2);
        expect(result[0]!.decision).toBe('skip');
        expect(result[1]!.decision).toBe('use');
        expect(result[1]!.role).toBe('product');
    });

    it('handles markdown-wrapped JSON', () => {
        const raw = '```json\n{"decisions":[{"assetId":"a","decision":"use","role":"background","reasoning":"ok"}]}\n```';
        const result = parseAIResponse(raw);
        expect(result).toHaveLength(1);
        expect(result[0]!.decision).toBe('use');
    });

    it('returns empty array for invalid JSON', () => {
        expect(parseAIResponse('not json at all')).toEqual([]);
        expect(parseAIResponse('')).toEqual([]);
    });

    it('normalizes invalid decision values to skip', () => {
        const raw = JSON.stringify({ decisions: [{ assetId: 'x', decision: 'maybe', role: 'unknown', reasoning: 'hmm' }] });
        const result = parseAIResponse(raw);
        expect(result[0]!.decision).toBe('skip');
        expect(result[0]!.role).toBe('none');
    });
});

// ── mergeDecisions ──

describe('mergeDecisions', () => {
    const logo = makeAsset({ name: 'logo', category: 'logo', tags: ['brand'] });
    const bg = makeAsset({ name: 'bg', category: 'background', tags: ['dark'] });
    const product = makeAsset({ name: 'chips', category: 'product', tags: ['poker'] });

    it('assigns logo from decided list', () => {
        const decided: AssetPreScore[] = [
            { asset: logo, topicScore: 1, styleScore: 1, confidence: 'high', codeDecision: 'use', reasoning: 'Logo always' },
        ];
        const result = mergeDecisions(decided, [], []);
        expect(result.logo).toBeDefined();
        expect(result.logo!.name).toBe('logo');
    });

    it('skips decided assets with skip decision', () => {
        const decided: AssetPreScore[] = [
            { asset: bg, topicScore: 0, styleScore: 0, confidence: 'high', codeDecision: 'skip', reasoning: 'No match' },
        ];
        const result = mergeDecisions(decided, [], []);
        expect(result.background).toBeNull();
        expect(result.skippedAssets).toHaveLength(1);
        expect(result.needsGeneratedBackground).toBe(true);
    });

    it('uses AI decisions for ambiguous assets', () => {
        const ambiguous: AssetPreScore[] = [
            { asset: product, topicScore: 0.4, styleScore: 0.5, confidence: 'low', codeDecision: 'ask-ai', reasoning: 'Ambiguous' },
        ];
        const aiDecisions = [
            { assetId: 'test-chips', decision: 'use' as const, role: 'product' as const, reasoning: 'Poker chips fit the theme' },
        ];
        const result = mergeDecisions([], aiDecisions, ambiguous);
        expect(result.productImages).toHaveLength(1);
        expect(result.productImages[0]!.reasoning).toContain('Poker chips');
    });

    it('skips ambiguous assets with no AI response', () => {
        const ambiguous: AssetPreScore[] = [
            { asset: bg, topicScore: 0.3, styleScore: 0.2, confidence: 'low', codeDecision: 'ask-ai', reasoning: 'Ambiguous' },
        ];
        const result = mergeDecisions([], [], ambiguous);
        expect(result.background).toBeNull();
        expect(result.skippedAssets).toHaveLength(1);
    });

    it('sets needsGeneratedBackground=false when bg found', () => {
        const decided: AssetPreScore[] = [
            { asset: bg, topicScore: 0.8, styleScore: 0.9, confidence: 'high', codeDecision: 'use', reasoning: 'Strong match' },
        ];
        const result = mergeDecisions(decided, [], []);
        expect(result.background).not.toBeNull();
        expect(result.needsGeneratedBackground).toBe(false);
    });

    it('GGPoker scenario: logo=use, graphic bg=skip by AI, chips=use by AI', () => {
        const ggLogo = makeAsset({ name: 'gg_logo', category: 'logo', tags: ['poker'] });
        const ggBg = makeAsset({ name: 'dark_bg', category: 'background', tags: ['dark', 'abstract'] });
        const ggChips = makeAsset({ name: 'chips', category: 'product', tags: ['poker', 'chips'] });

        const decided: AssetPreScore[] = [
            { asset: ggLogo, topicScore: 1, styleScore: 1, confidence: 'high', codeDecision: 'use', reasoning: 'Logo always' },
        ];
        const ambiguous: AssetPreScore[] = [
            { asset: ggBg, topicScore: 0.15, styleScore: 0.1, confidence: 'low', codeDecision: 'ask-ai', reasoning: 'Ambiguous' },
            { asset: ggChips, topicScore: 0.5, styleScore: 0.4, confidence: 'low', codeDecision: 'ask-ai', reasoning: 'Ambiguous' },
        ];
        const aiDecisions = [
            { assetId: 'test-dark_bg', decision: 'skip' as const, role: 'none' as const, reasoning: 'Abstract graphic doesnt match live footage' },
            { assetId: 'test-chips', decision: 'use' as const, role: 'product' as const, reasoning: 'Poker chips complement scene' },
        ];

        const result = mergeDecisions(decided, aiDecisions, ambiguous);

        expect(result.logo!.name).toBe('gg_logo');
        expect(result.background).toBeNull();
        expect(result.needsGeneratedBackground).toBe(true);
        expect(result.productImages).toHaveLength(1);
        expect(result.skippedAssets).toHaveLength(1);
        expect(result.skippedAssets[0]!.asset.name).toBe('dark_bg');
    });
});
