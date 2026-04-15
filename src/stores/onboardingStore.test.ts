// ─────────────────────────────────────────────────
// onboardingStore.test — Guide dismissal tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { isGuideDismissed, dismissGuide, resetAllGuides } from './onboardingStore';

describe('onboardingStore', () => {
    beforeEach(() => {
        // Clear all guide-related localStorage keys
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('ace-guide-')) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
    });

    it('returns false for undismissed guide', () => {
        expect(isGuideDismissed('dashboard')).toBe(false);
    });

    it('dismissGuide persists to localStorage', () => {
        dismissGuide('dashboard');
        expect(isGuideDismissed('dashboard')).toBe(true);
    });

    it('different pages are independent', () => {
        dismissGuide('dashboard');
        expect(isGuideDismissed('dashboard')).toBe(true);
        expect(isGuideDismissed('sizes')).toBe(false);
        expect(isGuideDismissed('editor')).toBe(false);
    });

    it('resetAllGuides clears all pages', () => {
        dismissGuide('dashboard');
        dismissGuide('sizes');
        dismissGuide('editor');
        expect(isGuideDismissed('dashboard')).toBe(true);
        expect(isGuideDismissed('sizes')).toBe(true);

        resetAllGuides();
        expect(isGuideDismissed('dashboard')).toBe(false);
        expect(isGuideDismissed('sizes')).toBe(false);
        expect(isGuideDismissed('editor')).toBe(false);
    });

    it('dismissGuide is idempotent', () => {
        dismissGuide('editor');
        dismissGuide('editor');
        expect(isGuideDismissed('editor')).toBe(true);
    });
});
