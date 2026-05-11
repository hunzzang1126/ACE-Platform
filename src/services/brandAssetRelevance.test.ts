// ─────────────────────────────────────────────────
// Brand Asset Relevance — Test Suite
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    detectVisualIntent,
    classifyAssetStyle,
    computeTopicScore,
    computeStyleScore,
    detectOverrides,
    preScoreAsset,
    preScoreAllAssets,
    extractKeywords,
} from './brandAssetRelevance';
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

// GGPoker brand assets
const ggpokerLogo = makeAsset({ name: 'ggpoker_logo', category: 'logo', tags: ['poker', 'gaming', 'ggpoker'] });
const darkGraphicBg = makeAsset({ name: 'dark_neon_bg', category: 'background', tags: ['dark', 'abstract', 'neon', 'graphic'] });
const pokerChips = makeAsset({ name: 'poker_chips', category: 'product', tags: ['poker', 'chips', 'casino'] });
const pokerFelt = makeAsset({ name: 'poker_table_texture', category: 'texture', tags: ['poker', 'felt', 'green'] });

// TechCorp assets
const techLogo = makeAsset({ name: 'techcorp_logo', category: 'logo', tags: ['tech', 'software'] });
const serverRoomBg = makeAsset({ name: 'server_room', category: 'photo', tags: ['server', 'data', 'tech', 'datacenter'] });

// CafeX assets
const cafeLogo = makeAsset({ name: 'cafex_logo', category: 'logo', tags: ['coffee', 'cafe'] });
const cafeBg = makeAsset({ name: 'cafe_interior', category: 'photo', tags: ['cafe', 'coffee', 'interior', 'cozy'] });
const coffeeCup = makeAsset({ name: 'coffee_cup', category: 'product', tags: ['coffee', 'latte', 'cup'] });

// Asset with no tags
const untaggedBg = makeAsset({ name: 'background_1', category: 'background', tags: [] });

// ── Visual Intent Detection ──

describe('detectVisualIntent', () => {
    it('detects photographic intent', () => {
        expect(detectVisualIntent('live poker footage ad')).toBe('photographic');
        expect(detectVisualIntent('real photo of beach')).toBe('photographic');
        expect(detectVisualIntent('라이브 포커 사진')).toBe('photographic');
        expect(detectVisualIntent('cinematic shot')).toBe('photographic');
    });

    it('detects graphic intent', () => {
        expect(detectVisualIntent('graphic design poster')).toBe('graphic');
        expect(detectVisualIntent('flat illustration banner')).toBe('graphic');
        expect(detectVisualIntent('그래픽 디자인 배너')).toBe('graphic');
    });

    it('detects abstract intent', () => {
        expect(detectVisualIntent('gradient background ad')).toBe('abstract');
        expect(detectVisualIntent('geometric pattern design')).toBe('abstract');
    });

    it('returns any for unspecified intent', () => {
        expect(detectVisualIntent('summer sale ad')).toBe('any');
        expect(detectVisualIntent('여름 세일 광고')).toBe('any');
        expect(detectVisualIntent('poker tournament')).toBe('any');
    });
});

// ── Asset Style Classification ──

describe('classifyAssetStyle', () => {
    it('classifies photo category as photographic', () => {
        expect(classifyAssetStyle(serverRoomBg)).toBe('photographic');
        expect(classifyAssetStyle(cafeBg)).toBe('photographic');
    });

    it('classifies icon category as graphic', () => {
        const icon = makeAsset({ name: 'arrow', category: 'icon', tags: ['ui'] });
        expect(classifyAssetStyle(icon)).toBe('graphic');
    });

    it('classifies by tags when category is generic', () => {
        expect(classifyAssetStyle(darkGraphicBg)).toBe('graphic'); // tags: abstract, graphic
        expect(classifyAssetStyle(pokerFelt)).toBe('abstract'); // texture category
    });

    it('classifies product as photographic by default', () => {
        expect(classifyAssetStyle(pokerChips)).toBe('photographic');
    });
});

// ── Topic Score ──

describe('computeTopicScore', () => {
    it('scores high for matching topics', () => {
        const score = computeTopicScore('poker tournament ad', pokerChips);
        expect(score).toBeGreaterThan(0.3); // "poker" matches
    });

    it('scores zero for completely unrelated', () => {
        const score = computeTopicScore('Mallorca travel beach vacation', darkGraphicBg);
        expect(score).toBe(0); // no tag overlap
    });

    it('scores based on keyword overlap ratio', () => {
        const scoreLow = computeTopicScore('summer beach travel poker', pokerChips);
        const scoreHigh = computeTopicScore('poker chips casino bet', pokerChips);
        expect(scoreHigh).toBeGreaterThan(scoreLow);
    });

    it('handles Korean prompts with Korean tags', () => {
        // Tags must be in Korean for Korean prompt matching
        const koreanCoffee = makeAsset({ name: 'coffee', category: 'product', tags: ['커피', '라떼', '음료'] });
        const score = computeTopicScore('커피 라떼 메뉴판', koreanCoffee);
        expect(score).toBeGreaterThan(0);
    });

    it('returns 0 for empty tags', () => {
        const score = computeTopicScore('anything here', untaggedBg);
        expect(score).toBe(0);
    });
});

// ── Style Score ──

describe('computeStyleScore', () => {
    it('perfect match = 1.0', () => {
        expect(computeStyleScore('photographic', 'photographic')).toBe(1.0);
        expect(computeStyleScore('graphic', 'graphic')).toBe(1.0);
    });

    it('any intent = 0.8 (user doesnt care)', () => {
        expect(computeStyleScore('any', 'photographic')).toBe(0.8);
        expect(computeStyleScore('any', 'graphic')).toBe(0.8);
    });

    it('mismatch = 0.1', () => {
        expect(computeStyleScore('photographic', 'graphic')).toBe(0.1);
        expect(computeStyleScore('graphic', 'photographic')).toBe(0.1);
    });

    it('flexible asset (any) = 0.6', () => {
        expect(computeStyleScore('photographic', 'any')).toBe(0.6);
    });
});

// ── Override Detection ──

describe('detectOverrides', () => {
    it('detects logo exclusion', () => {
        expect(detectOverrides('no logo please').excludeLogo).toBe(true);
        expect(detectOverrides('로고 빼줘').excludeLogo).toBe(true);
        expect(detectOverrides('make a poker ad').excludeLogo).toBe(false);
    });

    it('detects forced brand background', () => {
        expect(detectOverrides('use brand background').forceBrandBg).toBe(true);
        expect(detectOverrides('브랜드 배경 써줘').forceBrandBg).toBe(true);
        expect(detectOverrides('make a poker ad').forceBrandBg).toBe(false);
    });
});

// ── Pre-Score: Logo ──

describe('preScoreAsset — Logo', () => {
    it('logo always has confidence=high, decision=use', () => {
        const result = preScoreAsset('random topic unrelated', ggpokerLogo);
        expect(result.confidence).toBe('high');
        expect(result.codeDecision).toBe('use');
    });

    it('logo excluded when user says no logo', () => {
        const result = preScoreAsset('poker ad no logo', ggpokerLogo);
        expect(result.confidence).toBe('high');
        expect(result.codeDecision).toBe('skip');
    });
});

// ── Pre-Score: GGPoker Scenario ──

describe('preScoreAsset — GGPoker live footage scenario', () => {
    const prompt = 'live poker footage ad for GGPoker tournament';

    it('dark_neon_bg: ambiguous (topic low, graphic≠photographic)', () => {
        const result = preScoreAsset(prompt, darkGraphicBg);
        // Topic: "poker" not in tags ["dark","abstract","neon","graphic"] → low
        // This should be ambiguous or skip
        expect(result.codeDecision).not.toBe('use');
    });

    it('poker_chips: ambiguous or use (topic matches poker)', () => {
        const result = preScoreAsset(prompt, pokerChips);
        // Topic: "poker" in tags → match
        expect(result.topicScore).toBeGreaterThan(0);
    });
});

// ── Pre-Score: TechCorp Travel Scenario ──

describe('preScoreAsset — TechCorp Mallorca travel', () => {
    const prompt = 'Mallorca travel beach vacation ad';

    it('server_room: skip (no topic overlap)', () => {
        const result = preScoreAsset(prompt, serverRoomBg);
        // tags: ["server","data","tech","datacenter"] → no match with travel/beach
        expect(result.topicScore).toBe(0);
        expect(result.codeDecision).toBe('skip');
        expect(result.confidence).toBe('high');
    });

    it('techcorp logo: always use', () => {
        const result = preScoreAsset(prompt, techLogo);
        expect(result.codeDecision).toBe('use');
    });
});

// ── Pre-Score: CafeX Coffee Scenario ──

describe('preScoreAsset — CafeX coffee menu', () => {
    const prompt = 'coffee latte menu board ad';

    it('cafe_interior: topic partially matches', () => {
        const result = preScoreAsset(prompt, cafeBg);
        // "coffee" matches 1 of tags → topic > 0
        expect(result.topicScore).toBeGreaterThan(0);
    });

    it('coffee_cup: likely use (topic match)', () => {
        const result = preScoreAsset(prompt, coffeeCup);
        expect(result.topicScore).toBeGreaterThan(0.3);
    });
});

// ── Pre-Score All: Batch Classification ──

describe('preScoreAllAssets', () => {
    it('separates decided from ambiguous', () => {
        const allAssets = [ggpokerLogo, darkGraphicBg, pokerChips, pokerFelt];
        const { decided, ambiguous } = preScoreAllAssets('live poker footage', allAssets);

        // Logo should be in decided (always use)
        expect(decided.some(d => d.asset.category === 'logo')).toBe(true);

        // Total = decided + ambiguous should equal non-deleted assets
        expect(decided.length + ambiguous.length).toBe(allAssets.length);
    });

    it('skips soft-deleted assets', () => {
        const deletedAsset = makeAsset({ name: 'deleted', category: 'photo', tags: ['test'], deletedAt: '2026-01-01' });
        const { decided, ambiguous } = preScoreAllAssets('test', [deletedAsset, ggpokerLogo]);
        expect(decided.length + ambiguous.length).toBe(1); // Only logo, deleted skipped
    });

    it('all decided when brand has only logos', () => {
        const { decided, ambiguous } = preScoreAllAssets('anything', [ggpokerLogo, techLogo]);
        expect(decided.length).toBe(2);
        expect(ambiguous.length).toBe(0);
    });

    it('force brand bg overrides to decided', () => {
        const { decided } = preScoreAllAssets('브랜드 배경 써줘', [darkGraphicBg]);
        expect(decided.length).toBe(1);
        expect(decided[0]!.codeDecision).toBe('use');
    });
});

// ── extractKeywords ──

describe('extractKeywords', () => {
    it('extracts meaningful words', () => {
        const kw = extractKeywords('live poker footage ad');
        expect(kw).toContain('live');
        expect(kw).toContain('poker');
        expect(kw).toContain('footage');
    });

    it('filters stopwords', () => {
        const kw = extractKeywords('make a good design for this');
        expect(kw).not.toContain('make');
        expect(kw).not.toContain('good');
        expect(kw).not.toContain('design');
    });

    it('handles Korean', () => {
        const kw = extractKeywords('포커 대회 라이브');
        expect(kw).toContain('포커');
        expect(kw).toContain('대회');
        expect(kw).toContain('라이브');
    });
});
