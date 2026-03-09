// ─────────────────────────────────────────────────
// Design Tokens — Centralized design system values
// ─────────────────────────────────────────────────
// All colors, spacing, typography, and animation tokens.
// Single source of truth for the entire ACE UI.
// ─────────────────────────────────────────────────

/**
 * Color palette tokens.
 * Every component should reference these instead of hardcoding colors.
 */
export const colors = {
    // ── Theme ──
    bg: {
        primary: '#0d1117',
        secondary: '#161b22',
        tertiary: '#1c2128',
        elevated: 'rgba(22, 27, 38, 0.95)',
        overlay: 'rgba(0, 0, 0, 0.5)',
    },
    surface: {
        default: 'rgba(255, 255, 255, 0.04)',
        hover: 'rgba(255, 255, 255, 0.08)',
        active: 'rgba(255, 255, 255, 0.12)',
        selected: 'rgba(74, 158, 255, 0.12)',
    },
    border: {
        default: 'rgba(255, 255, 255, 0.06)',
        subtle: 'rgba(255, 255, 255, 0.04)',
        strong: 'rgba(255, 255, 255, 0.12)',
        focus: '#4a9eff',
    },
    text: {
        primary: '#e6edf3',
        secondary: '#8b949e',
        muted: '#484f58',
        link: '#4a9eff',
        inverse: '#0d1117',
    },
    // ── Semantic ──
    accent: {
        blue: '#1f6feb',
        blueHover: '#388bfd',
        blueSubtle: 'rgba(31, 111, 235, 0.12)',
    },
    success: {
        default: '#238636',
        subtle: 'rgba(35, 134, 54, 0.12)',
        text: '#3fb950',
    },
    warning: {
        default: '#d29922',
        subtle: 'rgba(210, 153, 34, 0.12)',
        text: '#e3b341',
    },
    danger: {
        default: '#da3633',
        subtle: 'rgba(218, 54, 51, 0.12)',
        text: '#f85149',
    },
    // ── Canvas ──
    canvas: {
        selection: '#4a9eff',
        selectionFill: 'rgba(74, 158, 255, 0.1)',
        guideEdge: '#ff6b9d',
        guideCenter: '#67d5ff',
        guideSpacing: '#ffa557',
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
 * Shadow tokens.
 */
export const shadows = {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    xl: '0 16px 64px rgba(0, 0, 0, 0.6)',
    dropdown: '0 8px 32px rgba(0, 0, 0, 0.5)',
    modal: '0 24px 80px rgba(0, 0, 0, 0.7)',
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
