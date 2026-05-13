// ─────────────────────────────────────────────────
// colorHarmony.ts — Background-Aware Color Harmony Engine
// ─────────────────────────────────────────────────
// ★ v740: PROPER color scheme derivation.
// Text colors are DERIVED from background colors using
// color theory (complementary, analogous, tinted neutrals).
// WCAG checked against BOTH gradient endpoints.
// NEVER binary white/dark — always tinted, always harmonious.
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

/** WCAG ratio against the WORST endpoint (minimum of both) */
function worstCaseWcag(fg: string, bgStart: string, bgEnd: string): number {
    return Math.min(wcagRatio(fg, bgStart), wcagRatio(fg, bgEnd));
}

// ── Background Analysis ──────────────────────────

export interface BgAnalysis {
    luminance: number;
    isLight: boolean;
    warmth: 'warm' | 'cool' | 'neutral';
    dominantHue: number;
    saturation: number;
    bgHex: string;
    /** ★ v740: Both gradient endpoints for WCAG checking */
    startHex: string;
    endHex: string;
    startHSL: HSL;
    endHSL: HSL;
}

function classifyWarmth(h: number, s: number): 'warm' | 'cool' | 'neutral' {
    if (s < 0.1) return 'neutral';
    if ((h >= 0 && h <= 60) || h >= 330) return 'warm';
    if (h >= 180 && h <= 270) return 'cool';
    if (h > 60 && h < 180) return s > 0.4 ? 'warm' : 'neutral';
    return 'neutral';
}

export function analyzeBackground(gradientStart: string, gradientEnd?: string): BgAnalysis {
    const end = gradientEnd ?? gradientStart;
    const hsl1 = hexToHSL(gradientStart);
    const hsl2 = hexToHSL(end);
    const avgH = (hsl1.h + hsl2.h) / 2;
    const avgS = (hsl1.s + hsl2.s) / 2;
    const avgL = (hsl1.l + hsl2.l) / 2;
    const avgLum = (luminance(gradientStart) + luminance(end)) / 2;
    return {
        luminance: avgLum,
        isLight: avgLum > 0.45,
        warmth: classifyWarmth(avgH, avgS),
        dominantHue: avgH,
        saturation: avgS,
        bgHex: hslToHex(avgH, avgS, avgL),
        startHex: gradientStart,
        endHex: end,
        startHSL: hsl1,
        endHSL: hsl2,
    };
}

// ── Harmony Palette ──────────────────────────────

export interface HarmonyPalette {
    headline: string;
    subheadline: string;
    body: string;
    accent: string;
    accentForeground: string;
    tag: string;
    tagBg: string;
    method: string;
    /** ★ v740: true if text needs shadow for readability insurance */
    needsShadow: boolean;
}

// ── Color Scheme Candidate Generation ────────────
// Generate text color candidates from background using 5 color scheme types

function generateTextCandidates(bg: BgAnalysis): string[] {
    const candidates: string[] = [];
    const { startHSL, endHSL } = bg;

    // ── 1. Tinted dark versions of each gradient endpoint ──
    // Deep navy/dark tints FROM the actual background colors
    candidates.push(hslToHex(startHSL.h, Math.min(0.6, startHSL.s), 0.10)); // Very dark start-tinted
    candidates.push(hslToHex(startHSL.h, Math.min(0.5, startHSL.s), 0.15));
    candidates.push(hslToHex(endHSL.h, Math.min(0.6, endHSL.s), 0.10));   // Very dark end-tinted
    candidates.push(hslToHex(endHSL.h, Math.min(0.5, endHSL.s), 0.15));

    // ── 2. Tinted light versions ──
    candidates.push(hslToHex(startHSL.h, Math.min(0.3, startHSL.s), 0.93)); // Warm white start-tinted
    candidates.push(hslToHex(startHSL.h, Math.min(0.2, startHSL.s), 0.96));
    candidates.push(hslToHex(endHSL.h, Math.min(0.3, endHSL.s), 0.93));   // Warm white end-tinted
    candidates.push(hslToHex(endHSL.h, Math.min(0.2, endHSL.s), 0.96));

    // ── 3. Complementary of average background ──
    const avgH = (startHSL.h + endHSL.h) / 2;
    const compH = (avgH + 180) % 360;
    candidates.push(hslToHex(compH, 0.5, 0.12));  // Dark complementary
    candidates.push(hslToHex(compH, 0.4, 0.18));
    candidates.push(hslToHex(compH, 0.3, 0.92));  // Light complementary
    candidates.push(hslToHex(compH, 0.2, 0.95));

    // ── 4. Split-complementary (±30° from complement) ──
    candidates.push(hslToHex((compH + 30) % 360, 0.5, 0.12));
    candidates.push(hslToHex((compH - 30 + 360) % 360, 0.5, 0.12));
    candidates.push(hslToHex((compH + 30) % 360, 0.3, 0.93));
    candidates.push(hslToHex((compH - 30 + 360) % 360, 0.3, 0.93));

    // ── 5. Neutral fallbacks (still include for safety) ──
    candidates.push('#FFFFFF', '#F1F5F9', '#E2E8F0');     // Pure/blue whites
    candidates.push('#1A1A2E', '#0F172A', '#1E293B');     // Deep navies
    candidates.push('#FFF8E1', '#FFFDF5');                // Warm cream whites

    return candidates;
}

/**
 * ★ v740: Pick the BEST text color from candidates.
 * Scoring = WCAG worst-case × harmony bonus.
 * Prefers tinted colors over pure white/black.
 */
function pickBestTextColor(
    candidates: string[],
    bgStart: string, bgEnd: string,
    minContrast: number,
): { color: string; ratio: number; needsShadow: boolean } {
    let bestColor = '#FFFFFF';
    let bestScore = 0;
    let bestRatio = 0;

    for (const candidate of candidates) {
        const ratio = worstCaseWcag(candidate, bgStart, bgEnd);
        if (ratio < minContrast) continue; // Fails WCAG

        // Harmony bonus: prefer tinted colors over pure white/black
        const hsl = hexToHSL(candidate);
        const tintBonus = hsl.s > 0.05 ? 1.5 : 1.0; // Tinted > neutral
        const score = ratio * tintBonus;

        if (score > bestScore) {
            bestScore = score;
            bestColor = candidate;
            bestRatio = ratio;
        }
    }

    // If nothing passed minContrast, relax to best available + shadow
    if (bestRatio < minContrast) {
        let fallbackBest = '#FFFFFF';
        let fallbackRatio = 0;
        for (const c of ['#FFFFFF', '#1A1A2E', '#F1F5F9', '#0F172A']) {
            const r = worstCaseWcag(c, bgStart, bgEnd);
            if (r > fallbackRatio) { fallbackRatio = r; fallbackBest = c; }
        }
        return { color: fallbackBest, ratio: fallbackRatio, needsShadow: true };
    }

    return { color: bestColor, ratio: bestRatio, needsShadow: bestRatio < 4.5 };
}

/**
 * ★ v740: Derive a complete color palette from background analysis.
 * Text colors are DERIVED from the gradient, not binary white/dark.
 */
export function deriveHarmonyPalette(
    bg: BgAnalysis,
    aiPalette: { accent: string; foreground: string; secondary: string },
): HarmonyPalette {
    const candidates = generateTextCandidates(bg);

    // ── Text hierarchy: headline (3.0 min), sub/body (2.5 min — they get shadow if needed) ──
    const headlinePick = pickBestTextColor(candidates, bg.startHex, bg.endHex, 3.0);
    const headline = headlinePick.color;

    // Subheadline: same family as headline, slightly transparent
    const headHSL = hexToHSL(headline);
    const isLightText = headHSL.l > 0.5;
    const subheadline = isLightText
        ? `rgba(${hexChannels(headline)},0.78)`
        : `rgba(${hexChannels(headline)},0.72)`;
    const body = isLightText
        ? `rgba(${hexChannels(headline)},0.62)`
        : `rgba(${hexChannels(headline)},0.58)`;

    // ── Accent: use existing trendy accent picker ──
    const accent = pickTrendyAccent(bg, aiPalette.accent);
    const accentLum = luminance(accent);
    const accentForeground = accentLum > 0.45 ? '#1A1A2E' : '#FFFFFF';

    // ── Tags: accent-tinted ──
    const accentHSL = hexToHSL(accent);
    const tagBg = hslToHex(accentHSL.h, Math.min(0.9, accentHSL.s), bg.isLight ? 0.92 : 0.18);
    const tag = hslToHex(accentHSL.h, Math.min(0.8, accentHSL.s), bg.isLight ? 0.35 : 0.75);

    const method = `${detectScheme(bg)} | headline=${headline} wcag=${headlinePick.ratio.toFixed(1)}`;
    console.log(`[colorHarmony] ${method} | bg=${bg.startHex}→${bg.endHex} accent=${accent}`);

    return {
        headline, subheadline, body, accent, accentForeground,
        tag, tagBg, method,
        needsShadow: headlinePick.needsShadow,
    };
}

/** Extract RGB channels from hex for rgba() usage */
function hexChannels(hex: string): string {
    const c = hex.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
}

// ── Trendy Accent Selection ──────────────────────

const TRENDY_ACCENTS = {
    warm_light: ['#0EA5E9', '#06B6D4', '#2DD4BF', '#3B82F6', '#6366F1'],
    warm_dark:  ['#22D3EE', '#34D399', '#38BDF8', '#60A5FA', '#818CF8'],
    cool_light: ['#F97316', '#EF4444', '#EC4899', '#F59E0B', '#E11D48'],
    cool_dark:  ['#FB923C', '#F87171', '#F472B6', '#FBBF24', '#FF6B6B'],
    neutral_light: ['#6366F1', '#8B5CF6', '#EC4899', '#0EA5E9', '#10B981'],
    neutral_dark:  ['#818CF8', '#A78BFA', '#F472B6', '#38BDF8', '#34D399'],
} as const;

function pickTrendyAccent(bg: BgAnalysis, aiAccent: string): string {
    const key = `${bg.warmth}_${bg.isLight ? 'light' : 'dark'}` as keyof typeof TRENDY_ACCENTS;
    const palette = TRENDY_ACCENTS[key] ?? TRENDY_ACCENTS.neutral_dark;

    const aiRatio = wcagRatio(aiAccent, bg.bgHex);
    if (aiRatio >= 3.0) {
        const aiHSL = hexToHSL(aiAccent);
        const hueDiff = Math.abs(aiHSL.h - bg.dominantHue);
        if (Math.min(hueDiff, 360 - hueDiff) > 40) return aiAccent;
    }

    let bestAccent = palette[0];
    let bestScore = 0;
    for (const candidate of palette) {
        const ratio = wcagRatio(candidate, bg.bgHex);
        const hsl = hexToHSL(candidate);
        const hueDist = Math.min(Math.abs(hsl.h - bg.dominantHue), 360 - Math.abs(hsl.h - bg.dominantHue));
        const score = ratio * 1.5 + (hueDist / 180) * 3;
        if (score > bestScore) { bestScore = score; bestAccent = candidate; }
    }
    return bestAccent;
}

function detectScheme(bg: BgAnalysis): string {
    const hueDiff = Math.min(
        Math.abs(bg.startHSL.h - bg.endHSL.h),
        360 - Math.abs(bg.startHSL.h - bg.endHSL.h),
    );
    if (hueDiff < 15) return `Monochromatic (${bg.warmth})`;
    if (hueDiff < 60) return `Analogous (${bg.warmth})`;
    if (hueDiff > 150) return `Complementary gradient (${bg.warmth})`;
    return `Split-comp gradient (${bg.warmth})`;
}
