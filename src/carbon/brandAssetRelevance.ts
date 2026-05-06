// ─────────────────────────────────────────────────
// Brand Asset Relevance — Code-Based Pre-Scoring (Layer 1)
// ─────────────────────────────────────────────────
// Evaluates brand assets against user prompt using keyword
// matching + style intent detection. Obvious cases are decided
// instantly (confidence='high'). Ambiguous cases are deferred
// to AI (confidence='low').
//
// Pattern: Same as backgroundImageDecider.ts
//   Code handles ~70% of cases (free, instant)
//   AI handles ~30% ambiguous cases (1 API call)
// ─────────────────────────────────────────────────

import type { BrandAsset, AssetCategory } from '@/stores/brandKitStore';

// ── Types ──

export type VisualIntent = 'photographic' | 'graphic' | 'abstract' | 'any';

export interface AssetPreScore {
    asset: BrandAsset;
    topicScore: number;       // 0-1: tag/name overlap with prompt
    styleScore: number;       // 0-1: visual style match
    confidence: 'high' | 'low';
    codeDecision: 'use' | 'skip' | 'ask-ai';
    reasoning: string;
}

// ── Visual Intent Detection ──

const PHOTO_KEYWORDS = [
    'photo', 'photograph', 'footage', 'real', 'realistic', 'cinematic',
    'live', 'shot', 'candid', 'portrait', 'landscape',
    '사진', '실사', '촬영', '라이브', '포토', '풍경',
];

const GRAPHIC_KEYWORDS = [
    'graphic', 'illustration', 'illustrate', 'cartoon', 'vector',
    'flat', 'minimal', 'icon', 'draw', 'sketch',
    '그래픽', '일러스트', '벡터', '만화', '아이콘', '디자인',
];

const ABSTRACT_KEYWORDS = [
    'gradient', 'abstract', 'geometric', 'pattern', 'texture',
    '그라데이션', '추상', '기하학', '패턴', '텍스처',
];

/** Detect what visual style the user wants from their prompt */
export function detectVisualIntent(prompt: string): VisualIntent {
    const lower = prompt.toLowerCase();
    const photoHits = PHOTO_KEYWORDS.filter(k => lower.includes(k)).length;
    const graphicHits = GRAPHIC_KEYWORDS.filter(k => lower.includes(k)).length;
    const abstractHits = ABSTRACT_KEYWORDS.filter(k => lower.includes(k)).length;

    if (photoHits > graphicHits && photoHits > abstractHits) return 'photographic';
    if (graphicHits > photoHits && graphicHits > abstractHits) return 'graphic';
    if (abstractHits > photoHits && abstractHits > graphicHits) return 'abstract';
    return 'any';
}

// ── Asset Style Classification ──

const PHOTO_CATEGORIES: AssetCategory[] = ['photo'];
const GRAPHIC_CATEGORIES: AssetCategory[] = ['icon'];
const PHOTO_TAG_HINTS = ['photo', 'real', 'shot', 'cinematic', 'portrait', 'landscape', '사진', '실사'];
const GRAPHIC_TAG_HINTS = ['graphic', 'abstract', 'neon', 'flat', 'vector', 'illustration', '그래픽', '일러스트'];
const ABSTRACT_TAG_HINTS = ['gradient', 'pattern', 'texture', 'geometric', '그라데이션', '패턴'];

/** Classify what visual style a brand asset represents */
export function classifyAssetStyle(asset: BrandAsset): VisualIntent {
    if (PHOTO_CATEGORIES.includes(asset.category)) return 'photographic';
    if (GRAPHIC_CATEGORIES.includes(asset.category)) return 'graphic';

    const tags = asset.tags.map(t => t.toLowerCase());
    const photoHits = PHOTO_TAG_HINTS.filter(h => tags.some(t => t.includes(h))).length;
    const graphicHits = GRAPHIC_TAG_HINTS.filter(h => tags.some(t => t.includes(h))).length;
    const abstractHits = ABSTRACT_TAG_HINTS.filter(h => tags.some(t => t.includes(h))).length;

    if (photoHits > graphicHits && photoHits > abstractHits) return 'photographic';
    if (graphicHits > photoHits && graphicHits > abstractHits) return 'graphic';
    if (abstractHits > 0) return 'abstract';

    // Default by category
    if (asset.category === 'background') return 'any';
    if (asset.category === 'texture') return 'abstract';
    if (asset.category === 'product') return 'photographic';
    return 'any';
}

// ── Topic Score (Tag ↔ Prompt Keyword Match) ──

/** Extract meaningful keywords from prompt (3+ chars, no stopwords) */
export function extractKeywords(text: string): string[] {
    const stopwords = new Set([
        'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'make',
        'create', 'design', 'please', 'want', 'need', 'like', 'good', 'best',
        '만들어', '만들어줘', '해줘', '주세요', '광고', '디자인', '느낌',
        '좋은', '이쁜', '예쁜', '멋진',
    ]);
    return text.toLowerCase()
        .split(/[\s,.\-_!?;:'"()\[\]{}]+/)
        .filter(w => w.length >= 2 && !stopwords.has(w));
}

/** Compute topic relevance: how much do asset tags overlap with prompt keywords? */
export function computeTopicScore(prompt: string, asset: BrandAsset): number {
    const promptWords = extractKeywords(prompt);
    if (promptWords.length === 0) return 0;

    const assetWords = [
        ...asset.tags.map(t => t.toLowerCase()),
        ...asset.name.toLowerCase().split(/[\s_\-]+/).filter(w => w.length >= 2),
        asset.role?.toLowerCase() ?? '',
    ].filter(Boolean);

    if (assetWords.length === 0) return 0;

    // Bidirectional matching: prompt word in asset word OR asset word in prompt word
    let matches = 0;
    for (const pw of promptWords) {
        for (const aw of assetWords) {
            if (pw.includes(aw) || aw.includes(pw)) {
                matches++;
                break; // Count each prompt word once
            }
        }
    }

    // Normalize by prompt words (what % of prompt is matched)
    return Math.min(1, matches / Math.max(1, Math.min(promptWords.length, 5)));
}

// ── Style Score ──

/** How well does the asset's visual style match the prompt's intent? */
export function computeStyleScore(promptIntent: VisualIntent, assetStyle: VisualIntent): number {
    if (promptIntent === 'any') return 0.8; // User doesn't care → most assets OK
    if (promptIntent === assetStyle) return 1.0; // Perfect match
    if (assetStyle === 'any') return 0.6; // Asset is flexible
    // Mismatch: photographic ≠ graphic, etc.
    return 0.1;
}

// ── Explicit Override Detection ──

const EXCLUDE_LOGO = ['no logo', 'without logo', 'remove logo', '로고 빼', '로고 없이', '로고 제거'];
const FORCE_BRAND_BG = ['brand background', 'use brand bg', '브랜드 배경', '브랜드 배경 써'];

export function detectOverrides(prompt: string): { excludeLogo: boolean; forceBrandBg: boolean } {
    const lower = prompt.toLowerCase();
    return {
        excludeLogo: EXCLUDE_LOGO.some(k => lower.includes(k)),
        forceBrandBg: FORCE_BRAND_BG.some(k => lower.includes(k)),
    };
}

// ── Pre-Score Single Asset ──

export function preScoreAsset(prompt: string, asset: BrandAsset): AssetPreScore {
    const overrides = detectOverrides(prompt);
    const intent = detectVisualIntent(prompt);

    // ★ Logo: always use (unless explicitly excluded)
    if (asset.category === 'logo') {
        if (overrides.excludeLogo) {
            return { asset, topicScore: 0, styleScore: 0, confidence: 'high', codeDecision: 'skip', reasoning: 'Logo explicitly excluded by user' };
        }
        return { asset, topicScore: 1, styleScore: 1, confidence: 'high', codeDecision: 'use', reasoning: 'Logo always included for brand identity' };
    }

    const topicScore = computeTopicScore(prompt, asset);
    const assetStyle = classifyAssetStyle(asset);
    const styleScore = computeStyleScore(intent, assetStyle);

    // ★ Force brand background if user explicitly requested
    if (overrides.forceBrandBg && (asset.category === 'background' || asset.category === 'photo' || asset.category === 'texture')) {
        return { asset, topicScore, styleScore, confidence: 'high', codeDecision: 'use', reasoning: 'Brand background forced by user request' };
    }

    // ★ High confidence decisions (no AI needed)
    if (topicScore === 0 && asset.tags.length >= 2) {
        return { asset, topicScore, styleScore, confidence: 'high', codeDecision: 'skip', reasoning: `No topic overlap (0/${asset.tags.length} tags match)` };
    }
    if (topicScore >= 0.7 && styleScore >= 0.7) {
        return { asset, topicScore, styleScore, confidence: 'high', codeDecision: 'use', reasoning: `Strong match: topic=${topicScore.toFixed(2)}, style=${styleScore.toFixed(2)}` };
    }

    // ★ Low confidence → ask AI
    return { asset, topicScore, styleScore, confidence: 'low', codeDecision: 'ask-ai', reasoning: `Ambiguous: topic=${topicScore.toFixed(2)}, style=${styleScore.toFixed(2)}` };
}

// ── Pre-Score All Assets ──

export function preScoreAllAssets(prompt: string, assets: BrandAsset[]): {
    decided: AssetPreScore[];
    ambiguous: AssetPreScore[];
} {
    const decided: AssetPreScore[] = [];
    const ambiguous: AssetPreScore[] = [];

    for (const asset of assets) {
        if (asset.deletedAt) continue; // Skip soft-deleted
        const score = preScoreAsset(prompt, asset);
        if (score.confidence === 'high') {
            decided.push(score);
        } else {
            ambiguous.push(score);
        }
    }

    return { decided, ambiguous };
}
