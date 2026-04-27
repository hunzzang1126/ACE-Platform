// ─────────────────────────────────────────────────
// bannerDesignPrompt — Design system prompt builder
// ─────────────────────────────────────────────────
// Blueprint data → layoutBlueprints.ts
// ─────────────────────────────────────────────────

import type { AspectCategory } from '@/schema/layoutRoles';
import { BANNER_BLUEPRINTS, SOCIAL_BLUEPRINTS, type LayoutBlueprint } from './layoutBlueprints';

export type { LayoutBlueprint };

// ── Color Palettes ──

const DEFAULT_DARK_PALETTE = `
COLOR PALETTE (Dark — high contrast for ads):
- Background:  #0F172A (deep navy)
- Surface:     #1E293B (card/overlay)
- Text:        #F8FAFC (white)
- Accent:      #3B82F6 (blue CTA — high CTR)
- Accent-Alt:  #10B981 (green — sale/deal)
- Warning:     #F59E0B (urgency/limited offer)
- Border:      #334155
`;

const DEFAULT_LIGHT_PALETTE = `
COLOR PALETTE (Light — clean, professional):
- Background:  #FFFFFF
- Surface:     #F8FAFC
- Text:        #0F172A (dark navy)
- Text-Light:  #475569 (secondary text)
- Accent:      #2563EB (blue CTA)
- Accent-Alt:  #0EA5E9 (sky blue)
- Border:      #E2E8F0
`;

// ── Golden Rules ──

const GOLDEN_RULES = `
LAYOUT RULES: Logo visible (top corner, 10-15%). Headline = largest text (max 3 lines). CTA = contrasting color (min 44x44px). 8px safe zone from edges. Max 5 elements. Image bg: use overlay for text readability.
`;

const COPYWRITING_RULES = `
COPY: Headline 2-5 words. Subhead ≤12 words. CTA 1-3 words. No lorem ipsum. Power words: Free, New, Save, Now.
`;

const TYPOGRAPHY_SYSTEM = `
TYPO: Inter default. Headline 700/1.1, Subhead 600/1.3, CTA 700/1.0. Tight headline tracking (-0.5px). Center for stack, left for split.
`;

// ── Public API ──

export function getLayoutBlueprint(width: number, height: number): LayoutBlueprint | null {
    const key = `${width}x${height}`;
    const bannerMatch = BANNER_BLUEPRINTS[key];
    if (bannerMatch) return bannerMatch;
    const ratio = width / height;
    if (Math.abs(ratio - 9 / 16) < 0.05) return SOCIAL_BLUEPRINTS['9:16'] ?? null;
    if (Math.abs(ratio - 1) < 0.05) return SOCIAL_BLUEPRINTS['1:1'] ?? null;
    if (Math.abs(ratio - 4 / 5) < 0.05) return SOCIAL_BLUEPRINTS['4:5'] ?? null;
    if (Math.abs(ratio - 16 / 9) < 0.05) return SOCIAL_BLUEPRINTS['16:9'] ?? null;
    return null;
}

export function buildDesignSystemPrompt(
    width: number, height: number, aspectCategory: AspectCategory,
    brandColors?: { primary: string; secondary?: string },
): string {
    const sections: string[] = ['## Design System Guidelines'];
    const blueprint = getLayoutBlueprint(width, height);
    if (blueprint) {
        sections.push(`\n### Layout Blueprint: ${blueprint.sizeLabel}`);
        sections.push(`Format: ${blueprint.description}`);
        sections.push(`Layout: ${blueprint.layout}, Padding: ${blueprint.padding}px, Max elements: ${blueprint.maxElements}`);
        sections.push('\nElement Positions:');
        for (const [role, pos] of Object.entries(blueprint.elementPositions)) sections.push(`- ${role}: ${pos}`);
        sections.push('\nTypography Scale (min-max px):');
        for (const [role, [min, max]] of Object.entries(blueprint.typographyScale)) sections.push(`- ${role}: ${min}-${max}px`);
    } else {
        sections.push(`\n### Canvas: ${width}×${height} (${aspectCategory})`);
        sections.push('Use centered stack layout. Adapt typography to canvas size proportionally.');
    }
    if (brandColors) {
        sections.push('\n### Brand Colors (USE THESE)');
        sections.push(`- Primary: ${brandColors.primary}`);
        if (brandColors.secondary) sections.push(`- Secondary: ${brandColors.secondary}`);
        sections.push('Generate complementary accent, background, and text colors from brand primary.');
    } else { sections.push(DEFAULT_DARK_PALETTE); }
    sections.push(GOLDEN_RULES, COPYWRITING_RULES, TYPOGRAPHY_SYSTEM);
    return sections.join('\n');
}

export function getAvailableBlueprintSizes(): string[] {
    return [...Object.keys(BANNER_BLUEPRINTS), ...Object.values(SOCIAL_BLUEPRINTS).map(b => b.sizeLabel)];
}
