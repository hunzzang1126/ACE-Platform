// ─────────────────────────────────────────────────
// Theme Store — Dark / Light / System appearance
// ─────────────────────────────────────────────────
// Persists per-user via localStorage.
// Applies [data-theme] attribute to <html> for CSS variable switching.

import { create } from 'zustand';

// ── Types ──

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    /** User's chosen mode */
    mode: ThemeMode;
    /** Resolved effective theme (never 'system') */
    resolved: 'light' | 'dark';
    /** Set theme mode */
    setMode: (mode: ThemeMode) => void;
}

// ── Helpers ──

const STORAGE_KEY_PREFIX = 'glid-theme-';

function storageKey(userId?: string): string {
    return userId ? `${STORAGE_KEY_PREFIX}${userId}` : 'glid-theme';
}

/** Detect OS preference */
function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Resolve mode → effective theme */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    return mode === 'system' ? getSystemTheme() : mode;
}

/** Apply theme to DOM */
function applyTheme(resolved: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', resolved);
    // Also set color-scheme for native elements (scrollbars, form controls)
    document.documentElement.style.colorScheme = resolved;
}

// ── Store ──

export const useThemeStore = create<ThemeState>((set) => ({
    mode: 'light',
    resolved: 'light',
    setMode: (mode) => {
        const resolved = resolveTheme(mode);
        applyTheme(resolved);
        set({ mode, resolved });
        // Persist
        try {
            localStorage.setItem(storageKey(), JSON.stringify(mode));
        } catch { /* quota */ }
    },
}));

// ── Initialization ──

/**
 * Initialize theme from localStorage. Call once at app startup.
 * @param userId - Optional user ID for per-user persistence
 */
export function initTheme(userId?: string): void {
    let mode: ThemeMode = 'light';
    try {
        const key = storageKey(userId);
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed === 'light' || parsed === 'dark' || parsed === 'system') {
                mode = parsed;
            }
        }
    } catch { /* corrupted */ }

    const resolved = resolveTheme(mode);
    applyTheme(resolved);
    useThemeStore.setState({ mode, resolved });

    // Listen for OS theme changes when mode is 'system'
    if (typeof window !== 'undefined') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', () => {
            const current = useThemeStore.getState();
            if (current.mode === 'system') {
                const newResolved = getSystemTheme();
                applyTheme(newResolved);
                useThemeStore.setState({ resolved: newResolved });
            }
        });
    }
}

/**
 * Save theme with userId key (call after login).
 */
export function persistThemeForUser(userId: string): void {
    const { mode } = useThemeStore.getState();
    try {
        localStorage.setItem(storageKey(userId), JSON.stringify(mode));
    } catch { /* quota */ }
}
