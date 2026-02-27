// ─────────────────────────────────────────────────
// User Preference Store — Persistent Design Preferences
// ─────────────────────────────────────────────────
// Stores user-specific design choices so the AI can
// personalize outputs based on past behavior.
// Persisted to localStorage.

import { getAspectCategory } from '@/schema/layoutRoles';

const STORAGE_KEY = 'ace-user-prefs';

// ── Types ──

export interface UserPrefs {
    /** Preferred brand colors (auto-learned from user's designs) */
    brandColors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
    /** Preferred font families */
    fonts: {
        heading: string;
        body: string;
    };
    /** Layout style preferences */
    layoutStyle: 'minimal' | 'balanced' | 'dense';
    /** Preferred animation style */
    animationStyle: 'subtle' | 'moderate' | 'dramatic';
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

// ── Load / Save ──

export function loadUserPrefs(): UserPrefs {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_PREFS };
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_PREFS };
    }
}

export function saveUserPrefs(prefs: UserPrefs): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
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
