// ─────────────────────────────────────────────────
// Brand Asset AI — Smart Asset Analysis (Layer 2)
// ─────────────────────────────────────────────────
// Handles AMBIGUOUS assets that Layer 1 (code) couldn't decide.
// Makes 1 API call with all ambiguous assets for token efficiency.
//
// Only called when ambiguous.length > 0 — if code decides
// everything, this module is never invoked (0 tokens).
// ─────────────────────────────────────────────────

import type { AssetPreScore } from './brandAssetRelevance';
import { resilientImport } from '@/utils/resilientImport';

// ── Types ──

export interface AIAssetDecision {
    assetId: string;
    decision: 'use' | 'skip';
    role: 'background' | 'product' | 'decoration' | 'none';
    reasoning: string;
    placementHint?: 'fill' | 'center' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// ── System Prompt ──

const SYSTEM_PROMPT = `You are a creative director deciding which brand assets to use in an ad design.
For each candidate asset, decide whether to USE or SKIP it.
Consider:
- Does the asset's SUBJECT match what the ad is about?
- Does the asset's VISUAL STYLE match the intended mood?
- Would using this asset improve or hurt the design quality?

Respond ONLY with valid JSON (no markdown fences):
{"decisions":[{"assetId":"...","decision":"use"|"skip","role":"background"|"product"|"decoration"|"none","reasoning":"..."}]}`;

// ── Build User Prompt ──

function buildUserPrompt(
    prompt: string,
    brandContext: string,
    ambiguousAssets: AssetPreScore[],
    canvasW: number,
    canvasH: number,
): string {
    const assetDescriptions = ambiguousAssets.map((a, i) => {
        const tags = a.asset.tags.length > 0 ? a.asset.tags.join(', ') : 'no tags';
        return [
            `${i + 1}. "${a.asset.name}" — category: ${a.asset.category}, tags: [${tags}]`,
            `   Size: ${a.asset.width}x${a.asset.height}, Format: ${a.asset.format}`,
            `   Code scores: topic=${a.topicScore.toFixed(2)}, style=${a.styleScore.toFixed(2)} (ambiguous)`,
        ].join('\n');
    }).join('\n\n');

    return [
        `BRAND CONTEXT:\n${brandContext || 'No brand info available'}`,
        `\nCANVAS: ${canvasW}x${canvasH}`,
        `\nUSER REQUEST: "${prompt}"`,
        `\nCANDIDATE ASSETS (need your decision):\n${assetDescriptions}`,
    ].join('\n');
}

// ── Parse AI Response ──

export function parseAIResponse(raw: string): AIAssetDecision[] {
    try {
        // Strip markdown fences if present
        const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const decisions = parsed.decisions ?? parsed;

        if (!Array.isArray(decisions)) return [];

        return decisions
            .filter((d: any) => d.assetId && d.decision)
            .map((d: any) => ({
                assetId: String(d.assetId),
                decision: d.decision === 'use' ? 'use' : 'skip',
                role: ['background', 'product', 'decoration', 'none'].includes(d.role) ? d.role : 'none',
                reasoning: String(d.reasoning || 'No reasoning provided'),
                placementHint: d.placementHint,
            }));
    } catch {
        console.warn('[BrandAssetAI] Failed to parse AI response');
        return [];
    }
}

// ── Main: AI Analyze Brand Assets ──

export async function aiAnalyzeBrandAssets(
    prompt: string,
    brandContext: string,
    ambiguousAssets: AssetPreScore[],
    canvasW: number,
    canvasH: number,
    signal?: AbortSignal,
): Promise<AIAssetDecision[]> {
    if (ambiguousAssets.length === 0) return [];

    try {
        const { callOpenRouter } = await resilientImport(
            () => import('@/services/openRouterClient'),
        );

        const userPrompt = buildUserPrompt(prompt, brandContext, ambiguousAssets, canvasW, canvasH);

        const response = await callOpenRouter({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.2, // Low temp for consistent decisions
            max_tokens: 500,  // Structured JSON is compact
            signal,
        });

        const text = typeof response === 'string' ? response : response?.content ?? '';
        const decisions = parseAIResponse(text);

        console.log(`[BrandAssetAI] ${decisions.length} decisions from AI for ${ambiguousAssets.length} assets`);
        return decisions;
    } catch (err) {
        console.warn('[BrandAssetAI] AI analysis failed, defaulting to skip:', err);
        // Fallback: skip all ambiguous assets (safe default)
        return ambiguousAssets.map(a => ({
            assetId: a.asset.id,
            decision: 'skip' as const,
            role: 'none' as const,
            reasoning: 'AI analysis unavailable — skipping to be safe',
        }));
    }
}
