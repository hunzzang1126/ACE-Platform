// ─────────────────────────────────────────────────
// colorHarmony.ts — Background-Aware Color Harmony Engine
// ─────────────────────────────────────────────────
// ★ v737: All element colors are determined AFTER analyzing
// the background. Zero API cost — pure color theory.
//
// Techniques: complementary, split-complementary, analogous,
// warm/cool temperature contrast, WCAG luminance.
// ─────────────────────────────────────────────────

// ── HSL Utilities ────────────────────────────────

export interface HSL { h: number; s: number; l: number; }

export function hexToHSL(hex: string): HSL {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function luminance(hex: string): number {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const f = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function wcagRatio(fg: string, bg: string): number {
    const l1 = luminance(fg), l2 = luminance(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// ── Background Analysis ──────────────────────────

export interface BgAnalysis {
    luminance: number;     // 0 (black) to 1 (white)
    isLight: boolean;      // luminance > 0.45
    isColorful: boolean;   // ★ v739: high-saturation gradient with big hue difference
    warmth: 'warm' | 'cool' | 'neutral';
    dominantHue: number;   // 0-360
    saturation: number;    // 0-1
    bgHex: string;         // representative background color
}

/** Classify hue into warm/cool/neutral */
function classifyWarmth(h: number, s: number): 'warm' | 'cool' | 'neutral' {
    if (s < 0.1) return 'neutral';
    // Warm: reds, oranges, yellows (0-60, 330-360)
    if ((h >= 0 && h <= 60) || h >= 330) return 'warm';
    // Cool: blues, blue-greens (180-270)
    if (h >= 180 && h <= 270) return 'cool';
    // In-between zones
    if (h > 60 && h < 180) return s > 0.4 ? 'warm' : 'neutral';
    return 'neutral';
}

/**
 * Analyze background color(s) for harmony decisions.
 * Works with gradient colors or a single solid color.
 */
export function analyzeBackground(
    gradientStart: string,
    gradientEnd?: string,
): BgAnalysis {
    const hsl1 = hexToHSL(gradientStart);
    const hsl2 = gradientEnd ? hexToHSL(gradientEnd) : hsl1;
    const avgH = (hsl1.h + hsl2.h) / 2;
    const avgS = (hsl1.s + hsl2.s) / 2;
    const avgL = (hsl1.l + hsl2.l) / 2;
    const lum1 = luminance(gradientStart);
    const lum2 = luminance(gradientEnd ?? gradientStart);
    const avgLum = (lum1 + lum2) / 2;
    // ★ v739: Detect colorful gradients (blue→yellow, red→green etc.)
    // These have high saturation + big hue/luminance difference.
    // No single text color works everywhere → force white + shadow.
    const hueDiff = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h));
    const lumDiff = Math.abs(lum1 - lum2);
    const isColorful = avgS > 0.3 && (hueDiff > 60 || lumDiff > 0.3);
    return {
        luminance: avgLum,
        isLight: avgLum > 0.45,
        isColorful,
        warmth: classifyWarmth(avgH, avgS),
        dominantHue: avgH,
        saturation: avgS,
        bgHex: hslToHex(avgH, avgS, avgL),
    };
}

// ── Harmony Palette ──────────────────────────────

export interface HarmonyPalette {
    headline: string;
    subheadline: string;
    body: string;
    accent: string;          // CTA background, decorative shapes
    accentForeground: string; // Text on accent backgrounds
    tag: string;             // Tag/badge text
    tagBg: string;           // Tag/badge background
    method: string;          // Which harmony method was used
}

/**
 * ★ Core function: derive a trendy color palette from background analysis.
 * Uses the AI palette as a "hint" but overrides based on background.
 */
export function deriveHarmonyPalette(
    bg: BgAnalysis,
    aiPalette: { accent: string; foreground: string; secondary: string },
): HarmonyPalette {
    const bgHSL = hexToHSL(bg.bgHex);

    // ── Step 1: Determine text colors based on luminance ──
    let headline: string;
    let subheadline: string;
    let body: string;

    // ★ v739: Colorful gradients (blue+yellow, etc.) → always white + shadow
    if (bg.isColorful) {
        headline = '#FFFFFF';
        subheadline = 'rgba(255,255,255,0.85)';
        body = 'rgba(255,255,255,0.72)';
    } else if (bg.isLight) {
        headline = '#1A1A2E';
        subheadline = 'rgba(26,26,46,0.65)';
        body = 'rgba(26,26,46,0.55)';
    } else {
        headline = '#FFFFFF';
        subheadline = 'rgba(255,255,255,0.72)';
        body = 'rgba(255,255,255,0.55)';
    }

    // ── Step 2: Determine accent using color theory ──
    const accent = pickTrendyAccent(bg, aiPalette.accent);

    // ── Step 3: Ensure accent has good contrast ──
    const accentLum = luminance(accent);
    const accentForeground = accentLum > 0.45 ? '#1A1A2E' : '#FFFFFF';

    // ── Step 4: Tag colors (accent-tinted) ──
    const accentHSL = hexToHSL(accent);
    const tagBg = hslToHex(accentHSL.h, Math.min(0.9, accentHSL.s), bg.isLight ? 0.92 : 0.18);
    const tag = hslToHex(accentHSL.h, Math.min(0.8, accentHSL.s), bg.isLight ? 0.35 : 0.75);

    // ── Step 5: Refine subheadline for mid-luminance backgrounds ──
    // Mid-range backgrounds (0.35-0.55) need special handling
    // ★ v739: Skip for colorful gradients (already forced white above)
    if (!bg.isColorful && bg.luminance > 0.35 && bg.luminance < 0.55) {
        headline = bg.luminance > 0.45 ? '#1A1A2E' : '#FFFFFF';
        const subAlpha = bg.luminance > 0.45 ? '0.72' : '0.75';
        subheadline = bg.luminance > 0.45
            ? `rgba(26,26,46,${subAlpha})`
            : `rgba(255,255,255,${subAlpha})`;
    }

    const method = detectMethod(bg, aiPalette.accent, accent);
    console.log(`[colorHarmony] ${method} | bg lum=${bg.luminance.toFixed(2)} warmth=${bg.warmth} | accent=${accent} headline=${headline}`);

    return { headline, subheadline, body, accent, accentForeground, tag, tagBg, method };
}

// ── Trendy Accent Selection ──────────────────────

/** Curated trendy accent palettes by temperature + luminance */
const TRENDY_ACCENTS = {
    // Warm background → cool accents (beach, sunset, food)
    warm_light: ['#0EA5E9', '#06B6D4', '#2DD4BF', '#3B82F6', '#6366F1'],
    warm_dark:  ['#22D3EE', '#34D399', '#38BDF8', '#60A5FA', '#818CF8'],
    // Cool background → warm accents (tech, night, ocean)
    cool_light: ['#F97316', '#EF4444', '#EC4899', '#F59E0B', '#E11D48'],
    cool_dark:  ['#FB923C', '#F87171', '#F472B6', '#FBBF24', '#FF6B6B'],
    // Neutral background → vibrant universal accents
    neutral_light: ['#6366F1', '#8B5CF6', '#EC4899', '#0EA5E9', '#10B981'],
    neutral_dark:  ['#818CF8', '#A78BFA', '#F472B6', '#38BDF8', '#34D399'],
} as const;

function pickTrendyAccent(bg: BgAnalysis, aiAccent: string): string {
    const key = `${bg.warmth}_${bg.isLight ? 'light' : 'dark'}` as keyof typeof TRENDY_ACCENTS;
    const palette = TRENDY_ACCENTS[key] ?? TRENDY_ACCENTS.neutral_dark;

    // Check if AI's accent already has good contrast with background
    const aiRatio = wcagRatio(aiAccent, bg.bgHex);
    if (aiRatio >= 3.0) {
        // AI accent works — but verify it's not too similar to bg hue
        const aiHSL = hexToHSL(aiAccent);
        const hueDiff = Math.abs(aiHSL.h - bg.dominantHue);
        const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
        if (normalizedDiff > 40) return aiAccent; // AI accent is distinct enough
    }

    // Pick the curated accent with best contrast against bg
    let bestAccent = palette[0];
    let bestScore = 0;
    for (const candidate of palette) {
        const ratio = wcagRatio(candidate, bg.bgHex);
        const hsl = hexToHSL(candidate);
        const hueDist = Math.min(
            Math.abs(hsl.h - bg.dominantHue),
            360 - Math.abs(hsl.h - bg.dominantHue),
        );
        // Score: contrast ratio + hue distance bonus (prefer complementary)
        const score = ratio * 1.5 + (hueDist / 180) * 3;
        if (score > bestScore) { bestScore = score; bestAccent = candidate; }
    }
    return bestAccent;
}

function detectMethod(bg: BgAnalysis, aiAccent: string, finalAccent: string): string {
    if (aiAccent === finalAccent) return `AI accent preserved (${bg.warmth})`;
    const bgHSL = hexToHSL(bg.bgHex);
    const accHSL = hexToHSL(finalAccent);
    const hueDiff = Math.min(
        Math.abs(accHSL.h - bgHSL.h),
        360 - Math.abs(accHSL.h - bgHSL.h),
    );
    if (hueDiff > 150) return `Complementary (${bg.warmth} bg → cool accent)`;
    if (hueDiff > 90) return `Split-complementary (${bg.warmth})`;
    return `Temperature contrast (${bg.warmth} bg → ${bg.warmth === 'warm' ? 'cool' : 'warm'} accent)`;
}
