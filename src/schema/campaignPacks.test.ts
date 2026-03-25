// ─────────────────────────────────────────────────
// campaignPacks.test.ts — Campaign format pack tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { CAMPAIGN_PACKS, getPackById, getDefaultPack } from '@/schema/campaignPacks';
import { getPresetById } from '@/schema/presets';

describe('campaignPacks', () => {
    it('should have at least 4 packs defined', () => {
        expect(CAMPAIGN_PACKS.length).toBeGreaterThanOrEqual(4);
    });

    it('all pack preset IDs must reference valid BANNER_PRESETS', () => {
        for (const pack of CAMPAIGN_PACKS) {
            for (const presetId of pack.presetIds) {
                const preset = getPresetById(presetId);
                expect(preset, `Pack "${pack.name}" references unknown preset "${presetId}"`).toBeDefined();
            }
        }
    });

    it('each pack should have a unique ID', () => {
        const ids = CAMPAIGN_PACKS.map(p => p.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });

    it('social-starter should have 3 formats', () => {
        const pack = getPackById('social-starter');
        expect(pack).toBeDefined();
        expect(pack!.presetIds.length).toBe(3);
    });

    it('full-funnel should have >= 7 formats', () => {
        const pack = getPackById('full-funnel');
        expect(pack).toBeDefined();
        expect(pack!.presetIds.length).toBeGreaterThanOrEqual(7);
    });

    it('getDefaultPack should return social-starter', () => {
        const defaultPack = getDefaultPack();
        expect(defaultPack.id).toBe('social-starter');
    });

    it('getPackById should return undefined for unknown ID', () => {
        expect(getPackById('nonexistent')).toBeUndefined();
    });
});
