// ─────────────────────────────────────────────────
// Design Tokens — Centralized design system values
// ─────────────────────────────────────────────────
// All colors, spacing, typography, and animation tokens.
// Single source of truth for the entire ACE UI.
// Vibrant Light Theme — Purple↔Cyan accent gradient
// ─────────────────────────────────────────────────

/**
 * Color palette tokens.
 * Every component should reference these instead of hardcoding colors.
 */
export const colors = {
    // ── Theme (Light) ──
    bg: {
        primary: '#f0f2f5',
        secondary: '#ffffff',
        tertiary: '#fafbfc',
        elevated: '#ffffff',
        overlay: 'rgba(0, 0, 0, 0.3)',
    },
    surface: {
        default: 'rgba(0, 0, 0, 0.03)',
        hover: '#f3f0ff',
        active: '#ede9fe',
        selected: 'rgba(124, 58, 237, 0.08)',
    },
    border: {
        default: 'rgba(0, 0, 0, 0.08)',
        subtle: 'rgba(0, 0, 0, 0.04)',
        strong: 'rgba(0, 0, 0, 0.15)',
        focus: '#7c3aed',
    },
    text: {
        primary: '#1a1a2e',
        secondary: '#64748b',
        muted: '#94a3b8',
        link: '#7c3aed',
        inverse: '#ffffff',
    },
    // ── Semantic ──
    accent: {
        blue: '#7c3aed',
        blueHover: '#6d28d9',
        blueSubtle: 'rgba(124, 58, 237, 0.08)',
    },
    success: {
        default: '#10b981',
        subtle: 'rgba(16, 185, 129, 0.1)',
        text: '#059669',
    },
    warning: {
        default: '#f59e0b',
        subtle: 'rgba(245, 158, 11, 0.1)',
        text: '#d97706',
    },
    danger: {
        default: '#ef4444',
        subtle: 'rgba(239, 68, 68, 0.1)',
        text: '#dc2626',
    },
    // ── Canvas ──
    canvas: {
        selection: '#7c3aed',
        selectionFill: 'rgba(124, 58, 237, 0.08)',
        guideEdge: '#f43f5e',
        guideCenter: '#06b6d4',
        guideSpacing: '#f59e0b',
    },
} as const;

/**
 * Spacing scale (4px grid system).
 */
export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
} as const;

/**
 * Typography tokens.
 */
export const typography = {
    fontFamily: {
        ui: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        mono: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
        xs: 10,
        sm: 11,
        md: 13,
        lg: 14,
        xl: 16,
        xxl: 18,
        h3: 20,
        h2: 24,
        h1: 32,
    },
    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
    lineHeight: {
        tight: 1.2,
        normal: 1.4,
        relaxed: 1.6,
    },
} as const;

/**
 * Border radius tokens.
 */
export const radius = {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
    xxl: 12,
    round: '50%',
    pill: 999,
} as const;

/**
 * Shadow tokens (light context — softer).
 */
export const shadows = {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.12)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.15)',
    dropdown: '0 8px 32px rgba(0, 0, 0, 0.12)',
    modal: '0 24px 64px rgba(0, 0, 0, 0.18)',
} as const;

/**
 * Animation/transition tokens.
 */
export const motion = {
    duration: {
        instant: '75ms',
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
        slower: '500ms',
    },
    easing: {
        standard: 'cubic-bezier(0.33, 0, 0.2, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.33, 0, 1, 1)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
} as const;

/**
 * Z-index layers.
 */
export const zIndex = {
    base: 0,
    dropdown: 100,
    sticky: 200,
    overlay: 300,
    modal: 400,
    popover: 500,
    toast: 600,
    tooltip: 700,
    max: 999,
} as const;

/**
 * Helper: generate CSS transition string.
 */
export function transition(
    properties: string[] = ['all'],
    duration: keyof typeof motion.duration = 'normal',
    easing: keyof typeof motion.easing = 'standard',
): string {
    return properties
        .map(p => `${p} ${motion.duration[duration]} ${motion.easing[easing]}`)
        .join(', ');
}
