// ─────────────────────────────────────────────────
// Project Executor — Creative set CRUD + navigation
// ─────────────────────────────────────────────────
// Handles: list_creative_sets, create_creative_set, delete_creative_set,
//          delete_all_creative_sets, rename_creative_set, add_size,
//          remove_size, navigate_to

import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import type { BannerPreset } from '@/schema/design.types';
import { v4 as uuid } from 'uuid';
import type { DashboardExecResult, NavigateFn } from '../dashboardExecutor';

// ── Helpers ──

export function syncProjectStoreFromDesign(): void {
    const allCS = useDesignStore.getState().getAllCreativeSets();
    useProjectStore.setState((state) => {
        const existingMap = new Map(state.creativeSets.map(s => [s.id, s]));

        for (const cs of allCS) {
            const existing = existingMap.get(cs.id);
            if (existing) {
                existing.variantCount = cs.variants.length;
                existing.name = cs.name;
                existing.updatedAt = cs.updatedAt;
            } else {
                state.creativeSets.push({
                    id: cs.id,
                    name: cs.name,
                    variantCount: cs.variants.length,
                    createdAt: cs.createdAt,
                    updatedAt: cs.updatedAt,
                    createdBy: 'Young An',
                });
            }
        }

        // Remove dangling entries  
        const validIds = new Set(allCS.map(cs => cs.id));
        state.creativeSets = state.creativeSets.filter(s => validIds.has(s.id));
    });
}

// ── Executor ──

export function executeProjectTool(
    toolName: string,
    params: Record<string, unknown>,
    navigate?: NavigateFn,
): DashboardExecResult | null {
    const designStore = useDesignStore.getState();

    switch (toolName) {
        case 'list_creative_sets': {
            const allCS = designStore.getAllCreativeSets();
            const projectSets = useProjectStore.getState().creativeSets;
            const designIds = new Set(allCS.map(cs => cs.id));
            const combined = [
                ...allCS.map(cs => ({
                    name: cs.name,
                    id: cs.id,
                    variantCount: cs.variants.length,
                    createdBy: 'Young An',
                    createdAt: cs.createdAt,
                })),
                ...projectSets
                    .filter(s => !designIds.has(s.id))
                    .map(s => ({
                        name: s.name,
                        id: s.id,
                        variantCount: s.variantCount,
                        createdBy: s.createdBy,
                        createdAt: s.createdAt,
                    })),
            ];

            if (combined.length === 0) return { success: true, message: 'No creative sets found.', data: [] };
            return {
                success: true,
                message: `Found ${combined.length} creative set(s).`,
                data: combined,
            };
        }

        case 'create_creative_set': {
            const name = params.name as string;
            const w = params.width as number;
            const h = params.height as number;
            const preset: BannerPreset = {
                id: uuid(),
                name: `${w}×${h}`,
                width: w,
                height: h,
                category: 'custom',
            };
            const csId = designStore.createCreativeSet(name, preset);
            syncProjectStoreFromDesign();
            console.log(`[DashboardExecutor] Created set "${name}" (${w}×${h}), csId=${csId}`);
            return { success: true, message: `Created creative set "${name}" with master size ${w}×${h}. ID: ${csId}` };
        }

        case 'delete_creative_set': {
            const query = (params.name_query as string).toLowerCase();
            const allCS = designStore.getAllCreativeSets();
            const projectSets = useProjectStore.getState().creativeSets;

            const designMatches = allCS.filter(cs => cs.name.toLowerCase().includes(query));
            const projectMatches = projectSets.filter(s => s.name.toLowerCase().includes(query));

            if (designMatches.length === 0 && projectMatches.length === 0) {
                return { success: false, message: `No creative set matching "${params.name_query}" found.` };
            }

            for (const cs of designMatches) {
                designStore.deleteCreativeSet(cs.id);
            }

            const matchIds = new Set(projectMatches.map(m => m.id));
            useProjectStore.setState((state) => {
                state.creativeSets = state.creativeSets.filter(s => !matchIds.has(s.id));
                for (const id of matchIds) state.selectedIds.delete(id);
            });

            syncProjectStoreFromDesign();

            const totalDeleted = Math.max(designMatches.length, projectMatches.length);
            const names = [...designMatches.map(m => m.name), ...projectMatches.filter(p => !designMatches.some(d => d.id === p.id)).map(p => p.name)];
            console.log(`[DashboardExecutor] Deleted ${totalDeleted} set(s) matching "${query}"`);
            return { success: true, message: `Deleted ${totalDeleted} creative set(s) matching "${params.name_query}": ${names.join(', ')}.` };
        }

        case 'delete_all_creative_sets': {
            const allCS = designStore.getAllCreativeSets();
            const projectCount = useProjectStore.getState().creativeSets.length;
            const count = Math.max(allCS.length, projectCount);

            designStore.deleteAllCreativeSets();

            useProjectStore.setState((state) => {
                state.creativeSets = [];
                state.selectedIds = new Set();
            });

            console.log(`[DashboardExecutor] Deleted ALL ${count} creative set(s)`);
            return { success: true, message: `Deleted all ${count} creative set(s). Workspace is now empty.` };
        }

        case 'rename_creative_set': {
            const query = (params.name_query as string).toLowerCase();
            const newName = params.new_name as string;

            const allCS = designStore.getAllCreativeSets();
            const designMatch = allCS.find(cs => cs.name.toLowerCase().includes(query));

            if (designMatch) {
                designStore.renameCreativeSet(designMatch.id, newName);
                syncProjectStoreFromDesign();
                return { success: true, message: `Renamed "${designMatch.name}" to "${newName}".` };
            }

            const projectSets = useProjectStore.getState().creativeSets;
            const projectMatch = projectSets.find(s => s.name.toLowerCase().includes(query));
            if (projectMatch) {
                useProjectStore.getState().renameCreativeSet(projectMatch.id, newName);
                return { success: true, message: `Renamed "${projectMatch.name}" to "${newName}".` };
            }

            return { success: false, message: `No creative set matching "${params.name_query}" found.` };
        }

        case 'add_size': {
            const w = params.width as number;
            const h = params.height as number;
            const name = (params.name as string) || `${w}×${h}`;
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open. Create one first.' };
            const preset: BannerPreset = {
                id: uuid(),
                name,
                width: w,
                height: h,
                category: 'custom',
            };
            designStore.addVariant(preset);
            syncProjectStoreFromDesign();
            console.log(`[DashboardExecutor] Added size ${w}×${h} to "${cs.name}"`);
            return { success: true, message: `Added size ${w}×${h} ("${name}") to "${cs.name}". Total variants: ${useDesignStore.getState().creativeSet?.variants.length ?? '?'}` };
        }

        case 'remove_size': {
            const w = params.width as number;
            const h = params.height as number;
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };
            const variant = cs.variants.find(v =>
                v.preset.width === w && v.preset.height === h
            );
            if (!variant) return { success: false, message: `Size ${w}×${h} not found.` };
            if (variant.id === cs.masterVariantId) {
                return { success: false, message: `Cannot remove the master size ${w}×${h}.` };
            }
            designStore.removeVariant(variant.id);
            syncProjectStoreFromDesign();
            return { success: true, message: `Removed size ${w}×${h}.` };
        }

        case 'navigate_to': {
            const page = params.page as string;
            if (!navigate) return { success: false, message: 'Navigation not available.' };

            if (page === 'dashboard') {
                navigate('/dashboard');
                return { success: true, message: 'Navigated to Dashboard.' };
            } else if (page === 'editor') {
                navigate('/editor');
                return { success: true, message: 'Navigated to Creative Set Editor.' };
            } else if (page === 'detail') {
                const cs = designStore.creativeSet;
                if (!cs) return { success: false, message: 'No creative set open.' };
                const query = (params.variant_query as string || '').toLowerCase();
                let target = cs.variants[0];
                if (query) {
                    const sizeMatch = cs.variants.find(v =>
                        `${v.preset.width}x${v.preset.height}` === query ||
                        v.preset.name.toLowerCase().includes(query)
                    );
                    if (sizeMatch) target = sizeMatch;
                }
                if (!target) return { success: false, message: 'No variants available.' };
                navigate(`/editor/detail/${target.id}`);
                return { success: true, message: `Opened variant ${target.preset.width}×${target.preset.height} for editing.` };
            }
            return { success: false, message: `Unknown page: ${page}` };
        }

        default:
            return null; // Not handled by this executor
    }
}
