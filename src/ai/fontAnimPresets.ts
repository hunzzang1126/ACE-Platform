// ─────────────────────────────────────────────────
// fontAnimPresets.ts — Variable Font animation presets
// ─────────────────────────────────────────────────
// CSS font-variation-settings based text animations.
// Works with Variable Fonts only (Inter, Outfit, Playfair Display...)
// ─────────────────────────────────────────────────

export interface FontAnimPreset {
    id: string;
    label: string;
    labelKo: string;
    /** Variable font axis: wght (weight), wdth (width), slnt (slant) */
    axis: 'wght' | 'wdth' | 'slnt';
    from: number;
    to: number;
    /** Duration in seconds */
    duration: number;
    easing: string;
    direction: 'alternate' | 'normal';
    iterationCount: 'infinite' | number;
}

export const FONT_ANIM_PRESETS: FontAnimPreset[] = [
    {
        id: 'none',
        label: 'None',
        labelKo: 'None',
        axis: 'wght', from: 400, to: 400,
        duration: 0, easing: 'linear',
        direction: 'normal', iterationCount: 1,
    },
    {
        id: 'breathing',
        label: 'Weight Breathing',
        labelKo: 'Weight Breathing',
        axis: 'wght', from: 300, to: 700,
        duration: 2, easing: 'ease-in-out',
        direction: 'alternate', iterationCount: 'infinite',
    },
    {
        id: 'pulse',
        label: 'Weight Pulse',
        labelKo: 'Weight Pulse',
        axis: 'wght', from: 400, to: 900,
        duration: 0.6, easing: 'ease',
        direction: 'alternate', iterationCount: 'infinite',
    },
    {
        id: 'slow-morph',
        label: 'Slow Morph',
        labelKo: 'Slow Morph',
        axis: 'wght', from: 200, to: 800,
        duration: 4, easing: 'ease-in-out',
        direction: 'alternate', iterationCount: 'infinite',
    },
    {
        id: 'stretch',
        label: 'Width Stretch',
        labelKo: 'Width Stretch',
        axis: 'wdth', from: 75, to: 125,
        duration: 1.5, easing: 'ease-in-out',
        direction: 'alternate', iterationCount: 'infinite',
    },
    {
        id: 'lean',
        label: 'Slant Lean',
        labelKo: 'Slant Lean',
        axis: 'slnt', from: 0, to: -12,
        duration: 1, easing: 'ease-in-out',
        direction: 'alternate', iterationCount: 'infinite',
    },
];

/** Get preset by ID (returns 'none' if not found) */
export function getAnimPreset(id: string): FontAnimPreset {
    return FONT_ANIM_PRESETS.find(p => p.id === id) ?? FONT_ANIM_PRESETS[0];
}

/** Active presets (excluding 'none') */
export function getActivePresets(): FontAnimPreset[] {
    return FONT_ANIM_PRESETS.filter(p => p.id !== 'none');
}
