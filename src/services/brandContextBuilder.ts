// ─────────────────────────────────────────────────
// brandContextBuilder.ts — Brand Kit → AI Prompt Context
// ─────────────────────────────────────────────────
// Converts BrandKit data into formatted prompt sections
// that are injected into Planner, Executor, and Critic
// agent system prompts for context-aware design generation.
// ─────────────────────────────────────────────────

import type { BrandKit, BrandAsset } from '@/stores/brandKitStore';

// ── For Planner Agent ──
// Gives the planner full awareness of available brand assets,
// palette, typography, and guidelines.

export function buildBrandContextForPlanner(kit: BrandKit): string {
    const logos = kit.assets.filter(a => a.category === 'logo' && !a.deletedAt);
    const products = kit.assets.filter(a => a.category === 'product' && !a.deletedAt);
    const backgrounds = kit.assets.filter(a => a.category === 'background' && !a.deletedAt);
    const favorites = kit.assets.filter(a => a.isFavorite && !a.deletedAt);

    const sections: string[] = [];

    // Header
    sections.push(`\n${'='.repeat(50)}\nBRAND KIT: "${kit.guidelines.name}" (${kit.guidelines.industry})\n${'='.repeat(50)}`);

    // Palette
    sections.push(`\nPALETTE:
  Primary: ${kit.palette.primary}
  Secondary: ${kit.palette.secondary}
  Accent: ${kit.palette.accent}
  Background: ${kit.palette.background}
  Text: ${kit.palette.text}`);

    if (kit.palette.gradients.length > 0) {
        const gradLines = kit.palette.gradients
            .map(g => `  Gradient "${g.name}": ${g.start} -> ${g.end} (${g.angle} deg)`)
            .join('\n');
        sections.push(gradLines);
    }

    // Typography
    sections.push(`\nTYPOGRAPHY:
  Heading: "${kit.typography.heading.family}" weight ${kit.typography.heading.weights.join('/')}
  Body: "${kit.typography.body.family}" weight ${kit.typography.body.weights.join('/')}
  CTA: "${kit.typography.cta.family}" ${kit.typography.cta.transform}`);

    // Available Assets
    if (logos.length > 0) {
        sections.push(`\nAVAILABLE LOGOS (${logos.length}):`);
        sections.push(logos.map(l => formatAssetLine(l)).join('\n'));
    }

    if (products.length > 0) {
        sections.push(`\nPRODUCT IMAGES (${products.length}):`);
        sections.push(products.map(p => formatAssetLine(p)).join('\n'));
    }

    if (backgrounds.length > 0) {
        sections.push(`\nBACKGROUND ASSETS (${backgrounds.length}):`);
        sections.push(backgrounds.map(b => formatAssetLine(b)).join('\n'));
    }

    if (favorites.length > 0) {
        sections.push(`\nFAVORITE ASSETS (${favorites.length}):`);
        sections.push(favorites.map(f => `  [FAV] "${f.name}" [${f.category}] — used ${f.usageCount} times`).join('\n'));
    }

    // Guidelines
    sections.push(`\nBRAND VOICE: ${kit.guidelines.voiceTone}`);
    if (kit.guidelines.tagline) {
        sections.push(`TAGLINE: "${kit.guidelines.tagline}"`);
    }
    sections.push(`CTA PHRASES: ${kit.guidelines.ctaPhrases.join(', ')}`);
    sections.push(`LOGO RULES: ${kit.guidelines.logoPlacementRules}`);

    if (kit.guidelines.forbiddenColors.length > 0) {
        sections.push(`FORBIDDEN COLORS: ${kit.guidelines.forbiddenColors.join(', ')}`);
    }
    if (kit.guidelines.forbiddenWords.length > 0) {
        sections.push(`FORBIDDEN WORDS: ${kit.guidelines.forbiddenWords.join(', ')}`);
    }

    // AI Instructions
    sections.push(`
INSTRUCTIONS FOR PLANNER:
- ALWAYS use brand palette colors. Do NOT invent new colors.
- If logos are available, INCLUDE the primary logo in the layout plan.
- Product images should be placed in hero zones.
- CTA text must come from ctaPhrases list unless user specifies otherwise.
- Respect logoPlacementRules for logo positioning.`);

    return sections.join('\n');
}

// ── For Executor Agent ──
// Returns asset references so executor can call createImageFromBrandKit.

export interface AssetReference {
    id: string;
    name: string;
    category: string;
    role: string | null;
    width: number;
    height: number;
    suggestedPlacement: string | null;
}

export function buildAssetReferencesForExecutor(kit: BrandKit): AssetReference[] {
    return kit.assets
        .filter(a => !a.deletedAt)
        .map(a => ({
            id: a.id,
            name: a.name,
            category: a.category,
            role: a.role,
            width: a.width,
            height: a.height,
            suggestedPlacement: a.metadata.suggestedPlacement,
        }));
}

// ── For Critic Agent ──
// Returns brand compliance rules for the critic to validate against.

export interface BrandComplianceRules {
    allowedColors: string[];
    forbiddenColors: string[];
    requiredAssets: string[];
    fontFamilies: string[];
    logoPlacementRules: string;
}

export function buildBrandComplianceForCritic(kit: BrandKit): BrandComplianceRules {
    return {
        allowedColors: [
            kit.palette.primary,
            kit.palette.secondary,
            kit.palette.accent,
            kit.palette.background,
            kit.palette.text,
            ...kit.palette.gradients.flatMap(g => [g.start, g.end]),
        ],
        forbiddenColors: kit.guidelines.forbiddenColors,
        requiredAssets: kit.assets
            .filter(a => a.role === 'primary_logo' && !a.deletedAt)
            .map(a => a.name),
        fontFamilies: [
            kit.typography.heading.family,
            kit.typography.body.family,
            kit.typography.cta.family,
        ],
        logoPlacementRules: kit.guidelines.logoPlacementRules,
    };
}

// ── For System Prompt (simple one-liner fallback) ──
// Compact version for when full context is too long.

export function buildCompactBrandContext(kit: BrandKit): string {
    return `Brand: "${kit.guidelines.name}" | Colors: ${kit.palette.primary}, ${kit.palette.secondary}, ${kit.palette.accent} | Font: ${kit.typography.heading.family} | Voice: ${kit.guidelines.voiceTone} | Logos: ${kit.assets.filter(a => a.category === 'logo' && !a.deletedAt).length} | Products: ${kit.assets.filter(a => a.category === 'product' && !a.deletedAt).length}`;
}

// ── Helpers ──

function formatAssetLine(asset: BrandAsset): string {
    const roleBadge = asset.role ? ` [${asset.role}]` : '';
    const favBadge = asset.isFavorite ? ' *' : '';
    return `  - "${asset.name}" — ${asset.width}x${asset.height} ${asset.format}${roleBadge}${favBadge}`;
}
