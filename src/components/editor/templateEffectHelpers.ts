// ─────────────────────────────────────────────────
// templateEffectHelpers — CSS rendering for text effects in previews
// ─────────────────────────────────────────────────
// Converts textEffect (glow, neon, outline, etc.) to CSS text-shadow.
// Used by TemplatePreviewCard.tsx and SidebarTemplateTab.tsx.
// Mirrors the Fabric.js logic from shimTextEffects.ts.
// ─────────────────────────────────────────────────

/** Convert textEffect type+intensity+color → CSS text-shadow string */
export function textEffectToCSS(effectType: string, intensity: number, color: string): string | undefined {
    const scale = intensity / 50;
    switch (effectType) {
        case 'drop':
            return `${Math.round(4 * scale)}px ${Math.round(4 * scale)}px ${Math.round(8 * scale)}px ${color}cc`;
        case 'glow':
            return `0 0 ${Math.round(20 * scale)}px ${color}80`;
        case 'echo':
            return `${Math.round(6 * scale)}px ${Math.round(6 * scale)}px 0 ${color}40`;
        case 'neon':
            return [
                `0 0 ${Math.round(8 * scale)}px ${color}`,
                `0 0 ${Math.round(20 * scale)}px ${color}80`,
                `0 0 ${Math.round(40 * scale)}px ${color}40`,
            ].join(', ');
        case 'glitch':
            return `${Math.round(-3 * scale)}px 0 0 #00ffff, ${Math.round(3 * scale)}px 0 0 #ff0000`;
        case 'curve':
            return `0 ${Math.round(2 * scale)}px ${Math.round(4 * scale)}px ${color}30`;
        case '70s':
            return `${Math.round(4 * scale)}px ${Math.round(4 * scale)}px 0 #ff8c0060`;
        default:
            return undefined;
    }
}

/** Parse shadow color string → [r,g,b,a] floats (0-1) for engine API calls */
export function parseShadowColorForEngine(color: string): [number, number, number, number] {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) return [parseInt(m[1]!) / 255, parseInt(m[2]!) / 255, parseInt(m[3]!) / 255, m[4] !== undefined ? parseFloat(m[4]!) : 1.0];
    const hex = color.replace('#', '');
    if (hex.length >= 6) return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, 1.0];
    return [0, 0, 0, 0.5];
}
