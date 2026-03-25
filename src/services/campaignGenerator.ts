// ─────────────────────────────────────────────────
// campaignGenerator.ts — One-Click Campaign Kit
// ─────────────────────────────────────────────────
// Orchestrates multi-format creative generation:
//   1. Extract Campaign DNA (palette + copy + mood) from prompt
//   2. For each format in the pack, create a CreativeSet
//   3. Track progress in CampaignStore
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import { useCampaignStore } from '@/stores/campaignStore';
import { useDesignStore } from '@/stores/designStore';
import { getPackById, getDefaultPack } from '@/schema/campaignPacks';
import { getPresetById } from '@/schema/presets';
import type { CampaignDNA } from '@/schema/campaignTypes';
import type { BannerPreset } from '@/schema/design.types';

// ── Types ──

export interface CampaignGenerationResult {
    campaignId: string;
    success: boolean;
    message: string;
    creativeSetIds: string[];
}

// ── DNA Extraction ──

const DNA_PROMPT = `You are a creative director. Extract a campaign visual identity from this brief.

Return JSON only:
{
  "palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "copy": {
    "headline": "short punchy headline (max 6 words)",
    "subtext": "supporting text (max 15 words)",
    "cta": "call to action button text (max 3 words)"
  },
  "mood": "one word: premium|energetic|minimal|bold|elegant|playful|dark|warm",
  "season": "optional: black-friday|christmas|summer|spring|new-year|null"
}

Rules:
- Colors must be harmonious and professional
- Headline must be impactful and short
- CTA must be action-oriented
- The palette should match the mood
- Dark background + light text for premium/dark moods
- Light background + dark text for minimal/warm moods

Return ONLY the JSON object.`;

/**
 * Extract Campaign DNA from a user prompt using AI.
 */
export async function extractCampaignDNA(prompt: string): Promise<CampaignDNA> {
    const data = await callAnthropicApi({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 512,
        messages: [
            { role: 'user', content: `${DNA_PROMPT}\n\nBrief: "${prompt}"` },
        ],
    }) as { content: Array<{ type: string; text?: string }> };

    const rawText = data.content.find(c => c.type === 'text')?.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to extract campaign DNA from AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
        palette: {
            primary: parsed.palette?.primary ?? '#2563EB',
            secondary: parsed.palette?.secondary ?? '#1E293B',
            accent: parsed.palette?.accent ?? '#F59E0B',
            background: parsed.palette?.background ?? '#0F172A',
            text: parsed.palette?.text ?? '#F8FAFC',
        },
        copy: {
            headline: parsed.copy?.headline ?? 'Your Brand Here',
            subtext: parsed.copy?.subtext ?? 'Discover something amazing today',
            cta: parsed.copy?.cta ?? 'Shop Now',
        },
        mood: parsed.mood ?? 'premium',
        season: parsed.season ?? undefined,
    };
}

// ── Format Category ──

type FormatCategory = 'square' | 'portrait' | 'landscape' | 'ultrawide' | 'skyscraper';

function categorizeFormat(preset: BannerPreset): FormatCategory {
    const ratio = preset.width / preset.height;
    if (ratio > 3) return 'ultrawide';       // 728x90, 468x60
    if (ratio < 0.4) return 'skyscraper';    // 160x600
    if (ratio > 1.5) return 'landscape';      // 1200x628, 1920x1080
    if (ratio < 0.7) return 'portrait';       // 1080x1920
    return 'square';                           // 1080x1080, 300x250
}

// ── Campaign Generation ──

/**
 * Generate a complete campaign from a single prompt.
 * Creates multiple CreativeSets across different formats.
 *
 * @param prompt    User's campaign brief
 * @param packId   Campaign format pack ID (default: social-starter)
 * @param campaignName  Optional custom name
 * @param onProgress  Progress callback
 */
export async function generateCampaign(
    prompt: string,
    packId?: string,
    campaignName?: string,
    onProgress?: (msg: string) => void,
): Promise<CampaignGenerationResult> {
    const pack = getPackById(packId ?? '') ?? getDefaultPack();
    const progress = onProgress ?? (() => {});

    // 1. Extract DNA
    progress('Analyzing campaign brief...');
    let dna: CampaignDNA;
    try {
        dna = await extractCampaignDNA(prompt);
    } catch (err) {
        return { campaignId: '', success: false, message: `DNA extraction failed: ${err}`, creativeSetIds: [] };
    }

    // 2. Create Campaign in store
    const name = campaignName ?? `Campaign: ${dna.copy.headline}`;
    const campaignId = useCampaignStore.getState().createCampaign(name, prompt, pack.id, dna);
    progress(`Campaign created: "${name}" with ${pack.presetIds.length} formats`);

    // 3. Generate CreativeSet for each format
    const creativeSetIds: string[] = [];
    const total = pack.presetIds.length;

    for (let i = 0; i < total; i++) {
        const presetId = pack.presetIds[i];
        if (!presetId) continue;
        const preset = getPresetById(presetId);
        if (!preset) {
            console.warn(`[CampaignGen] Preset not found: ${presetId}`);
            continue;
        }

        progress(`Generating ${preset.name} (${i + 1}/${total})...`);

        try {
            // Create a CreativeSet for this format
            const csId = useDesignStore.getState().createCreativeSet(
                `${name} — ${preset.name}`,
                preset,
            );

            creativeSetIds.push(csId);
            useCampaignStore.getState().addCreativeSetId(campaignId, csId);
            useCampaignStore.getState().updateProgress(campaignId, (i + 1) / total);
        } catch (err) {
            console.error(`[CampaignGen] Failed to create ${preset.name}:`, err);
        }
    }

    // 4. Mark complete
    if (creativeSetIds.length === 0) {
        useCampaignStore.getState().setStatus(campaignId, 'error', 'No formats generated');
        return { campaignId, success: false, message: 'Campaign generation failed', creativeSetIds };
    }

    useCampaignStore.getState().setStatus(campaignId, 'ready');
    progress(`Campaign ready! ${creativeSetIds.length} formats generated.`);

    return { campaignId, success: true, message: `Campaign created with ${creativeSetIds.length} formats`, creativeSetIds };
}

/**
 * Get a design brief prompt for a specific format within a campaign.
 * Used when the user opens a campaign creative set in the editor
 * to auto-generate the design via the existing pipeline.
 */
export function buildFormatDesignPrompt(dna: CampaignDNA, preset: BannerPreset): string {
    const category = categorizeFormat(preset);
    const layoutHint = {
        square: 'Centered composition. Headline prominent in center, CTA below.',
        portrait: 'Vertical layout. Hero image top half, headline middle, CTA at bottom.',
        landscape: 'Horizontal split. Image on one side, text stack on the other.',
        ultrawide: 'Single-row layout. Logo left, headline center, CTA right. Very compact.',
        skyscraper: 'Vertical stack. Logo top, headline, image, subtext, CTA bottom. Each in its own row.',
    }[category];

    return `Create a ${preset.width}x${preset.height} "${preset.name}" design.

Visual Identity:
- Primary: ${dna.palette.primary}, Secondary: ${dna.palette.secondary}, Accent: ${dna.palette.accent}
- Background: ${dna.palette.background}, Text: ${dna.palette.text}
- Mood: ${dna.mood}

Copy:
- Headline: "${dna.copy.headline}"
- Subtext: "${dna.copy.subtext}"
- CTA: "${dna.copy.cta}"

Layout: ${layoutHint}

The design must be professional, premium quality, and optimized for ${preset.name}.`;
}
