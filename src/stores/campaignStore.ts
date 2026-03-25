// ─────────────────────────────────────────────────
// campaignStore — Campaign state management
// ─────────────────────────────────────────────────
// Manages campaigns (multi-format creative bundles).
// Persisted to IndexedDB via zustand/middleware.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorageAdapter';
import type { Campaign, CampaignDNA, CampaignStatus } from '@/schema/campaignTypes';

interface CampaignState {
    campaigns: Campaign[];

    // ── Actions ──
    createCampaign: (name: string, prompt: string, packId: string, dna: CampaignDNA) => string;
    updateProgress: (id: string, progress: number) => void;
    addCreativeSetId: (campaignId: string, csId: string) => void;
    setStatus: (id: string, status: CampaignStatus, errorMessage?: string) => void;
    deleteCampaign: (id: string) => void;
    getCampaign: (id: string) => Campaign | undefined;
}

export const useCampaignStore = create<CampaignState>()(
    persist(
        (set, get) => ({
            campaigns: [],

            createCampaign: (name, prompt, packId, dna) => {
                const id = crypto.randomUUID();
                const now = new Date().toISOString();
                const campaign: Campaign = {
                    id,
                    name,
                    prompt,
                    dna,
                    packId,
                    creativeSetIds: [],
                    status: 'generating',
                    progress: 0,
                    createdAt: now,
                    updatedAt: now,
                };
                set({ campaigns: [...get().campaigns, campaign] });
                return id;
            },

            updateProgress: (id, progress) => {
                set({
                    campaigns: get().campaigns.map(c =>
                        c.id === id ? { ...c, progress, updatedAt: new Date().toISOString() } : c,
                    ),
                });
            },

            addCreativeSetId: (campaignId, csId) => {
                set({
                    campaigns: get().campaigns.map(c =>
                        c.id === campaignId
                            ? {
                                  ...c,
                                  creativeSetIds: [...c.creativeSetIds, csId],
                                  updatedAt: new Date().toISOString(),
                              }
                            : c,
                    ),
                });
            },

            setStatus: (id, status, errorMessage) => {
                set({
                    campaigns: get().campaigns.map(c =>
                        c.id === id
                            ? {
                                  ...c,
                                  status,
                                  errorMessage,
                                  progress: status === 'ready' ? 1 : c.progress,
                                  updatedAt: new Date().toISOString(),
                              }
                            : c,
                    ),
                });
            },

            deleteCampaign: (id) => {
                set({ campaigns: get().campaigns.filter(c => c.id !== id) });
            },

            getCampaign: (id) => {
                return get().campaigns.find(c => c.id === id);
            },
        }),
        {
            name: 'ace-campaigns',
            storage: createJSONStorage(() => idbStorage),
        },
    ),
);
