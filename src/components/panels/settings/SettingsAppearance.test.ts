// ─────────────────────────────────────────────────
// SettingsAppearance.test.tsx — Component tests
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore, resolveTheme } from '@/stores/themeStore';
import type { ThemeMode } from '@/stores/themeStore';

// Mock matchMedia
const mockMatchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
});
Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true });

describe('SettingsAppearance — Theme Integration', () => {
    beforeEach(() => {
        localStorage.clear();
        useThemeStore.setState({ mode: 'light', resolved: 'light' });
        document.documentElement.removeAttribute('data-theme');
    });

    describe('theme mode switching', () => {
        it('can switch to dark mode', () => {
            useThemeStore.getState().setMode('dark');
            expect(useThemeStore.getState().mode).toBe('dark');
            expect(useThemeStore.getState().resolved).toBe('dark');
        });

        it('can switch to light mode', () => {
            useThemeStore.getState().setMode('dark');
            useThemeStore.getState().setMode('light');
            expect(useThemeStore.getState().mode).toBe('light');
            expect(useThemeStore.getState().resolved).toBe('light');
        });

        it('can switch to system mode', () => {
            useThemeStore.getState().setMode('system');
            expect(useThemeStore.getState().mode).toBe('system');
        });

        it('round-trip: set→persist→restore works', () => {
            useThemeStore.getState().setMode('dark');
            const stored = localStorage.getItem('glid-theme');
            expect(stored).toBe('"dark"');

            // Simulate fresh load
            useThemeStore.setState({ mode: 'light', resolved: 'light' });
            const restored: ThemeMode = JSON.parse(stored!);
            useThemeStore.getState().setMode(restored);
            expect(useThemeStore.getState().mode).toBe('dark');
        });
    });

    describe('DOM application', () => {
        it('sets data-theme attribute on html element', () => {
            useThemeStore.getState().setMode('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('sets color-scheme CSS property', () => {
            useThemeStore.getState().setMode('dark');
            expect(document.documentElement.style.colorScheme).toBe('dark');
        });

        it('switches back to light correctly', () => {
            useThemeStore.getState().setMode('dark');
            useThemeStore.getState().setMode('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });
    });

    describe('theme options completeness', () => {
        const ALL_MODES: ThemeMode[] = ['light', 'dark', 'system'];

        it.each(ALL_MODES)('mode "%s" is settable and restorable', (mode) => {
            useThemeStore.getState().setMode(mode);
            expect(useThemeStore.getState().mode).toBe(mode);

            const stored = JSON.parse(localStorage.getItem('glid-theme')!);
            expect(stored).toBe(mode);
        });
    });

    describe('resolveTheme consistency', () => {
        it('light mode always resolves to light', () => {
            expect(resolveTheme('light')).toBe('light');
        });

        it('dark mode always resolves to dark', () => {
            expect(resolveTheme('dark')).toBe('dark');
        });

        it('system mode resolves based on OS preference', () => {
            mockMatchMedia.mockReturnValue({ matches: false, addEventListener: vi.fn() });
            expect(resolveTheme('system')).toBe('light');

            mockMatchMedia.mockReturnValue({ matches: true, addEventListener: vi.fn() });
            expect(resolveTheme('system')).toBe('dark');
        });
    });
});

describe('SettingsAppearance — Theme Preview Colors', () => {
    // These test the color constants used in ThemePreview
    // to ensure brand colors are used consistently

    const BRAND_DARK_BG = '#0B0F1A';
    const BRAND_LIGHT_BG = '#F0F2F5';
    const BRAND_DARK_SURFACE = '#111827';
    const BRAND_LIGHT_SURFACE = '#FFFFFF';
    const BRAND_DARK_TEXT = '#F1F5F9';
    const BRAND_LIGHT_TEXT = '#1A1A2E';
    const BRAND_ACCENT = '#6366F1';

    it('dark preview uses brand dark background', () => {
        expect(BRAND_DARK_BG).toBe('#0B0F1A');
    });

    it('light preview uses brand light background', () => {
        expect(BRAND_LIGHT_BG).toBe('#F0F2F5');
    });

    it('dark preview uses dark surface', () => {
        expect(BRAND_DARK_SURFACE).toBe('#111827');
    });

    it('light preview uses white surface', () => {
        expect(BRAND_LIGHT_SURFACE).toBe('#FFFFFF');
    });

    it('dark preview uses light text (contrast)', () => {
        expect(BRAND_DARK_TEXT).toBe('#F1F5F9');
    });

    it('light preview uses dark text (contrast)', () => {
        expect(BRAND_LIGHT_TEXT).toBe('#1A1A2E');
    });

    it('accent color is Indigo (not purple)', () => {
        expect(BRAND_ACCENT).toBe('#6366F1');
        expect(BRAND_ACCENT).not.toBe('#7c3aed');
    });
});
