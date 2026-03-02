// ─────────────────────────────────────────────────
// Brand Palette Generator — OKLCH-based color harmony
// ─────────────────────────────────────────────────
// Given a single brand color, generates a complete 5-color palette
// using perceptual color harmony (OKLCH). Ensures WCAG AA contrast.
// Inspired by pro-color-harmonies (TS, OKLCH) and Primer Prism (GitHub).

// ── Types ──

export interface BrandPalette {
    primary: string;       // User's brand color
    secondary: string;     // Complementary harmony
    accent: string;        // High-contrast CTA color
    background: string;    // Auto-dark or light based on primary
    text: string;          // Guaranteed 4.5:1 contrast vs background
    surface: string;       // Card/overlay color
}

export type HarmonyMode = 'complementary' | 'split-complementary' | 'analogous' | 'triadic';

// ── Color Space Conversions ──

interface OklchColor {
    l: number;  // lightness 0-1
    c: number;  // chroma 0-0.4
    h: number;  // hue 0-360
}

interface RgbColor {
    r: number;  // 0-255
    g: number;
    b: number;
}

function hexToRgb(hex: string): RgbColor {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.substring(0, 2), 16) || 0,
        g: parseInt(clean.substring(2, 4), 16) || 0,
        b: parseInt(clean.substring(4, 6), 16) || 0,
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

// RGB → linear RGB
function srgbToLinear(c: number): number {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
    const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(s * 255);
}

// Linear RGB → OKLab → OKLCH (simplified)
function rgbToOklch(r: number, g: number, b: number): OklchColor {
    const lr = srgbToLinear(r);
    const lg = srgbToLinear(g);
    const lb = srgbToLinear(b);

    // Linear RGB → LMS (via OKLab matrix)
    const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

    const l3 = Math.cbrt(l_);
    const m3 = Math.cbrt(m_);
    const s3 = Math.cbrt(s_);

    const L = 0.2104542553 * l3 + 0.7936177850 * m3 - 0.0040720468 * s3;
    const a = 1.9779984951 * l3 - 2.4285922050 * m3 + 0.4505937099 * s3;
    const bVal = 0.0259040371 * l3 + 0.7827717662 * m3 - 0.8086757660 * s3;

    const C = Math.sqrt(a * a + bVal * bVal);
    let H = (Math.atan2(bVal, a) * 180) / Math.PI;
    if (H < 0) H += 360;

    return { l: L, c: C, h: H };
}

function oklchToRgb(oklch: OklchColor): RgbColor {
    const { l: L, c: C, h: H } = oklch;
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const bVal = C * Math.sin(hRad);

    // OKLab → LMS
    const l3 = L + 0.3963377774 * a + 0.2158037573 * bVal;
    const m3 = L - 0.1055613458 * a - 0.0638541728 * bVal;
    const s3 = L - 0.0894841775 * a - 1.2914855480 * bVal;

    const l_ = l3 * l3 * l3;
    const m_ = m3 * m3 * m3;
    const s_ = s3 * s3 * s3;

    // LMS → linear RGB
    const lr = +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
    const lg = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
    const lb = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_;

    return {
        r: linearToSrgb(lr),
        g: linearToSrgb(lg),
        b: linearToSrgb(lb),
    };
}

function oklchToHex(oklch: OklchColor): string {
    const { r, g, b } = oklchToRgb(oklch);
    return rgbToHex(r, g, b);
}

// ── Contrast Check (WCAG 2.1) ──

function luminance(r: number, g: number, b: number): number {
    return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function wcagContrast(hex1: string, hex2: string): number {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const l1 = luminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = luminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

// ── Harmony Calculations ──

function rotateHue(oklch: OklchColor, degrees: number): OklchColor {
    return { ...oklch, h: (oklch.h + degrees + 360) % 360 };
}

function adjustLightness(oklch: OklchColor, delta: number): OklchColor {
    return { ...oklch, l: Math.max(0, Math.min(1, oklch.l + delta)) };
}

// ── Public API ──

/**
 * Generate a complete 5-color brand palette from a single brand color.
 * Uses OKLCH color space for perceptually uniform results.
 *
 * @param brandHex - Primary brand color in hex (#RRGGBB)
 * @param mode - Harmony mode (default: auto-selects best)
 */
export function generateBrandPalette(
    brandHex: string,
    mode?: HarmonyMode,
): BrandPalette {
    const rgb = hexToRgb(brandHex);
    const primaryOklch = rgbToOklch(rgb.r, rgb.g, rgb.b);

    // Auto-select harmony mode if not specified
    const effectiveMode = mode ?? autoSelectHarmony(primaryOklch);

    // Generate secondary color based on harmony
    const secondaryOklch = computeHarmony(primaryOklch, effectiveMode);
    const secondary = oklchToHex(secondaryOklch);

    // Determine if brand is dark or light
    const isDark = primaryOklch.l < 0.55;

    // Generate background (opposite of brand luminance)
    const bgOklch: OklchColor = isDark
        ? { l: 0.12, c: primaryOklch.c * 0.15, h: primaryOklch.h }   // Dark bg
        : { l: 0.98, c: primaryOklch.c * 0.05, h: primaryOklch.h };  // Light bg
    const background = oklchToHex(bgOklch);

    // Generate surface (slightly lighter than background)
    const surfaceOklch = adjustLightness(bgOklch, isDark ? 0.06 : -0.03);
    const surface = oklchToHex(surfaceOklch);

    // Generate text (high contrast against background)
    let textColor = isDark ? '#F8FAFC' : '#0F172A';
    // Verify WCAG AA (4.5:1)
    if (wcagContrast(textColor, background) < 4.5) {
        textColor = isDark ? '#FFFFFF' : '#000000';
    }

    // Generate accent (CTA color — high contrast, vibrant)
    let accentOklch = rotateHue(primaryOklch, 30); // Slight hue shift
    accentOklch = { ...accentOklch, c: Math.min(accentOklch.c * 1.3, 0.35), l: 0.6 };
    let accent = oklchToHex(accentOklch);

    // Ensure accent has good contrast against background
    if (wcagContrast(accent, background) < 3) {
        accentOklch = { ...accentOklch, l: isDark ? 0.7 : 0.45 };
        accent = oklchToHex(accentOklch);
    }

    return {
        primary: brandHex,
        secondary,
        accent,
        background,
        text: textColor,
        surface,
    };
}

/**
 * Auto-select the best harmony mode for a given color.
 * Complementary for high-chroma colors, analogous for low-chroma.
 */
function autoSelectHarmony(color: OklchColor): HarmonyMode {
    if (color.c > 0.15) return 'complementary';
    if (color.c > 0.08) return 'split-complementary';
    return 'analogous';
}

/**
 * Compute harmony color from base color.
 */
function computeHarmony(base: OklchColor, mode: HarmonyMode): OklchColor {
    switch (mode) {
        case 'complementary':
            return rotateHue(base, 180);
        case 'split-complementary':
            return rotateHue(base, 150); // Use the "nice" side
        case 'analogous':
            return rotateHue(base, 30);
        case 'triadic':
            return rotateHue(base, 120);
    }
}

/**
 * Convert a BrandPalette to a prompt-friendly string for AI context.
 */
export function paletteToPromptSection(palette: BrandPalette): string {
    return `### Brand Palette (USE THESE COLORS):
- Primary:    ${palette.primary}
- Secondary:  ${palette.secondary}
- Accent/CTA: ${palette.accent}
- Background: ${palette.background}
- Text:       ${palette.text}
- Surface:    ${palette.surface}
Always use these exact colors. CTA buttons must use the Accent color.`;
}
