// ─────────────────────────────────────────────────
// campaignTypes.ts — Campaign data structures
// ─────────────────────────────────────────────────

/** Shared visual identity extracted from user prompt */
export interface CampaignDNA {
    palette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    copy: {
        headline: string;
        subtext: string;
        cta: string;
    };
    mood: string;
    season?: string;
}

/** Pre-defined format bundle */
export interface CampaignFormatPack {
    id: string;
    name: string;
    description: string;
    presetIds: string[];
}

/** Campaign status */
export type CampaignStatus = 'generating' | 'ready' | 'error';

/** A campaign — set of coordinated creatives */
export interface Campaign {
    id: string;
    name: string;
    prompt: string;
    dna: CampaignDNA;
    /** IDs of CreativeSets generated for this campaign */
    creativeSetIds: string[];
    /** Format pack used */
    packId: string;
    status: CampaignStatus;
    /** Progress 0-1 (during generation) */
    progress: number;
    /** Error message if status === 'error' */
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
}
