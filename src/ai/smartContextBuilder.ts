// ─────────────────────────────────────────────────
// Smart Context Builder — Structured AI Context
// ─────────────────────────────────────────────────
// Ring buffers, element helpers → smartContextHelpers.ts
// ─────────────────────────────────────────────────

import type { CreativeSet } from '@/schema/design.types';
import { getAspectCategory, type AspectCategory } from '@/schema/layoutRoles';
import { loadUserPrefs, prefsToPromptSection } from '@/stores/userPrefs';
import { buildDesignSystemPrompt } from '@/ai/prompts/bannerDesignPrompt';
import { paletteToPromptSection, type BrandPalette } from '@/engine/brandPalette';
import { memoryToPromptSection } from '@/services/aiMemoryService';
import { getFontContextForAI } from './fontRecommendations';
import { matchFontsFromText } from './fontMatcher';

// Re-export everything from helpers for backward compatibility
export {
    pushAction, getActionHistory, clearActionHistory,
    pushLastTouched, getLastTouched, clearLastTouched,
    pushAiChange, getAiChangeLog, clearAiChangeLog,
    refreshMemoryCache, getCachedMemory,
    summarizeElement, detectBrand,
    type ElementSummary, type BrandProfile, type AiChangeRecord,
} from './smartContextHelpers';

import {
    getActionHistory, getLastTouched, getAiChangeLog,
    getCachedMemory, summarizeElement, detectBrand,
    type ElementSummary, type BrandProfile,
} from './smartContextHelpers';

// ── Types ──

export interface SmartContext {
    page: 'dashboard' | 'editor' | 'size-dashboard';
    creativeSet?: { name: string; variantCount: number; masterSize: string; sizes: string[] };
    activeVariant?: { size: string; width: number; height: number; aspectCategory: AspectCategory; isMaster: boolean; elementCount: number };
    elements?: ElementSummary[];
    /** All variants summary (project-wide awareness) */
    variantSummaries?: { size: string; elementCount: number; isMaster: boolean }[];
    brand?: BrandProfile;
    generatedPalette?: BrandPalette;
    recentActions?: string[];
    currentSelection?: { name: string; id: number; type: string; age: number };
}

// ── Main Builder ──

export function buildSmartContext(
    page: SmartContext['page'], creativeSet?: CreativeSet | null, activeVariantId?: string,
): SmartContext {
    const ctx: SmartContext = { page };
    if (!creativeSet) return ctx;

    const masterVariant = creativeSet.variants.find(v => v.id === creativeSet.masterVariantId);
    ctx.creativeSet = {
        name: creativeSet.name, variantCount: creativeSet.variants.length,
        masterSize: masterVariant ? `${masterVariant.preset.width}×${masterVariant.preset.height}` : 'unknown',
        sizes: creativeSet.variants.map(v => `${v.preset.width}×${v.preset.height}`),
    };

    const active = activeVariantId ? creativeSet.variants.find(v => v.id === activeVariantId) : masterVariant;
    if (active) {
        const w = active.preset.width, h = active.preset.height;
        ctx.activeVariant = { size: `${w}×${h}`, width: w, height: h, aspectCategory: getAspectCategory(w, h), isMaster: active.id === creativeSet.masterVariantId, elementCount: active.elements.length };
        ctx.elements = active.elements.map(el => summarizeElement(el));
        ctx.brand = detectBrand(active.elements);
    }

    // ★ Project-wide: summarize ALL variants so AI has full picture
    ctx.variantSummaries = creativeSet.variants.map(v => ({
        size: `${v.preset.width}×${v.preset.height}`,
        elementCount: v.elements.length,
        isMaster: v.id === creativeSet.masterVariantId,
    }));

    if (creativeSet.brand?.generatedPalette) ctx.generatedPalette = creativeSet.brand.generatedPalette;

    const actions = getActionHistory();
    if (actions.length > 0) ctx.recentActions = actions;

    return ctx;
}

// ── Prompt Section ──

export function contextToPromptSection(ctx: SmartContext): string {
    const lines: string[] = ['## Current Context', `Page: ${ctx.page}`];

    if (ctx.creativeSet) {
        lines.push(`\n### Creative Set: "${ctx.creativeSet.name}"`);
        lines.push(`- Variants: ${ctx.creativeSet.variantCount} sizes (${ctx.creativeSet.sizes.join(', ')})`);
        lines.push(`- Master: ${ctx.creativeSet.masterSize}`);
    }
    if (ctx.activeVariant) {
        lines.push(`\n### Active Canvas: ${ctx.activeVariant.size}`);
        lines.push(`- Aspect ratio: ${ctx.activeVariant.aspectCategory} (${ctx.activeVariant.width}w × ${ctx.activeVariant.height}h)`);
        lines.push(`- Master: ${ctx.activeVariant.isMaster ? 'YES' : 'NO (slave variant)'}`);
        lines.push(`- Elements: ${ctx.activeVariant.elementCount}`);
    }
    if (ctx.elements && ctx.elements.length > 0) {
        lines.push('\n### Elements on Canvas');
        for (const el of ctx.elements) {
            const roleTag = el.role ? ` [${el.role}]` : '';
            lines.push(`- **${el.name}**${roleTag} (${el.type}): ${Object.entries(el.props).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }
    } else if (ctx.activeVariant) { lines.push('\n### Canvas is EMPTY — ready for new design.'); }

    if (ctx.brand) {
        lines.push('\n### Detected Brand Colors');
        lines.push(`- Background: ${ctx.brand.backgroundColor}`, `- Primary: ${ctx.brand.primaryColor}`, `- Secondary: ${ctx.brand.secondaryColor}`, `- Text: ${ctx.brand.textColor}`, `- Font: ${ctx.brand.fontFamily}`);
        lines.push('*(Use these colors for consistency when adding new elements)*');
    }
    if (ctx.variantSummaries && ctx.variantSummaries.length > 1) {
        lines.push('\n### All Variants (project-wide)');
        for (const v of ctx.variantSummaries) {
            const tag = v.isMaster ? ' [MASTER]' : '';
            lines.push(`- ${v.size}${tag}: ${v.elementCount} elements`);
        }
    }
    if (ctx.recentActions && ctx.recentActions.length > 0) {
        lines.push('\n### Recent User Actions');
        for (const action of ctx.recentActions.slice(-5)) lines.push(`- ${action}`);
    }
    if (ctx.currentSelection) {
        lines.push(`\n### Currently Selected Element`);
        lines.push(`"${ctx.currentSelection.name}" (id=${ctx.currentSelection.id}, ${ctx.currentSelection.type}) — selected ${ctx.currentSelection.age}s ago`);
        lines.push('*(When user says "this", "the selected one" → they mean this element)*');
    }
    const touched = getLastTouched();
    if (touched.length > 0) {
        lines.push('\n### Recently Modified Elements', '*(When the user says "it", "that", "the last one", they mean the most recent item below)*');
        for (const t of touched) lines.push(`- "${t.name}" (id=${t.id}): ${t.action}`);
    }
    const changes = getAiChangeLog();
    if (changes.length > 0) {
        lines.push('\n### AI Change Log (your recent changes)', '*(Use this to support "undo that", "keep going", "do the same to X")*');
        for (const c of changes.slice(-8)) lines.push(`- ${c.tool}: ${c.elementName} — ${c.summary}`);
    }
    const prefs = loadUserPrefs();
    if (prefs.stats.totalDesigns > 0) { lines.push(''); lines.push(prefsToPromptSection(prefs)); }
    const mem = getCachedMemory();
    if (mem) { const memSection = memoryToPromptSection(mem); if (memSection) lines.push(memSection); }

    // ★ Inject learned skills (user-promoted dynamic actions)
    try {
        const { loadLearnedSkills } = require('./skillRegistry');
        const learned = loadLearnedSkills();
        if (learned.length > 0) {
            lines.push('', '## Learned Skills (user-promoted patterns)');
            for (const s of learned) {
                lines.push(`- **${s.name}**: ${s.description} (used ${s.usageCount ?? 0}x)`);
                if (s.codePattern) lines.push(`  Pattern: \`${s.codePattern.slice(0, 80)}...\``);
            }
            lines.push('*Check learned skills before using Dynamic Action — a similar pattern may exist.*');
        }
    } catch { /* non-critical */ }

    if (ctx.activeVariant) {
        const brandColors = ctx.brand ? { primary: ctx.brand.primaryColor, secondary: ctx.brand.secondaryColor } : undefined;
        lines.push('', buildDesignSystemPrompt(ctx.activeVariant.width, ctx.activeVariant.height, ctx.activeVariant.aspectCategory, brandColors));
        if (ctx.generatedPalette) { lines.push('', paletteToPromptSection(ctx.generatedPalette)); }
        const fontCtx = getFontContextForAI();
        const brandFont = ctx.brand?.fontFamily || '';
        const smartRecs = matchFontsFromText(brandFont, 5);
        lines.push('', '## Font Guidance', fontCtx);
        if (smartRecs.length > 0) {
            lines.push(`Fonts that complement current design: ${smartRecs.join(', ')}`);
        }
    }

    return lines.join('\n');
}
