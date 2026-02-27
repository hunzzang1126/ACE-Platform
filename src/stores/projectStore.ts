// ─────────────────────────────────────────────────
// projectStore – Multi-Creative-Set + Folder Management
// ─────────────────────────────────────────────────
// 대시보드에서 여러 크리에이티브 셋과 폴더를 관리.
// designStore는 "활성 편집 중인" 단일 셋만 보유.

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, type StorageValue } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { useDesignStore } from './designStore';

// Enable Immer MapSet plugin — selectedIds is Set<string>
enableMapSet();
import { v4 as uuid } from 'uuid';
import type { CreativeSetSummary, Folder } from '@/schema/design.types';

// ── Trash item type ──
export interface TrashedItem {
    item: CreativeSetSummary;
    deletedAt: number; // timestamp
}

// ── Demo data generator ──
function generateDemoData(): { sets: CreativeSetSummary[]; folders: Folder[] } {
    const now = new Date();
    const authors = ['Young An', 'Aidan Payne', 'Dylan Edwards'];

    const demoSets: CreativeSetSummary[] = [
        { id: uuid(), name: '01062023-CA_ON-BELLMEDIA_Poker_Thrill', variantCount: 5, createdAt: '2023-06-01T10:00:00Z', updatedAt: '2023-06-01T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '04122025-CA-100k-Freeroll', variantCount: 8, createdAt: '2025-12-04T10:00:00Z', updatedAt: '2025-12-04T10:00:00Z', createdBy: 'Aidan Payne' },
        { id: uuid(), name: '05012023-ALL-Rush_Cash_Swipe', variantCount: 12, createdAt: '2023-01-06T10:00:00Z', updatedAt: '2023-01-06T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '08022023-CA-GG_Home_of_WSOP', variantCount: 6, createdAt: '2023-02-07T10:00:00Z', updatedAt: '2023-02-07T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '08062023-CA_ON-Live_Nation', variantCount: 4, createdAt: '2023-06-08T10:00:00Z', updatedAt: '2023-06-08T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '09012023-ALL-Spin_Gold_ELO', variantCount: 7, createdAt: '2023-01-09T10:00:00Z', updatedAt: '2023-01-09T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '10062022-ALL-Bounty-Jackpot', variantCount: 10, createdAt: '2022-10-06T10:00:00Z', updatedAt: '2022-10-06T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '11022022-CA_ON-Spin_Gold_100KSpin_GGPokerCA', variantCount: 3, createdAt: '2022-10-19T10:00:00Z', updatedAt: '2022-10-19T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '11082022-CA_ON-Sunday-Flagships-GGPokerCA', variantCount: 9, createdAt: '2022-11-08T10:00:00Z', updatedAt: '2022-11-08T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '11132025-ReCA-Dynamic-Ad-Test', variantCount: 2, createdAt: '2025-11-13T10:00:00Z', updatedAt: '2025-11-13T10:00:00Z', createdBy: 'Aidan Payne' },
        { id: uuid(), name: '12122022-CA_ON-GGPokerCA_Holdem_Omaha_Leaderboards', variantCount: 6, createdAt: '2022-12-12T10:00:00Z', updatedAt: '2022-12-12T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '13122022-ALL-Cash_Games_Welcome', variantCount: 5, createdAt: '2022-12-13T10:00:00Z', updatedAt: '2022-12-13T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '14032023-CA_ON-GGPokerCA_Hourly_Freerolls', variantCount: 4, createdAt: '2023-03-14T10:00:00Z', updatedAt: '2023-03-14T10:00:00Z', createdBy: 'Dylan Edwards' },
        { id: uuid(), name: '2026-Spring-Campaign-Global', variantCount: 15, createdAt: now.toISOString(), updatedAt: now.toISOString(), createdBy: 'Young An' },
        { id: uuid(), name: '2026-Valentine-Promo', variantCount: 8, createdAt: now.toISOString(), updatedAt: now.toISOString(), createdBy: 'Young An' },
    ];

    return { sets: demoSets, folders: [] };
}

// ── Sort types ──
export type SortColumn = 'name' | 'variantCount' | 'createdAt' | 'createdBy';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'list' | 'grid' | 'compact';

interface ProjectState {
    creativeSets: CreativeSetSummary[];
    folders: Folder[];
    trash: TrashedItem[];
    currentFolderId: string | null;

    // Dashboard UI state
    searchQuery: string;
    sortColumn: SortColumn;
    sortDirection: SortDirection;
    viewMode: ViewMode;
    selectedIds: Set<string>;
    currentPage: number;
    itemsPerPage: number;

    // Actions
    createCreativeSet: (name: string) => string;
    createFolder: (name: string) => void;
    deleteCreativeSet: (id: string) => void;
    deleteFolder: (id: string) => void;
    renameCreativeSet: (id: string, name: string) => void;
    renameFolder: (id: string, name: string) => void;
    moveToFolder: (itemId: string, folderId: string | null) => void;
    duplicateCreativeSet: (id: string) => void;
    navigateToFolder: (folderId: string | null) => void;

    // Trash Actions
    restoreFromTrash: (id: string) => void;
    permanentDelete: (id: string) => void;
    emptyTrash: () => void;

    // UI Actions
    setSearchQuery: (query: string) => void;
    setSort: (column: SortColumn) => void;
    setViewMode: (mode: ViewMode) => void;
    toggleSelection: (id: string) => void;
    selectAll: (ids: string[]) => void;
    clearSelection: () => void;
    setCurrentPage: (page: number) => void;
    setItemsPerPage: (count: number) => void;
}

const demoData = generateDemoData();

export const useProjectStore = create<ProjectState>()(
    persist(
        immer((set) => ({
            creativeSets: demoData.sets,
            folders: demoData.folders,
            trash: [],
            currentFolderId: null,

            searchQuery: '',
            sortColumn: 'name' as SortColumn,
            sortDirection: 'asc' as SortDirection,
            viewMode: 'list' as ViewMode,
            selectedIds: new Set<string>(),
            currentPage: 1,
            itemsPerPage: 25,

            createCreativeSet: (name) => {
                const id = uuid();
                set((state) => {
                    state.creativeSets.push({
                        id,
                        name,
                        folderId: state.currentFolderId ?? undefined,
                        variantCount: 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        createdBy: 'Young An',
                    });
                });
                return id;
            },

            createFolder: (name) => {
                set((state) => {
                    state.folders.push({
                        id: uuid(),
                        name,
                        parentId: state.currentFolderId ?? undefined,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                });
            },

            deleteCreativeSet: (id) => {
                set((state) => {
                    const idx = state.creativeSets.findIndex((s) => s.id === id);
                    if (idx === -1) return;
                    // Move to trash instead of permanent delete
                    const [removed] = state.creativeSets.splice(idx, 1);
                    state.trash.push({
                        item: JSON.parse(JSON.stringify(removed)),
                        deletedAt: Date.now(),
                    });
                    state.selectedIds.delete(id);
                });
            },

            deleteFolder: (id) => {
                set((state) => {
                    state.folders = state.folders.filter((f) => f.id !== id);
                    // Move contained sets to current folder
                    for (const s of state.creativeSets) {
                        if (s.folderId === id) s.folderId = state.currentFolderId ?? undefined;
                    }
                });
            },

            renameCreativeSet: (id, name) => {
                set((state) => {
                    const s = state.creativeSets.find((s) => s.id === id);
                    if (s) { s.name = name; s.updatedAt = new Date().toISOString(); }
                });
            },

            renameFolder: (id, name) => {
                set((state) => {
                    const f = state.folders.find((f) => f.id === id);
                    if (f) { f.name = name; f.updatedAt = new Date().toISOString(); }
                });
            },

            moveToFolder: (itemId, folderId) => {
                set((state) => {
                    const s = state.creativeSets.find((s) => s.id === itemId);
                    if (s) { s.folderId = folderId ?? undefined; return; }
                    const f = state.folders.find((f) => f.id === itemId);
                    if (f) { f.parentId = folderId ?? undefined; }
                });
            },

            duplicateCreativeSet: (id) => {
                set((state) => {
                    const original = state.creativeSets.find((s) => s.id === id);
                    if (!original) return;
                    state.creativeSets.push({
                        ...JSON.parse(JSON.stringify(original)),
                        id: uuid(),
                        name: `${original.name} (Copy)`,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                });
            },

            navigateToFolder: (folderId) => {
                set((state) => {
                    state.currentFolderId = folderId;
                    state.currentPage = 1;
                    state.selectedIds = new Set();
                });
            },

            // UI Actions
            setSearchQuery: (query) => set((state) => { state.searchQuery = query; state.currentPage = 1; }),
            setSort: (column) => {
                set((state) => {
                    if (state.sortColumn === column) {
                        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        state.sortColumn = column;
                        state.sortDirection = 'asc';
                    }
                    state.currentPage = 1;
                });
            },
            setViewMode: (mode) => set({ viewMode: mode }),
            toggleSelection: (id) => {
                set((state) => {
                    if (state.selectedIds.has(id)) {
                        state.selectedIds.delete(id);
                    } else {
                        state.selectedIds.add(id);
                    }
                });
            },
            selectAll: (ids) => set((state) => { state.selectedIds = new Set(ids); }),
            clearSelection: () => set((state) => { state.selectedIds = new Set(); }),
            setCurrentPage: (page) => set({ currentPage: page }),
            setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),

            // ── Trash Actions ──
            restoreFromTrash: (id) => {
                set((state) => {
                    const idx = state.trash.findIndex((t) => t.item.id === id);
                    if (idx === -1) return;
                    const restored = state.trash[idx];
                    if (!restored) return;
                    state.trash.splice(idx, 1);
                    state.creativeSets.push(restored.item);
                });
            },

            permanentDelete: (id) => {
                // Clean up designStore first
                try { useDesignStore.getState().deleteCreativeSet(id); } catch { /* ok */ }
                set((state) => {
                    state.trash = state.trash.filter((t) => t.item.id !== id);
                });
            },

            emptyTrash: () => {
                // Clean up ALL trashed items from designStore
                set((state) => {
                    for (const t of state.trash) {
                        try { useDesignStore.getState().deleteCreativeSet(t.item.id); } catch { /* ok */ }
                    }
                    state.trash = [];
                });
            },
        })),
        {
            name: 'ace-project-store',
            // Only persist data, not UI state like selection/search/page
            partialize: (state) => ({
                creativeSets: state.creativeSets,
                folders: state.folders,
                trash: state.trash,
            }),
            // Custom storage to handle Set<string> and ensure JSON compat
            storage: {
                getItem: (name): StorageValue<Partial<ProjectState>> | null => {
                    const raw = localStorage.getItem(name);
                    if (!raw) return null;
                    try {
                        return JSON.parse(raw);
                    } catch {
                        return null;
                    }
                },
                setItem: (name, value) => {
                    localStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: (name) => {
                    localStorage.removeItem(name);
                },
            },
        },
    ),
);

