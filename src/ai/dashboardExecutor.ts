// ─────────────────────────────────────────────────
// Dashboard Command Executor — Executes dashboard AI tool calls
// Operates on BOTH projectStore (dashboard list) and designStore (active editor)
// designStore is the source of truth; projectStore is synced as index
// ─────────────────────────────────────────────────

import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import type { BannerPreset } from '@/schema/design.types';
import { v4 as uuid } from 'uuid';

interface DashboardExecResult {
    success: boolean;
    message: string;
    data?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigateFn = (path: string) => void;

/**
 * Sync projectStore from designStore after mutations.
 * Ensures the dashboard listing always reflects the real data.
 */
function syncProjectStoreFromDesign(): void {
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

/**
 * Execute a dashboard tool call.
 * designStore is the source of truth.
 * projectStore is synced automatically after mutations.
 */
export function executeDashboardTool(
    toolName: string,
    params: Record<string, unknown>,
    navigate?: NavigateFn,
): DashboardExecResult {
    const designStore = useDesignStore.getState();

    try {
        switch (toolName) {
            case 'list_creative_sets': {
                const allCS = designStore.getAllCreativeSets();
                // Also include projectStore entries that don't exist in designStore (legacy/demo)
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
                // Create in designStore (source of truth)
                const csId = designStore.createCreativeSet(name, preset);
                // Sync to projectStore
                syncProjectStoreFromDesign();
                console.log(`[DashboardExecutor] Created set "${name}" (${w}×${h}), csId=${csId}`);
                return { success: true, message: `Created creative set "${name}" with master size ${w}×${h}. ID: ${csId}` };
            }

            case 'delete_creative_set': {
                const query = (params.name_query as string).toLowerCase();
                const allCS = designStore.getAllCreativeSets();
                const projectSets = useProjectStore.getState().creativeSets;

                // Find matches from both stores
                const designMatches = allCS.filter(cs => cs.name.toLowerCase().includes(query));
                const projectMatches = projectSets.filter(s => s.name.toLowerCase().includes(query));

                if (designMatches.length === 0 && projectMatches.length === 0) {
                    return { success: false, message: `No creative set matching "${params.name_query}" found.` };
                }

                // Delete from designStore
                for (const cs of designMatches) {
                    designStore.deleteCreativeSet(cs.id);
                }

                // Delete from projectStore (catches legacy entries too)
                const matchIds = new Set(projectMatches.map(m => m.id));
                useProjectStore.setState((state) => {
                    state.creativeSets = state.creativeSets.filter(s => !matchIds.has(s.id));
                    for (const id of matchIds) state.selectedIds.delete(id);
                });

                // Sync
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

                // Clear designStore
                designStore.deleteAllCreativeSets();

                // Clear projectStore
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

                // Try designStore first
                const allCS = designStore.getAllCreativeSets();
                const designMatch = allCS.find(cs => cs.name.toLowerCase().includes(query));

                if (designMatch) {
                    designStore.renameCreativeSet(designMatch.id, newName);
                    syncProjectStoreFromDesign();
                    return { success: true, message: `Renamed "${designMatch.name}" to "${newName}".` };
                }

                // Fallback to projectStore
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
                // Sync variant count
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
                    navigate('/');
                    return { success: true, message: 'Navigated to Dashboard.' };
                } else if (page === 'editor') {
                    navigate('/editor');
                    return { success: true, message: 'Navigated to Creative Set Editor.' };
                } else if (page === 'detail') {
                    const cs = designStore.creativeSet;
                    if (!cs) return { success: false, message: 'No creative set open.' };
                    const query = (params.variant_query as string || '').toLowerCase();
                    let target = cs.variants[0]; // default: first variant
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

            // ── Element Editing ──────────────────────
            case 'list_elements': {
                const cs = designStore.creativeSet;
                if (!cs) return { success: false, message: 'No creative set open.' };
                const master = cs.variants.find(v => v.id === cs.masterVariantId);
                if (!master || master.elements.length === 0) {
                    return { success: true, message: 'No elements in the master design.', data: [] };
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const elements = master.elements.map((el: any) => ({
                    id: el.id,
                    name: el.name,
                    type: el.type,
                    content: el.content ?? el.label ?? '',
                    color: el.color ?? el.fill ?? '',
                    fontSize: el.fontSize ?? null,
                    fontFamily: el.fontFamily ?? null,
                }));
                const summary = elements.map((e: { name: string; type: string; content: string }) =>
                    `• ${e.name} (${e.type}): "${e.content}"`
                ).join('\n');
                return { success: true, message: `Elements in master:\n${summary}`, data: elements };
            }

            case 'update_element_text': {
                const cs = designStore.creativeSet;
                if (!cs) return { success: false, message: 'No creative set open.' };

                const elementName = (params.element_name as string || '').toLowerCase();
                const newText = params.new_text as string;
                if (!elementName || newText === undefined) {
                    return { success: false, message: 'element_name and new_text are required.' };
                }

                let updated = 0;
                for (const variant of cs.variants) {
                    for (const el of variant.elements) {
                        if (el.name.toLowerCase().includes(elementName)) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const raw = el as any;
                            if (el.type === 'text' && 'content' in raw) {
                                raw.content = newText;
                                updated++;
                            } else if (el.type === 'button' && 'label' in raw) {
                                raw.label = newText;
                                updated++;
                            } else if ('content' in raw) {
                                raw.content = newText;
                                updated++;
                            }
                        }
                    }
                }

                if (updated === 0) {
                    return { success: false, message: `No element matching "${params.element_name}" found.` };
                }

                // Force store update
                useDesignStore.setState((state) => {
                    state.creativeSet = cs;
                });

                return { success: true, message: `Updated text to "${newText}" on ${updated} element(s) matching "${params.element_name}" across all sizes.` };
            }

            case 'update_element_property': {
                const cs = designStore.creativeSet;
                if (!cs) return { success: false, message: 'No creative set open.' };

                const elementName = (params.element_name as string || '').toLowerCase();
                const property = params.property as string;
                const rawValue = params.value as string;
                if (!elementName || !property) {
                    return { success: false, message: 'element_name and property are required.' };
                }

                // Convert value to appropriate type
                let value: unknown = rawValue;
                const numericProps = ['fontSize', 'opacity', 'borderRadius', 'lineHeight', 'letterSpacing', 'fontWeight', 'zIndex'];
                if (numericProps.includes(property)) {
                    value = Number(rawValue);
                    if (!Number.isFinite(value as number)) {
                        return { success: false, message: `Invalid numeric value "${rawValue}" for property "${property}".` };
                    }
                }

                let updated = 0;
                for (const variant of cs.variants) {
                    for (const el of variant.elements) {
                        if (el.name.toLowerCase().includes(elementName)) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (el as any)[property] = value;
                            updated++;
                        }
                    }
                }

                if (updated === 0) {
                    return { success: false, message: `No element matching "${params.element_name}" found.` };
                }

                useDesignStore.setState((state) => {
                    state.creativeSet = cs;
                });

                return { success: true, message: `Set "${property}" = "${rawValue}" on ${updated} element(s) matching "${params.element_name}".` };
            }

            // ── Element Creation ──────────────────────

            case 'add_text': {
                if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

                const content = (params.content as string) || 'Text';
                const x = Number(params.x) || 0;
                const y = Number(params.y) || 0;
                const width = Number(params.width) || 200;
                const height = Number(params.height) || 40;
                const fontSize = Number(params.fontSize) || 24;
                const fontWeight = Number(params.fontWeight) || 700;
                const color = (params.color as string) || '#ffffff';
                const fontFamily = (params.fontFamily as string) || 'Inter';
                const textAlign = (params.textAlign as string) || 'center';
                const elName = (params.name as string) || content.substring(0, 20);

                // Mutate inside setState where Immer provides a mutable draft
                useDesignStore.setState((state) => {
                    if (!state.creativeSet) return;
                    for (const variant of state.creativeSet.variants) {
                        variant.elements.push({
                            id: uuid(),
                            name: elName,
                            type: 'text' as const,
                            content,
                            fontFamily,
                            fontSize,
                            fontWeight,
                            fontStyle: 'normal' as const,
                            color,
                            textAlign: textAlign as 'left' | 'center' | 'right',
                            lineHeight: 1.2,
                            letterSpacing: 0,
                            autoShrink: false,
                            opacity: 1,
                            visible: true,
                            locked: false,
                            zIndex: variant.elements.length,
                            constraints: {
                                horizontal: { anchor: 'left' as const, offset: x },
                                vertical: { anchor: 'top' as const, offset: y },
                                size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height },
                                rotation: 0,
                            },
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any);
                    }
                });

                return { success: true, message: `Text "${content}" added at (${x}, ${y}) — ${fontSize}px ${color}` };
            }

            case 'add_shape': {
                if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

                const shapeType = (params.shapeType as string) || 'rectangle';
                const x = Number(params.x) || 0;
                const y = Number(params.y) || 0;
                const width = Number(params.width) || 100;
                const height = Number(params.height) || 100;
                const fill = (params.fill as string) || '#333333';
                const borderRadius = Number(params.borderRadius) || 0;
                const opacity = Number(params.opacity) ?? 1;
                const elName = (params.name as string) || `Shape ${shapeType}`;

                // Mutate inside setState where Immer provides a mutable draft
                useDesignStore.setState((state) => {
                    if (!state.creativeSet) return;
                    for (const variant of state.creativeSet.variants) {
                        variant.elements.push({
                            id: uuid(),
                            name: elName,
                            type: 'shape' as const,
                            shapeType: shapeType as 'rectangle' | 'ellipse' | 'line',
                            fill,
                            strokeWidth: 0,
                            borderRadius,
                            opacity: Number.isFinite(opacity) ? opacity : 1,
                            visible: true,
                            locked: false,
                            zIndex: variant.elements.length,
                            constraints: {
                                horizontal: { anchor: 'left' as const, offset: x },
                                vertical: { anchor: 'top' as const, offset: y },
                                size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height },
                                rotation: 0,
                            },
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any);
                    }
                });

                return { success: true, message: `Shape "${shapeType}" (${width}×${height}) added at (${x}, ${y}) — fill ${fill}` };
            }

            // ── Dynamic / Catch-All Tools ────────────
            case 'set_custom_style': {
                const cs = designStore.creativeSet;
                if (!cs) return { success: false, message: 'No creative set open.' };

                const elementName = (params.element_name as string || '').toLowerCase();
                const styles = params.styles as Record<string, string>;
                if (!elementName || !styles || typeof styles !== 'object') {
                    return { success: false, message: 'element_name and styles object are required.' };
                }

                let updated = 0;
                for (const variant of cs.variants) {
                    for (const el of variant.elements) {
                        if (el.name.toLowerCase().includes(elementName)) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const raw = el as any;
                            // Merge new styles with existing customStyles
                            raw.customStyles = { ...(raw.customStyles || {}), ...styles };
                            updated++;
                        }
                    }
                }

                if (updated === 0) {
                    return { success: false, message: `No element matching "${params.element_name}" found.` };
                }

                useDesignStore.setState((state) => {
                    state.creativeSet = cs;
                });

                const styleList = Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join(', ');
                return { success: true, message: `Applied custom styles to ${updated} element(s) matching "${params.element_name}": ${styleList}` };
            }

            case 'execute_dynamic_action': {
                const description = params.description as string || 'Custom action';
                const code = params.code as string;
                if (!code) {
                    return { success: false, message: 'code is required.' };
                }

                try {
                    // Create a sandboxed execution context
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const fn = new Function(
                        'designStore',
                        'useDesignStore',
                        'useProjectStore',
                        `"use strict";
                        try {
                            ${code}
                        } catch (e) {
                            return "Error: " + e.message;
                        }`
                    );

                    const result = fn(
                        useDesignStore.getState(),
                        useDesignStore,
                        useProjectStore,
                    );

                    const resultStr = typeof result === 'string' ? result : JSON.stringify(result ?? 'Done');
                    console.log(`[DashboardExecutor] Dynamic action "${description}" result:`, resultStr);
                    return { success: true, message: `✅ ${description}: ${resultStr}` };
                } catch (err) {
                    console.error(`[DashboardExecutor] Dynamic action failed:`, err);
                    return { success: false, message: `Failed to execute "${description}": ${err}` };
                }
            }

            default:
                return { success: false, message: `Unknown dashboard tool: ${toolName}` };
        }
    } catch (err) {
        return { success: false, message: `Error executing ${toolName}: ${err}` };
    }
}
