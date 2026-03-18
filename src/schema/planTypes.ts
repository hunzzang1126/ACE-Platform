// ─────────────────────────────────────────────────
// Plan Types — Pricing tier definitions + limits
// ─────────────────────────────────────────────────
// Single source of truth for plan capabilities.
// Used by usePlanLimits hook and enforcement logic.
// ─────────────────────────────────────────────────

export type PlanTier = 'starter' | 'pro' | 'enterprise' | 'admin';

export type ExportFormat = 'png' | 'jpg' | 'html5' | 'gif' | 'mp4' | 'js_bundle';

export interface PlanLimits {
    /** Max creative sets allowed (-1 = unlimited) */
    maxCreativeSets: number;
    /** Max AI generations per month */
    aiGenerationsPerMonth: number;
    /** Max size variants per creative set (-1 = unlimited) */
    maxVariantsPerSet: number;
    /** Allowed export formats */
    allowedExports: ExportFormat[];
    /** Max team members (-1 = unlimited) */
    maxTeamMembers: number;
    /** Brand Cloud access */
    brandCloudEnabled: boolean;
    /** AI Vision QA access */
    aiVisionQAEnabled: boolean;
}

export interface PlanInfo {
    tier: PlanTier;
    name: string;
    tagline: string;
    priceMonthly: number; // USD, 0 = free, -1 = custom
    priceAnnual: number;  // USD, 0 = free, -1 = custom
    limits: PlanLimits;
    popular?: boolean;
}

// ── Plan Definitions ────────────────────────────

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
    starter: {
        maxCreativeSets: 3,
        aiGenerationsPerMonth: 10,
        maxVariantsPerSet: 3,
        allowedExports: ['png'],
        maxTeamMembers: 1,
        brandCloudEnabled: false,
        aiVisionQAEnabled: false,
    },
    pro: {
        maxCreativeSets: -1,
        aiGenerationsPerMonth: 1_000,
        maxVariantsPerSet: -1,
        allowedExports: ['png', 'jpg', 'html5'],
        maxTeamMembers: 1,
        brandCloudEnabled: false,
        aiVisionQAEnabled: true,
    },
    enterprise: {
        maxCreativeSets: -1,
        aiGenerationsPerMonth: 5_000,
        maxVariantsPerSet: -1,
        allowedExports: ['png', 'jpg', 'html5', 'gif', 'mp4', 'js_bundle'],
        maxTeamMembers: -1,
        brandCloudEnabled: true,
        aiVisionQAEnabled: true,
    },
    // ★ Admin — truly unlimited, no restrictions whatsoever
    admin: {
        maxCreativeSets: -1,
        aiGenerationsPerMonth: Number.MAX_SAFE_INTEGER,
        maxVariantsPerSet: -1,
        allowedExports: ['png', 'jpg', 'html5', 'gif', 'mp4', 'js_bundle'],
        maxTeamMembers: -1,
        brandCloudEnabled: true,
        aiVisionQAEnabled: true,
    },
};

export const PLANS: PlanInfo[] = [
    {
        tier: 'starter',
        name: 'Starter',
        tagline: 'Perfect for trying out Glid',
        priceMonthly: 0,
        priceAnnual: 0,
        limits: PLAN_LIMITS.starter,
    },
    {
        tier: 'pro',
        name: 'Pro',
        tagline: 'For professional creators and teams',
        priceMonthly: 49,
        priceAnnual: 39, // ~20% discount
        limits: PLAN_LIMITS.pro,
        popular: true,
    },
    {
        tier: 'enterprise',
        name: 'Enterprise',
        tagline: 'Brand Cloud + unlimited team seats',
        priceMonthly: -1, // custom pricing
        priceAnnual: -1,
        limits: PLAN_LIMITS.enterprise,
    },
];

// ── Helpers ──────────────────────────────────────

export function getPlanLimits(tier: PlanTier): PlanLimits {
    return PLAN_LIMITS[tier];
}

export function isUnlimited(value: number): boolean {
    return value === -1;
}

/** Check if a specific feature is available on a given plan */
export function hasFeature(tier: PlanTier, feature: keyof PlanLimits): boolean {
    const limits = PLAN_LIMITS[tier];
    const val = limits[feature];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (Array.isArray(val)) return val.length > 0;
    return false;
}

// ── Usage Types ─────────────────────────────────

export interface UsageData {
    /** Current billing month (YYYY-MM) */
    month: string;
    /** AI generations used this month */
    aiGenerationsUsed: number;
    /** Creative sets currently owned */
    creativeSetsCount: number;
}

export interface Subscription {
    userId: string;
    plan: PlanTier;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    /** Organization ID for enterprise users */
    organizationId?: string;
}

export interface Organization {
    id: string;
    name: string;
    ownerId: string;
    plan: PlanTier;
    brandCloud?: BrandCloud;
    createdAt: string;
}

export interface BrandCloud {
    /** Brand primary colors (hex) */
    colors: string[];
    /** Brand font families */
    fonts: string[];
    /** Logo URLs */
    logos: string[];
    /** Brand voice/tone guidelines (free text) */
    guidelines: string;
    /** Style reference URLs */
    styleReferences: string[];
}

export interface OrgMember {
    orgId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member';
    invitedAt: string;
    joinedAt?: string;
}
