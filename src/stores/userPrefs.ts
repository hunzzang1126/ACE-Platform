// ─────────────────────────────────────────────────
// User Preference Store — Persistent Design Preferences
// ─────────────────────────────────────────────────
// Stores user-specific design choices so the AI can
// personalize outputs based on past behavior.
// Persisted to localStorage.

const STORAGE_KEY_PREFIX = 'glid-prefs-';
/** Legacy key for migration — will be read-once then deleted */
const LEGACY_KEY = 'ace-user-prefs';

// ── Supported Languages ──

export const SUPPORTED_LANGUAGES = [
    'English', 'Korean', 'Japanese',
    'Chinese (Simplified)', 'Chinese (Traditional)',
    'French', 'Spanish', 'German', 'Portuguese', 'Italian',
    'Dutch', 'Russian', 'Arabic', 'Hindi', 'Thai',
    'Vietnamese', 'Indonesian', 'Turkish', 'Polish', 'Swedish',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// ── Types ──

export interface UserPrefs {
    /** Preferred language for AI-generated copy */
    preferredLanguage: SupportedLanguage;
    /** Whether the user has completed onboarding */
    hasCompletedOnboarding: boolean;
    /** User's learned brand colors */
    brandColors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
    /** Preferred fonts */
    fonts: {
        heading: string;
        body: string;
    };
    /** Layout style preference */
    layoutStyle: 'minimal' | 'balanced' | 'dense';
    /** Animation intensity preference */
    animationStyle: 'none' | 'subtle' | 'moderate' | 'dynamic';
    /** Common text patterns (headlines, CTAs the user frequently uses) */
    frequentTexts: { text: string; role: string; count: number }[];
    /** User's design history stats */
    stats: {
        totalDesigns: number;
        lastDesignDate: string;
        mostUsedSizes: string[];
    };
}

const DEFAULT_PREFS: UserPrefs = {
    preferredLanguage: 'English',
    hasCompletedOnboarding: false,
    brandColors: {
        primary: '#c9a84c',
        secondary: '#1a1f2e',
        background: '#0a0e1a',
        text: '#ffffff',
    },
    fonts: {
        heading: 'Inter',
        body: 'Inter',
    },
    layoutStyle: 'balanced',
    animationStyle: 'moderate',
    frequentTexts: [],
    stats: {
        totalDesigns: 0,
        lastDesignDate: '',
        mostUsedSizes: [],
    },
};

// ── Per-user storage key ──

function storageKey(userId?: string): string {
    if (userId) return `${STORAGE_KEY_PREFIX}${userId}`;
    // Fallback: try to get userId from authStore (avoid circular import)
    return LEGACY_KEY;
}

// ── Load / Save ──

/**
 * Load prefs for a specific user. Migrates from legacy key if needed.
 */
export function loadUserPrefs(userId?: string): UserPrefs {
    try {
        const key = storageKey(userId);
        let raw = localStorage.getItem(key);

        // Migration: if per-user key is empty, check legacy global key
        if (!raw && userId) {
            const legacy = localStorage.getItem(LEGACY_KEY);
            if (legacy) {
                // Migrate to per-user key and delete legacy
                localStorage.setItem(key, legacy);
                localStorage.removeItem(LEGACY_KEY);
                raw = legacy;
            }
        }

        if (!raw) return { ...DEFAULT_PREFS };
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_PREFS };
    }
}

export function saveUserPrefs(prefs: UserPrefs, userId?: string): void {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}

/**
 * Set the user's preferred language for AI copy generation.
 */
export function setPreferredLanguage(lang: SupportedLanguage, userId?: string): void {
    const prefs = loadUserPrefs(userId);
    prefs.preferredLanguage = lang;
    saveUserPrefs(prefs, userId);
}

/**
 * Mark onboarding as completed (localStorage only — sync version).
 */
export function completeOnboarding(userId?: string): void {
    const prefs = loadUserPrefs(userId);
    prefs.hasCompletedOnboarding = true;
    saveUserPrefs(prefs, userId);
}

/**
 * Mark onboarding as completed — writes to both localStorage AND Supabase.
 * Use this from OnboardingPage for full cross-device persistence.
 */
export async function completeOnboardingAsync(
    userId: string,
    preferredLanguage: SupportedLanguage,
): Promise<void> {
    // 1. Write to localStorage (immediate, always works)
    const prefs = loadUserPrefs(userId);
    prefs.hasCompletedOnboarding = true;
    prefs.preferredLanguage = preferredLanguage;
    saveUserPrefs(prefs, userId);

    // 2. Write to Supabase (async, fire-and-forget safe)
    try {
        const { markOnboardingComplete } = await import('@/services/supabaseClient');
        await markOnboardingComplete(userId, preferredLanguage);
    } catch (e) {
        console.warn('[completeOnboardingAsync] Supabase sync failed:', e);
    }
}

// ── Learning Functions ──

/**
 * Learn brand colors from a completed design.
 * Called after user finalizes a creative set.
 */
export function learnBrandFromDesign(elements: Array<{ type: string; role?: string;[key: string]: unknown }>): void {
    const prefs = loadUserPrefs();

    // Learn background color
    const bg = elements.find(el => el.role === 'background' && el.type === 'shape');
    if (bg && typeof bg.fill === 'string') {
        prefs.brandColors.background = bg.fill;
    }

    // Learn primary color (accent or CTA)
    const accent = elements.find(el => el.role === 'accent' && el.type === 'shape');
    if (accent && typeof accent.fill === 'string') {
        prefs.brandColors.primary = accent.fill;
    }
    const cta = elements.find(el => el.role === 'cta' && el.type === 'button');
    if (cta && typeof cta.backgroundColor === 'string') {
        prefs.brandColors.primary = cta.backgroundColor;
    }

    // Learn text color
    const headline = elements.find(el => el.role === 'headline' && el.type === 'text');
    if (headline && typeof headline.color === 'string') {
        prefs.brandColors.text = headline.color;
    }

    // Learn font
    const textEl = elements.find(el => el.type === 'text');
    if (textEl && typeof textEl.fontFamily === 'string') {
        prefs.fonts.heading = textEl.fontFamily;
        prefs.fonts.body = textEl.fontFamily;
    }

    // Update stats
    prefs.stats.totalDesigns++;
    prefs.stats.lastDesignDate = new Date().toISOString();

    saveUserPrefs(prefs);
}

/**
 * Track a frequently-used text pattern.
 */
export function trackTextUsage(text: string, role: string): void {
    const prefs = loadUserPrefs();
    const normalized = text.trim().toUpperCase();
    const existing = prefs.frequentTexts.find(t => t.text === normalized && t.role === role);
    if (existing) {
        existing.count++;
    } else {
        prefs.frequentTexts.push({ text: normalized, role, count: 1 });
    }
    // Keep only top 20
    prefs.frequentTexts.sort((a, b) => b.count - a.count);
    prefs.frequentTexts = prefs.frequentTexts.slice(0, 20);
    saveUserPrefs(prefs);
}

/**
 * Track size usage for "most used sizes" stat.
 */
export function trackSizeUsage(width: number, height: number): void {
    const prefs = loadUserPrefs();
    const size = `${width}×${height}`;
    if (!prefs.stats.mostUsedSizes.includes(size)) {
        prefs.stats.mostUsedSizes.push(size);
        if (prefs.stats.mostUsedSizes.length > 10) {
            prefs.stats.mostUsedSizes = prefs.stats.mostUsedSizes.slice(-10);
        }
    }
    saveUserPrefs(prefs);
}

/**
 * Convert user prefs to a prompt section for the AI.
 */
export function prefsToPromptSection(prefs: UserPrefs): string {
    const lines: string[] = [];
    lines.push(`### User Preferences (learned from past designs)`);
    lines.push(`- **Content Language: ${prefs.preferredLanguage}** — Write ALL generated copy in this language`);
    lines.push(`- If the user writes in a different language, use THAT language instead`);
    lines.push(`- Brand: bg=${prefs.brandColors.background}, primary=${prefs.brandColors.primary}, text=${prefs.brandColors.text}`);
    lines.push(`- Fonts: heading="${prefs.fonts.heading}", body="${prefs.fonts.body}"`);
    lines.push(`- Style: ${prefs.layoutStyle} layout, ${prefs.animationStyle} animations`);
    lines.push(`- Designs created: ${prefs.stats.totalDesigns}`);
    if (prefs.frequentTexts.length > 0) {
        lines.push(`- Common texts: ${prefs.frequentTexts.slice(0, 5).map(t => `"${t.text}" (${t.role})`).join(', ')}`);
    }
    lines.push(`*(Use these preferences for new designs unless user specifies otherwise)*`);
    return lines.join('\n');
}
