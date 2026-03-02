// ─────────────────────────────────────────────────
// Banner Role Resolver — Auto-defaults per LayoutRole
// ─────────────────────────────────────────────────
// When AI generates an element with a role, this resolver fills in
// any missing properties with smart defaults. Inspired by Pencil's
// role-resolver.ts (436 lines, 22+ roles).
//
// For banners, this means: an element with role="cta" will auto-get
// proper fontSize, fontWeight, padding, cornerRadius, colors,
// even if the AI didn't specify them explicitly.

import type { LayoutRole, AspectCategory } from '@/schema/layoutRoles';
import { getAspectCategory } from '@/schema/layoutRoles';
import type {
    DesignElement,
    TextElement,
    ShapeElement,
    ButtonElement,
} from '@/schema/elements.types';
import { getLayoutBlueprint } from '@/ai/prompts/bannerDesignPrompt';

// ── Role Default Definitions ──

interface RoleDefaults {
    // Text properties
    fontSize?: number;
    fontWeight?: number;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;
    letterSpacing?: number;
    // Shape/button properties
    borderRadius?: number;
    // Position hints (percentage of canvas)
    preferredX?: number; // 0-1 ratio
    preferredY?: number; // 0-1 ratio
    preferredWidth?: number; // 0-1 ratio
    preferredHeight?: number; // px or 0-1 ratio
    // Z-index
    zIndex?: number;
}

type RoleRuleFn = (
    canvasW: number,
    canvasH: number,
    category: AspectCategory,
) => RoleDefaults;

// ── Role Registry ──

const roleRules = new Map<LayoutRole, RoleRuleFn>();

// HEADLINE: largest text, center of visual weight
roleRules.set('headline', (w, h, cat) => {
    const blueprint = getLayoutBlueprint(w, h);
    const [minFs, maxFs] = blueprint?.typographyScale.headline ?? [22, 28];
    const fontSize = Math.round((minFs + maxFs) / 2);
    return {
        fontSize,
        fontWeight: 700,
        textAlign: cat === 'ultra-wide' ? 'left' : 'center',
        lineHeight: 1.15,
        letterSpacing: -0.5,
        zIndex: 10,
    };
});

// SUBLINE: secondary text, lighter
roleRules.set('subline', (w, h, cat) => {
    const blueprint = getLayoutBlueprint(w, h);
    const [minFs, maxFs] = blueprint?.typographyScale.subhead ?? [14, 16];
    const fontSize = Math.round((minFs + maxFs) / 2);
    return {
        fontSize,
        fontWeight: 400,
        textAlign: cat === 'ultra-wide' ? 'left' : 'center',
        lineHeight: 1.4,
        letterSpacing: 0,
        zIndex: 11,
    };
});

// CTA: prominent button, contrasting color
roleRules.set('cta', (w, h) => {
    const blueprint = getLayoutBlueprint(w, h);
    const [minFs, maxFs] = blueprint?.typographyScale.cta ?? [14, 16];
    const fontSize = Math.round((minFs + maxFs) / 2);
    const isSmall = w * h < 50000; // tiny banners like 320x50
    return {
        fontSize,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.0,
        borderRadius: isSmall ? 4 : 8,
        zIndex: 15,
    };
});

// LOGO: small, corner-anchored
roleRules.set('logo', (w, h) => {
    const maxDim = Math.min(w, h) * 0.15; // 15% of smallest dimension
    return {
        preferredWidth: maxDim / w,
        preferredHeight: maxDim / h,
        zIndex: 5,
    };
});

// BACKGROUND: full canvas fill
roleRules.set('background', () => ({
    preferredX: 0,
    preferredY: 0,
    preferredWidth: 1,
    preferredHeight: 1,
    zIndex: 0,
}));

// HERO: hero image, fills available space
roleRules.set('hero', (_w, _h, cat) => ({
    preferredWidth: cat === 'ultra-wide' ? 0.4 : 0.8,
    preferredHeight: cat === 'portrait' ? 0.4 : 0.6,
    zIndex: 1,
}));

// TNC: tiny legal text, always bottom
roleRules.set('tnc', (w, h) => {
    const blueprint = getLayoutBlueprint(w, h);
    const [minFs] = blueprint?.typographyScale.legal ?? [8, 10];
    return {
        fontSize: minFs,
        fontWeight: 400,
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 0,
        preferredY: 0.95, // bottom 5%
        zIndex: 16,
    };
});

// DETAIL: supporting text lines
roleRules.set('detail', (w, h) => {
    const blueprint = getLayoutBlueprint(w, h);
    const [minFs, maxFs] = blueprint?.typographyScale.body ?? [12, 14];
    const fontSize = Math.round((minFs + maxFs) / 2);
    return {
        fontSize,
        fontWeight: 400,
        textAlign: 'center',
        lineHeight: 1.4,
        zIndex: 12,
    };
});

// ACCENT: decorative element
roleRules.set('accent', () => ({
    zIndex: 2,
}));

// BADGE: overlay badge ("NEW", "50% OFF")
roleRules.set('badge', (w, h) => {
    const blueprint = getLayoutBlueprint(w, h);
    const [minFs] = blueprint?.typographyScale.cta ?? [14, 16];
    return {
        fontSize: Math.max(minFs - 2, 10),
        fontWeight: 700,
        textAlign: 'center',
        borderRadius: 4,
        zIndex: 20,
    };
});

// ── Public API ──

/**
 * Apply role-based defaults to a design element.
 * Only fills properties that are NOT already explicitly set.
 * The explicit properties always win — role defaults only fill gaps.
 *
 * Returns a partial update object (patch) — does NOT mutate the element.
 */
export function resolveRoleDefaults(
    element: DesignElement,
    canvasWidth: number,
    canvasHeight: number,
): Partial<DesignElement> | null {
    if (!element.role) return null;

    const ruleFn = roleRules.get(element.role);
    if (!ruleFn) return null;

    const category = getAspectCategory(canvasWidth, canvasHeight);
    const defaults = ruleFn(canvasWidth, canvasHeight, category);

    // Build patch — only include properties that differ from current
    const patch: Record<string, unknown> = {};

    // Text element defaults
    if (element.type === 'text') {
        const text = element as TextElement;
        if (defaults.fontSize && text.fontSize === 16) {
            patch.fontSize = defaults.fontSize;
        }
        if (defaults.fontWeight && text.fontWeight === 400) {
            patch.fontWeight = defaults.fontWeight;
        }
        if (defaults.textAlign && text.textAlign === 'left') {
            patch.textAlign = defaults.textAlign;
        }
        if (defaults.lineHeight && text.lineHeight === 1.2) {
            patch.lineHeight = defaults.lineHeight;
        }
        if (defaults.letterSpacing !== undefined && text.letterSpacing === 0) {
            patch.letterSpacing = defaults.letterSpacing;
        }
    }

    // Button element defaults
    if (element.type === 'button') {
        const btn = element as ButtonElement;
        if (defaults.fontSize && btn.fontSize === 16) {
            patch.fontSize = defaults.fontSize;
        }
        if (defaults.fontWeight && btn.fontWeight === 400) {
            patch.fontWeight = defaults.fontWeight;
        }
        if (defaults.borderRadius !== undefined && btn.borderRadius === 0) {
            patch.borderRadius = defaults.borderRadius;
        }
    }

    // Shape element defaults
    if (element.type === 'shape') {
        const shape = element as ShapeElement;
        if (defaults.borderRadius !== undefined && !shape.borderRadius) {
            patch.borderRadius = defaults.borderRadius;
        }
    }

    // Z-index (universal)
    if (defaults.zIndex !== undefined && element.zIndex === 0) {
        patch.zIndex = defaults.zIndex;
    }

    return Object.keys(patch).length > 0 ? (patch as Partial<DesignElement>) : null;
}

/**
 * Apply role defaults to ALL elements in a variant.
 * Returns an array of { elementId, patch } for elements that need updates.
 * Does NOT mutate any elements.
 */
export function resolveAllRoleDefaults(
    elements: DesignElement[],
    canvasWidth: number,
    canvasHeight: number,
): Array<{ elementId: string; patch: Partial<DesignElement> }> {
    const patches: Array<{ elementId: string; patch: Partial<DesignElement> }> = [];

    for (const el of elements) {
        const patch = resolveRoleDefaults(el, canvasWidth, canvasHeight);
        if (patch) {
            patches.push({ elementId: el.id, patch });
        }
    }

    return patches;
}

/**
 * Get the recommended typography for a specific role at a given canvas size.
 * Useful for UI hints (e.g., "Recommended: 22-28px for headlines at this size").
 */
export function getRoleTypographyHint(
    role: LayoutRole,
    canvasWidth: number,
    canvasHeight: number,
): { minFs: number; maxFs: number; weight: number } | null {
    const blueprint = getLayoutBlueprint(canvasWidth, canvasHeight);
    if (!blueprint) return null;

    const roleToScale: Record<string, keyof typeof blueprint.typographyScale> = {
        headline: 'headline',
        subline: 'subhead',
        cta: 'cta',
        detail: 'body',
        tnc: 'legal',
        badge: 'cta',
    };

    const scaleKey = roleToScale[role];
    if (!scaleKey) return null;

    const [minFs, maxFs] = blueprint.typographyScale[scaleKey];
    const weights: Record<string, number> = {
        headline: 700, subline: 400, cta: 700, detail: 400, tnc: 400, badge: 700,
    };

    return { minFs, maxFs, weight: weights[role] ?? 400 };
}
