// ─────────────────────────────────────────────────
// sizingTools.ts — Smart Sizing Operations
// ─────────────────────────────────────────────────
// ACE's proprietary Smart Sizing tools — what
// competitors CAN'T replicate.
// ─────────────────────────────────────────────────

import type { AceTool, ToolContext } from './toolTypes';
import type { CreativeSet, BannerPreset } from '@/schema/design.types';
import { BANNER_PRESETS } from '@/schema/presets';

// ── Tools ──

export const getVariantList: AceTool = {
    name: 'get_variant_list',
    category: 'sizing',
    description: 'List all banner size variants in the current creative set.',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        const cs = ctx.designActions.getCreativeSet() as CreativeSet | null;
        if (!cs) return { success: false, message: 'No active creative set' };

        const variants = cs.variants.map(v => ({
            id: v.id,
            name: v.preset.name,
            width: v.preset.width,
            height: v.preset.height,
            isMaster: v.id === cs.masterVariantId,
            elementCount: v.elements.length,
        }));

        return {
            success: true,
            message: `${variants.length} variants in "${cs.name}"`,
            data: { variants, masterVariantId: cs.masterVariantId },
        };
    },
};

export const addVariant: AceTool = {
    name: 'add_variant',
    category: 'sizing',
    description: 'Add a new size variant to the creative set. Elements are copied from master and smart-resized.',
    inputSchema: {
        type: 'object', required: ['presetId'],
        properties: {
            presetId: { type: 'string', description: 'Preset ID from SIZE_PRESETS' },
        },
    },
    execute: (params, ctx) => {
        const preset = BANNER_PRESETS.find((p: BannerPreset) => p.id === params.presetId);
        if (!preset) {
            const available = BANNER_PRESETS.map((p: BannerPreset) => `${p.id} (${p.name} ${p.width}x${p.height})`).join(', ');
            return { success: false, message: `Preset "${params.presetId}" not found. Available: ${available}` };
        }

        ctx.designActions.addVariant(preset);
        return {
            success: true,
            message: `Added variant "${preset.name}" (${preset.width}x${preset.height})`,
            data: { presetId: preset.id, width: preset.width, height: preset.height },
            sideEffects: [`Added variant ${preset.name}`],
        };
    },
};

export const removeVariant: AceTool = {
    name: 'remove_variant',
    category: 'sizing',
    description: 'Remove a size variant from the creative set. Cannot remove the master variant.',
    inputSchema: {
        type: 'object', required: ['variantId'],
        properties: { variantId: { type: 'string' } },
    },
    execute: (params, ctx) => {
        const cs = ctx.designActions.getCreativeSet() as CreativeSet | null;
        if (!cs) return { success: false, message: 'No active creative set' };
        if (params.variantId === cs.masterVariantId) {
            return { success: false, message: 'Cannot remove the master variant' };
        }

        ctx.designActions.removeVariant(params.variantId as string);
        return { success: true, message: `Removed variant "${params.variantId}"`, sideEffects: [`Removed variant`] };
    },
};

export const getAvailablePresets: AceTool = {
    name: 'get_available_presets',
    category: 'sizing',
    description: 'List all available banner size presets that can be added as variants.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => {
        const presets = BANNER_PRESETS.map((p: BannerPreset) => ({
            id: p.id, name: p.name,
            width: p.width, height: p.height,
            category: p.category,
        }));
        return {
            success: true,
            message: `${presets.length} available presets`,
            data: { presets },
        };
    },
};

export const sizingTools: AceTool[] = [getVariantList, addVariant, removeVariant, getAvailablePresets];
