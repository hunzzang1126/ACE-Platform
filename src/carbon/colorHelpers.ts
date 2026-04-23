// ─────────────────────────────────────────────────
// Carbon Layout Color Helpers
// ─────────────────────────────────────────────────
// Extracted from layoutComposer.ts to keep under 400 lines.
// Color math for visual impact guards and contrast checks.
// ─────────────────────────────────────────────────

/** Extract red channel as 0-1 float from hex */
export function hexR(hex: string): number {
    return parseInt(hex.replace('#', '').substring(0, 2), 16) / 255;
}
/** Extract green channel as 0-1 float from hex */
export function hexG(hex: string): number {
    return parseInt(hex.replace('#', '').substring(2, 4), 16) / 255;
}
/** Extract blue channel as 0-1 float from hex */
export function hexB(hex: string): number {
    return parseInt(hex.replace('#', '').substring(4, 6), 16) / 255;
}

/** Relative luminance (0 = black, 1 = white) */
export function hexLuminance(hex: string): number {
    const r = hexR(hex), g = hexG(hex), b = hexB(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Darken a hex color by a factor (0 = no change, 1 = pure black) */
export function darkenHex(hex: string, amount: number): string {
    const c = hex.replace('#', '');
    const r = Math.round(parseInt(c.slice(0, 2), 16) * (1 - amount));
    const g = Math.round(parseInt(c.slice(2, 4), 16) * (1 - amount));
    const b = Math.round(parseInt(c.slice(4, 6), 16) * (1 - amount));
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

/** Lighten a hex color by a factor (0 = no change, 1 = pure white) */
export function lightenHex(hex: string, amount: number): string {
    const c = hex.replace('#', '');
    const r = Math.round(parseInt(c.slice(0, 2), 16) + (255 - parseInt(c.slice(0, 2), 16)) * amount);
    const g = Math.round(parseInt(c.slice(2, 4), 16) + (255 - parseInt(c.slice(2, 4), 16)) * amount);
    const b = Math.round(parseInt(c.slice(4, 6), 16) + (255 - parseInt(c.slice(4, 6), 16)) * amount);
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}
