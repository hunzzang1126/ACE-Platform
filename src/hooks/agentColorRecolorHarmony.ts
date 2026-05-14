// ─────────────────────────────────────────────────
// agentColorRecolorHarmony — Apply harmony colors by role
// ─────────────────────────────────────────────────
// ★ v745: Extracted from agentFlowHelpers.ts to stay under 400 lines.
// ─────────────────────────────────────────────────

import type { HarmonyPalette } from '@/services/colorHarmony';

const hexToRgb01 = (hex: string) => {
    const c = hex.replace('#', '');
    return {
        r: parseInt(c.slice(0, 2), 16) / 255,
        g: parseInt(c.slice(2, 4), 16) / 255,
        b: parseInt(c.slice(4, 6), 16) / 255,
    };
};

/** Apply harmony colors to all elements by role (text color + shape fill) */
export function applyHarmonyColors(elements: any[], harmony: HarmonyPalette): void {
    for (const el of elements) {
        const name = (el.name ?? '').toLowerCase();
        if (el.type === 'text') {
            if (name.includes('headline') && !name.includes('sub')) el.color_hex = harmony.headline;
            else if (name.includes('sub')) el.color_hex = harmony.subheadline;
            else if (name.includes('cta') || name.includes('label')) el.color_hex = harmony.accentForeground;
            else if (name.includes('tag')) el.color_hex = harmony.tag;
            else el.color_hex = harmony.body;
        } else if (name.includes('cta') || name.includes('button')) {
            const { r, g, b } = hexToRgb01(harmony.accent);
            el.r = r; el.g = g; el.b = b;
        } else if (name.includes('accent') || name.includes('badge') || name.includes('tag')) {
            const { r, g, b } = hexToRgb01(harmony.accent);
            el.r = r; el.g = g; el.b = b; el.a = el.a ?? 0.15;
        }
    }
}
