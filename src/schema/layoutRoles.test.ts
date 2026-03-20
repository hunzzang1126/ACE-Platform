// ─────────────────────────────────────────────────
// layoutRoles — Unit Tests
// ─────────────────────────────────────────────────
// Tests for aspect category detection and role metadata.

import { describe, it, expect } from 'vitest';
import {
    getAspectCategory,
    ROLE_LABELS,
    ROLE_ZINDEX,
    type LayoutRole,
} from '@/schema/layoutRoles';

// ── getAspectCategory ──

describe('getAspectCategory', () => {
    // Ultra-wide: w/h > 2.5
    it('970x250 → ultra-wide', () => expect(getAspectCategory(970, 250)).toBe('ultra-wide'));
    it('728x90 → ultra-wide', () => expect(getAspectCategory(728, 90)).toBe('ultra-wide'));
    it('970x90 → ultra-wide', () => expect(getAspectCategory(970, 90)).toBe('ultra-wide'));

    // Landscape: 1.3 < w/h ≤ 2.5
    it('300x250 → square (1.2 ratio)', () => expect(getAspectCategory(300, 250)).toBe('square'));
    it('336x280 → square (1.2 ratio)', () => expect(getAspectCategory(336, 280)).toBe('square'));
    it('800x400 → landscape', () => expect(getAspectCategory(800, 400)).toBe('landscape'));
    it('468x60 → ultra-wide', () => expect(getAspectCategory(468, 60)).toBe('ultra-wide'));
    it('1200x628 → landscape', () => expect(getAspectCategory(1200, 628)).toBe('landscape'));

    // Square: 0.7 ≤ w/h ≤ 1.3
    it('250x250 → square', () => expect(getAspectCategory(250, 250)).toBe('square'));
    it('1080x1080 → square', () => expect(getAspectCategory(1080, 1080)).toBe('square'));
    it('300x300 → square', () => expect(getAspectCategory(300, 300)).toBe('square'));
    it('1080x1350 → square (0.8 ratio)', () => expect(getAspectCategory(1080, 1350)).toBe('square'));

    // Portrait: w/h < 0.7
    it('160x600 → portrait', () => expect(getAspectCategory(160, 600)).toBe('portrait'));
    it('120x600 → portrait', () => expect(getAspectCategory(120, 600)).toBe('portrait'));
    it('300x600 → portrait', () => expect(getAspectCategory(300, 600)).toBe('portrait'));
    it('1080x1920 → portrait (0.5625)', () => expect(getAspectCategory(1080, 1920)).toBe('portrait'));

    // Edge cases
    it('exact 2.5 ratio → landscape (not ultra-wide)', () => expect(getAspectCategory(500, 200)).toBe('landscape'));
    it('exact 0.7 ratio → square (not portrait)', () => expect(getAspectCategory(70, 100)).toBe('square'));
});

// ── ROLE_LABELS ──

describe('ROLE_LABELS', () => {
    const ALL_ROLES: LayoutRole[] = ['logo', 'headline', 'subline', 'cta', 'tnc', 'hero', 'accent', 'background', 'detail', 'badge'];

    it('all 10 roles have labels', () => {
        for (const role of ALL_ROLES) {
            expect(ROLE_LABELS[role]).toBeTruthy();
            expect(typeof ROLE_LABELS[role]).toBe('string');
        }
    });

    it('no empty labels', () => {
        for (const role of ALL_ROLES) {
            expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
        }
    });
});

// ── ROLE_ZINDEX ──

describe('ROLE_ZINDEX', () => {
    it('background has lowest z-index (0)', () => {
        expect(ROLE_ZINDEX.background).toBe(0);
    });

    it('badge has highest z-index (20)', () => {
        expect(ROLE_ZINDEX.badge).toBe(20);
    });

    it('z-index ordering: background < hero < accent < logo < headline < cta < badge', () => {
        expect(ROLE_ZINDEX.background).toBeLessThan(ROLE_ZINDEX.hero);
        expect(ROLE_ZINDEX.hero).toBeLessThan(ROLE_ZINDEX.accent);
        expect(ROLE_ZINDEX.accent).toBeLessThan(ROLE_ZINDEX.logo);
        expect(ROLE_ZINDEX.logo).toBeLessThan(ROLE_ZINDEX.headline);
        expect(ROLE_ZINDEX.headline).toBeLessThan(ROLE_ZINDEX.cta);
        expect(ROLE_ZINDEX.cta).toBeLessThan(ROLE_ZINDEX.badge);
    });

    it('all roles have non-negative z-index', () => {
        for (const z of Object.values(ROLE_ZINDEX)) {
            expect(z).toBeGreaterThanOrEqual(0);
        }
    });
});
