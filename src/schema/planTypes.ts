// ─────────────────────────────────────────────────
// Plan Types — Pricing tier definitions + limits
// ─────────────────────────────────────────────────
// Single source of truth for plan capabilities.
// Used by usePlanLimits hook and enforcement logic.
// ─────────────────────────────────────────────────

export type PlanTier = 'starter' | 'creator' | 'pro' | 'enterprise' | 'admin';

export type ExportFormat = 'png' | 'jpg' | 'html5' | 'gif' | 'mp4' | 'js_bundle';

export interface PlanLimits {
    /** Max creative sets allowed (-1 = unlimited) */
    maxCreativeSets: number;
    /** Max AI tokens per month (input + output combined) */
    aiTokensPerMonth: number;
    /** OpenRouter model IDs allowed for this plan */
    allowedModels: string[];
    /** Default model for new users on this plan */
    defaultModel: string;
    /** Max size variants per creative set (-1 = unlimited) */
    maxVariantsPerSet: number;
    /** Allowed export formats */
    allowedExports: ExportFormat[];
    /** Max team members (-1 = unlimited) */
    maxTeamMembers: number;
    /** Brand Cloud access */
    brandCloudEnabled: boolean;
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
        aiTokensPerMonth: 20, // 20 AI generations/month (Sonnet 4) — bumped from 10
        allowedModels: ['anthropic/claude-sonnet-4'],
        defaultModel: 'anthropic/claude-sonnet-4',
        maxVariantsPerSet: 3,
        allowedExports: ['png'],
        maxTeamMembers: 1,
        brandCloudEnabled: false,
    },
    creator: {
        maxCreativeSets: 10,
        aiTokensPerMonth: 50, // 50 AI generations/month (Sonnet 4)
        allowedModels: ['anthropic/claude-3.5-haiku', 'anthropic/claude-sonnet-4'],
        defaultModel: 'anthropic/claude-sonnet-4',
        maxVariantsPerSet: 5,
        allowedExports: ['png', 'jpg', 'html5'],
        maxTeamMembers: 1,
        brandCloudEnabled: true, // 1 brand kit allowed
    },
    pro: {
        maxCreativeSets: -1,
        aiTokensPerMonth: 300, // 300 AI generations/month (Sonnet 4)
        allowedModels: ['anthropic/claude-3.5-haiku', 'anthropic/claude-sonnet-4'],
        defaultModel: 'anthropic/claude-sonnet-4',
        maxVariantsPerSet: -1,
        allowedExports: ['png', 'jpg', 'html5'],
        maxTeamMembers: 3,
        brandCloudEnabled: false,
    },
    enterprise: {
        maxCreativeSets: -1,
        aiTokensPerMonth: 5_000, // 5000 AI generations/month
        allowedModels: ['anthropic/claude-3.5-haiku', 'anthropic/claude-sonnet-4'],
        defaultModel: 'anthropic/claude-sonnet-4',
        maxVariantsPerSet: -1,
        allowedExports: ['png', 'jpg', 'html5', 'gif', 'mp4', 'js_bundle'],
        maxTeamMembers: -1,
        brandCloudEnabled: true,
    },
    admin: {
        maxCreativeSets: -1,
        aiTokensPerMonth: Number.MAX_SAFE_INTEGER,
        allowedModels: ['anthropic/claude-3.5-haiku', 'anthropic/claude-sonnet-4'],
        defaultModel: 'anthropic/claude-sonnet-4',
        maxVariantsPerSet: -1,
        allowedExports: ['png', 'jpg', 'html5', 'gif', 'mp4', 'js_bundle'],
        maxTeamMembers: -1,
        brandCloudEnabled: true,
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
        tier: 'creator',
        name: 'Creator',
        tagline: 'For independent creators and freelancers',
        priceMonthly: 15,
        priceAnnual: 12, // ~20% discount
        limits: PLAN_LIMITS.creator,
        popular: true,
    },
    {
        tier: 'pro',
        name: 'Pro',
        tagline: 'For professional teams and agencies',
        priceMonthly: 50,
        priceAnnual: 40, // ~20% discount
        limits: PLAN_LIMITS.pro,
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
    /** AI tokens used this month (input + output combined) */
    aiTokensUsed: number;
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
