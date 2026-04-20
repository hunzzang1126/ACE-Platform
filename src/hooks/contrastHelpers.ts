// ─────────────────────────────────────────────────
// contrastHelpers — Luminance + contrast utilities
// ─────────────────────────────────────────────────
// Pure functions for color contrast calculations.
// Used by agentGenerateFlow for bg/text contrast checks.
// ─────────────────────────────────────────────────

/** W3C relative luminance from hex color (0 = black, 1 = white) */
export function hexLuminance(hex: string): number {
    const clean = hex.replace('#', '');
    if (clean.length < 6) return 0.5; // safety for malformed hex
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    // sRGB → linear
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Average luminance of two gradient colors */
export function averageLuminance(hex1: string, hex2: string): number {
    return (hexLuminance(hex1) + hexLuminance(hex2)) / 2;
}

/**
 * Check if text color has sufficient contrast against a background.
 * Returns true if contrast ratio (simplified) >= threshold.
 */
export function hasMinContrast(textHex: string, bgHex: string, threshold = 0.3): boolean {
    return Math.abs(hexLuminance(textHex) - hexLuminance(bgHex)) >= threshold;
}

/**
 * Choose a text color that contrasts well with the given background.
 * Returns dark text for light backgrounds, white text for dark backgrounds.
 */
export function contrastingTextColor(bgLuminance: number): string {
    return bgLuminance > 0.5 ? '#1A1A2E' : '#FFFFFF';
}
