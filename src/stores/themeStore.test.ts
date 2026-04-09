// ─────────────────────────────────────────────────
// Theme Store Tests
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore, initTheme, resolveTheme, persistThemeForUser } from './themeStore';
import type { ThemeMode } from './themeStore';

// Mock matchMedia
const mockMatchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
});
Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true });

describe('themeStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useThemeStore.setState({ mode: 'light', resolved: 'light' });
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.colorScheme = '';
        mockMatchMedia.mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
    });

    describe('resolveTheme', () => {
        it('returns light for light mode', () => {
            expect(resolveTheme('light')).toBe('light');
        });

        it('returns dark for dark mode', () => {
            expect(resolveTheme('dark')).toBe('dark');
        });

        it('returns system preference for system mode', () => {
            mockMatchMedia.mockReturnValue({ matches: true, addEventListener: vi.fn() });
            expect(resolveTheme('system')).toBe('dark');
        });

        it('returns light when system prefers light', () => {
            mockMatchMedia.mockReturnValue({ matches: false, addEventListener: vi.fn() });
            expect(resolveTheme('system')).toBe('light');
        });
    });

    describe('setMode', () => {
        it('sets light mode', () => {
            useThemeStore.getState().setMode('light');
            const state = useThemeStore.getState();
            expect(state.mode).toBe('light');
            expect(state.resolved).toBe('light');
        });

        it('sets dark mode', () => {
            useThemeStore.getState().setMode('dark');
            const state = useThemeStore.getState();
            expect(state.mode).toBe('dark');
            expect(state.resolved).toBe('dark');
        });

        it('applies data-theme attribute to html', () => {
            useThemeStore.getState().setMode('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('sets color-scheme CSS property', () => {
            useThemeStore.getState().setMode('dark');
            expect(document.documentElement.style.colorScheme).toBe('dark');
        });

        it('persists to localStorage', () => {
            useThemeStore.getState().setMode('dark');
            const stored = localStorage.getItem('glid-theme');
            expect(stored).toBe('"dark"');
        });

        it('resolves system mode to effective theme', () => {
            mockMatchMedia.mockReturnValue({ matches: true, addEventListener: vi.fn() });
            useThemeStore.getState().setMode('system');
            const state = useThemeStore.getState();
            expect(state.mode).toBe('system');
            expect(state.resolved).toBe('dark');
        });
    });

    describe('initTheme', () => {
        it('defaults to light when no stored value', () => {
            initTheme();
            expect(useThemeStore.getState().mode).toBe('light');
            expect(useThemeStore.getState().resolved).toBe('light');
        });

        it('restores dark mode from localStorage', () => {
            localStorage.setItem('glid-theme', '"dark"');
            initTheme();
            expect(useThemeStore.getState().mode).toBe('dark');
            expect(useThemeStore.getState().resolved).toBe('dark');
        });

        it('restores system mode from localStorage', () => {
            localStorage.setItem('glid-theme', '"system"');
            mockMatchMedia.mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
            });
            initTheme();
            expect(useThemeStore.getState().mode).toBe('system');
            expect(useThemeStore.getState().resolved).toBe('dark');
        });

        it('uses per-user key when userId provided', () => {
            localStorage.setItem('glid-theme-user123', '"dark"');
            initTheme('user123');
            expect(useThemeStore.getState().mode).toBe('dark');
        });

        it('handles corrupted localStorage gracefully', () => {
            localStorage.setItem('glid-theme', 'CORRUPT{{{');
            initTheme();
            expect(useThemeStore.getState().mode).toBe('light');
        });

        it('ignores invalid theme values', () => {
            localStorage.setItem('glid-theme', '"rainbow"');
            initTheme();
            expect(useThemeStore.getState().mode).toBe('light');
        });

        it('applies data-theme to DOM', () => {
            localStorage.setItem('glid-theme', '"dark"');
            initTheme();
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });
    });

    describe('persistThemeForUser', () => {
        it('saves current theme under user-specific key', () => {
            useThemeStore.getState().setMode('dark');
            persistThemeForUser('abc');
            expect(localStorage.getItem('glid-theme-abc')).toBe('"dark"');
        });

        it('persists system mode value', () => {
            useThemeStore.getState().setMode('system');
            persistThemeForUser('xyz');
            expect(localStorage.getItem('glid-theme-xyz')).toBe('"system"');
        });
    });

    describe('theme modes list', () => {
        const modes: ThemeMode[] = ['light', 'dark', 'system'];
        it.each(modes)('mode "%s" is a valid ThemeMode', (mode) => {
            useThemeStore.getState().setMode(mode);
            expect(useThemeStore.getState().mode).toBe(mode);
        });
    });
});
