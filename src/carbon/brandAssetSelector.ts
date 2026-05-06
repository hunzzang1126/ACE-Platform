// ─────────────────────────────────────────────────
// Brand Asset Selector — Final Selection (Layer 1 + Layer 2)
// ─────────────────────────────────────────────────
// Merges code pre-scores (Layer 1) with AI decisions (Layer 2)
// to produce the final set of assets to use in design generation.
//
// Flow:
//   1. preScoreAllAssets() → decided[] + ambiguous[]
//   2. aiAnalyzeBrandAssets(ambiguous) → AI decisions
//   3. mergeDecisions() → AssetSelection
// ─────────────────────────────────────────────────

import type { BrandAsset } from '@/stores/brandKitStore';
import type { AssetPreScore } from './brandAssetRelevance';
import { preScoreAllAssets } from './brandAssetRelevance';
import type { AIAssetDecision } from './brandAssetAI';
import { aiAnalyzeBrandAssets } from './brandAssetAI';

// ── Types ──

export interface SelectedAsset {
    asset: BrandAsset;
    role: 'background' | 'product' | 'decoration';
    reasoning: string;
    placementHint?: string;
}

export interface AssetSelection {
    logo: BrandAsset | null;
    background: SelectedAsset | null;
    productImages: SelectedAsset[];
    decorations: SelectedAsset[];
    needsGeneratedBackground: boolean;
    skippedAssets: { asset: BrandAsset; reasoning: string }[];
}

// ── Merge Logic ──

export function mergeDecisions(
    decided: AssetPreScore[],
    aiDecisions: AIAssetDecision[],
    ambiguous: AssetPreScore[],
): AssetSelection {
    const selection: AssetSelection = {
        logo: null,
        background: null,
        productImages: [],
        decorations: [],
        needsGeneratedBackground: true,
        skippedAssets: [],
    };

    // Process code-decided assets
    for (const d of decided) {
        if (d.codeDecision === 'use') {
            assignAsset(selection, d.asset, inferRole(d.asset), d.reasoning);
        } else {
            selection.skippedAssets.push({ asset: d.asset, reasoning: d.reasoning });
        }
    }

    // Process AI-decided assets (match by assetId)
    const aiMap = new Map(aiDecisions.map(d => [d.assetId, d]));
    for (const a of ambiguous) {
        const aiResult = aiMap.get(a.asset.id);
        if (aiResult && aiResult.decision === 'use') {
            const role = aiResult.role === 'none' ? inferRole(a.asset) : aiResult.role;
            assignAsset(selection, a.asset, role, `AI: ${aiResult.reasoning}`, aiResult.placementHint);
        } else {
            const reason = aiResult
                ? `AI: ${aiResult.reasoning}`
                : `Ambiguous (topic=${a.topicScore.toFixed(2)}, style=${a.styleScore.toFixed(2)}) — defaulted to skip`;
            selection.skippedAssets.push({ asset: a.asset, reasoning: reason });
        }
    }

    // If we got a background asset, no need to generate one
    if (selection.background) {
        selection.needsGeneratedBackground = false;
    }

    return selection;
}

// ── Helpers ──

function inferRole(asset: BrandAsset): 'background' | 'product' | 'decoration' {
    if (asset.category === 'background' || asset.category === 'photo') return 'background';
    if (asset.category === 'product') return 'product';
    if (asset.category === 'texture') return 'decoration';
    return 'decoration';
}

function assignAsset(
    sel: AssetSelection,
    asset: BrandAsset,
    role: string,
    reasoning: string,
    placementHint?: string,
): void {
    if (asset.category === 'logo') {
        sel.logo = asset;
        return;
    }

    const selected: SelectedAsset = {
        asset,
        role: role as SelectedAsset['role'],
        reasoning,
        placementHint,
    };

    if (role === 'background') {
        // Only one background — keep highest priority (first found)
        if (!sel.background) sel.background = selected;
    } else if (role === 'product') {
        sel.productImages.push(selected);
    } else {
        sel.decorations.push(selected);
    }
}

// ── Main Entry Point ──

export async function selectBrandAssets(
    prompt: string,
    allAssets: BrandAsset[],
    brandContext: string,
    canvasW: number,
    canvasH: number,
    signal?: AbortSignal,
): Promise<AssetSelection> {
    const activeAssets = allAssets.filter(a => !a.deletedAt);
    if (activeAssets.length === 0) {
        return { logo: null, background: null, productImages: [], decorations: [], needsGeneratedBackground: true, skippedAssets: [] };
    }

    // Layer 1: Code pre-scoring
    const { decided, ambiguous } = preScoreAllAssets(prompt, activeAssets);

    // Layer 2: AI analysis (only if ambiguous assets exist)
    let aiDecisions: AIAssetDecision[] = [];
    if (ambiguous.length > 0) {
        console.log(`[BrandSelector] ${decided.length} decided by code, ${ambiguous.length} → AI`);
        aiDecisions = await aiAnalyzeBrandAssets(
            prompt, brandContext, ambiguous, canvasW, canvasH, signal,
        );
    } else {
        console.log(`[BrandSelector] All ${decided.length} assets decided by code (0 AI calls)`);
    }

    // Merge and return
    return mergeDecisions(decided, aiDecisions, ambiguous);
}
