// ─────────────────────────────────────────────────
// userPrefs — Unit Tests
// ─────────────────────────────────────────────────
// Tests for user preference persistence and learning.

import { describe, it, expect, beforeEach } from 'vitest';
import {
    loadUserPrefs,
    saveUserPrefs,
    setPreferredLanguage,
    completeOnboarding,
    learnBrandFromDesign,
    trackTextUsage,
    trackSizeUsage,
    prefsToPromptSection,
    SUPPORTED_LANGUAGES,
} from './userPrefs';

beforeEach(() => {
    localStorage.clear();
});

// ── loadUserPrefs ──

describe('loadUserPrefs', () => {
    it('returns defaults when no saved prefs', () => {
        const prefs = loadUserPrefs('user-1');
        expect(prefs.preferredLanguage).toBe('English');
        expect(prefs.hasCompletedOnboarding).toBe(false);
        expect(prefs.layoutStyle).toBe('balanced');
    });

    it('loads saved prefs', () => {
        const saved = { preferredLanguage: 'Korean', hasCompletedOnboarding: true };
        localStorage.setItem('glid-prefs-user-1', JSON.stringify(saved));
        const prefs = loadUserPrefs('user-1');
        expect(prefs.preferredLanguage).toBe('Korean');
        expect(prefs.hasCompletedOnboarding).toBe(true);
    });

    it('merges saved prefs with defaults (no missing fields)', () => {
        localStorage.setItem('glid-prefs-user-1', JSON.stringify({ preferredLanguage: 'French' }));
        const prefs = loadUserPrefs('user-1');
        expect(prefs.preferredLanguage).toBe('French');
        // Should still have defaults for other fields
        expect(prefs.layoutStyle).toBe('balanced');
        expect(prefs.brandColors).toBeDefined();
    });

    it('migrates from legacy key if per-user key is empty', () => {
        const legacy = { preferredLanguage: 'Japanese', hasCompletedOnboarding: true };
        localStorage.setItem('ace-user-prefs', JSON.stringify(legacy));

        const prefs = loadUserPrefs('user-1');
        expect(prefs.preferredLanguage).toBe('Japanese');
        // Legacy key should be deleted after migration
        expect(localStorage.getItem('ace-user-prefs')).toBeNull();
        // Per-user key should now exist
        expect(localStorage.getItem('glid-prefs-user-1')).not.toBeNull();
    });

    it('handles corrupted JSON gracefully', () => {
        localStorage.setItem('glid-prefs-user-1', '{invalid json!!!}');
        const prefs = loadUserPrefs('user-1');
        expect(prefs.preferredLanguage).toBe('English'); // defaults
    });
});

// ── saveUserPrefs ──

describe('saveUserPrefs', () => {
    it('saves prefs to localStorage with per-user key', () => {
        const prefs = loadUserPrefs('user-1');
        prefs.preferredLanguage = 'Spanish';
        saveUserPrefs(prefs, 'user-1');

        const raw = localStorage.getItem('glid-prefs-user-1');
        expect(raw).not.toBeNull();
        const loaded = JSON.parse(raw!);
        expect(loaded.preferredLanguage).toBe('Spanish');
    });
});

// ── setPreferredLanguage ──

describe('setPreferredLanguage', () => {
    it('updates language and persists', () => {
        setPreferredLanguage('Korean', 'user-1');
        const prefs = loadUserPrefs('user-1');
        expect(prefs.preferredLanguage).toBe('Korean');
    });
});

// ── completeOnboarding ──

describe('completeOnboarding', () => {
    it('marks onboarding as complete', () => {
        completeOnboarding('user-1');
        const prefs = loadUserPrefs('user-1');
        expect(prefs.hasCompletedOnboarding).toBe(true);
    });
});

// ── learnBrandFromDesign ──

describe('learnBrandFromDesign', () => {
    it('learns background color from design', () => {
        learnBrandFromDesign([
            { type: 'shape', role: 'background', fill: '#1a0033' },
        ]);
        const prefs = loadUserPrefs();
        expect(prefs.brandColors.background).toBe('#1a0033');
    });

    it('learns text color from headline', () => {
        learnBrandFromDesign([
            { type: 'text', role: 'headline', color: '#ff0000', fontFamily: 'Roboto' },
        ]);
        const prefs = loadUserPrefs();
        expect(prefs.brandColors.text).toBe('#ff0000');
        expect(prefs.fonts.heading).toBe('Roboto');
    });

    it('learns primary color from CTA button', () => {
        learnBrandFromDesign([
            { type: 'button', role: 'cta', backgroundColor: '#3B82F6' },
        ]);
        const prefs = loadUserPrefs();
        expect(prefs.brandColors.primary).toBe('#3B82F6');
    });

    it('increments totalDesigns count', () => {
        const before = loadUserPrefs().stats.totalDesigns;
        learnBrandFromDesign([{ type: 'shape', role: 'background', fill: '#000' }]);
        learnBrandFromDesign([{ type: 'shape', role: 'background', fill: '#111' }]);
        const prefs = loadUserPrefs();
        expect(prefs.stats.totalDesigns).toBe(before + 2);
    });
});

// ── trackTextUsage ──

describe('trackTextUsage', () => {
    it('adds new text entry', () => {
        trackTextUsage('Buy Now', 'cta');
        const prefs = loadUserPrefs();
        expect(prefs.frequentTexts).toHaveLength(1);
        expect(prefs.frequentTexts[0]!.text).toBe('BUY NOW'); // normalized uppercase
    });

    it('increments count for repeated text', () => {
        // Clear any pre-existing state for this specific text
        const preCount = loadUserPrefs().frequentTexts.find(t => t.text === 'REPEAT ME')?.count ?? 0;
        trackTextUsage('Repeat Me', 'cta');
        trackTextUsage('Repeat Me', 'cta');
        trackTextUsage('Repeat Me', 'cta');
        const prefs = loadUserPrefs();
        const entry = prefs.frequentTexts.find(t => t.text === 'REPEAT ME');
        expect(entry).toBeDefined();
        expect(entry!.count).toBe(preCount + 3);
    });

    it('caps at 20 entries', () => {
        for (let i = 0; i < 25; i++) {
            trackTextUsage(`Text ${i}`, 'headline');
        }
        const prefs = loadUserPrefs();
        expect(prefs.frequentTexts.length).toBeLessThanOrEqual(20);
    });
});

// ── trackSizeUsage ──

describe('trackSizeUsage', () => {
    it('adds size to mostUsedSizes', () => {
        trackSizeUsage(300, 250);
        const prefs = loadUserPrefs();
        expect(prefs.stats.mostUsedSizes).toContain('300\u00d7250');
    });

    it('does not duplicate sizes', () => {
        trackSizeUsage(300, 250);
        trackSizeUsage(300, 250);
        const prefs = loadUserPrefs();
        expect(prefs.stats.mostUsedSizes.filter(s => s === '300\u00d7250')).toHaveLength(1);
    });

    it('caps at 10 sizes', () => {
        for (let i = 1; i <= 15; i++) {
            trackSizeUsage(i * 100, i * 50);
        }
        const prefs = loadUserPrefs();
        expect(prefs.stats.mostUsedSizes.length).toBeLessThanOrEqual(10);
    });
});

// ── prefsToPromptSection ──

describe('prefsToPromptSection', () => {
    it('includes language preference', () => {
        const prefs = loadUserPrefs();
        prefs.preferredLanguage = 'Korean';
        const section = prefsToPromptSection(prefs);
        expect(section).toContain('Korean');
        expect(section).toContain('Content Language');
    });

    it('includes brand colors', () => {
        const prefs = loadUserPrefs();
        const section = prefsToPromptSection(prefs);
        expect(section).toContain(prefs.brandColors.background);
        expect(section).toContain(prefs.brandColors.primary);
    });

    it('includes frequent texts when present', () => {
        const prefs = loadUserPrefs();
        prefs.frequentTexts = [{ text: 'BUY NOW', role: 'cta', count: 5 }];
        const section = prefsToPromptSection(prefs);
        expect(section).toContain('BUY NOW');
        expect(section).toContain('cta');
    });
});

// ── SUPPORTED_LANGUAGES ──

describe('SUPPORTED_LANGUAGES', () => {
    it('includes English', () => expect(SUPPORTED_LANGUAGES).toContain('English'));
    it('includes Korean', () => expect(SUPPORTED_LANGUAGES).toContain('Korean'));
    it('includes Japanese', () => expect(SUPPORTED_LANGUAGES).toContain('Japanese'));
    it('has at least 15 languages', () => expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(15));
});
