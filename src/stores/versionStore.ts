// ─────────────────────────────────────────────────
// versionStore — Design version history
// ─────────────────────────────────────────────────
// Auto-snapshot on save, manual named versions,
// restore any version. Keeps last 30 versions per project.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface DesignVersion {
    id: string;
    projectId: string;
    name: string;
    /** Serialized creative set data */
    snapshot: string;
    /** File size in bytes */
    sizeBytes: number;
    createdAt: string;
    /** Auto vs manual */
    type: 'auto' | 'manual';
}

interface VersionState {
    versions: Record<string, DesignVersion[]>; // projectId -> versions

    /** Auto-save a version (keeps last 30) */
    autoSave: (projectId: string, snapshot: string) => void;

    /** Manually save a named version */
    saveVersion: (projectId: string, name: string, snapshot: string) => string;

    /** Get all versions for a project */
    getVersions: (projectId: string) => DesignVersion[];

    /** Get a specific version */
    getVersion: (projectId: string, versionId: string) => DesignVersion | undefined;

    /** Delete a version */
    deleteVersion: (projectId: string, versionId: string) => void;

    /** Get latest version */
    getLatest: (projectId: string) => DesignVersion | undefined;

    /** Compare two version sizes */
    compareSizes: (projectId: string, v1Id: string, v2Id: string) => { diff: number; percentage: number } | null;
}

const MAX_VERSIONS = 30;
const MAX_AUTO_VERSIONS = 20;

function genId(): string {
    return `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useVersionStore = create<VersionState>()(
    persist(
        immer((set, get) => ({
            versions: {},

            autoSave: (projectId, snapshot) => {
                set(state => {
                    if (!state.versions[projectId]) state.versions[projectId] = [];
                    const list = state.versions[projectId]!;

                    // Skip if identical to last auto-save
                    const lastAuto = [...list].reverse().find(v => v.type === 'auto');
                    if (lastAuto?.snapshot === snapshot) return;

                    list.push({
                        id: genId(),
                        projectId,
                        name: `Auto-save ${new Date().toLocaleTimeString()}`,
                        snapshot,
                        sizeBytes: new Blob([snapshot]).size,
                        createdAt: new Date().toISOString(),
                        type: 'auto',
                    });

                    // Trim auto versions (keep last MAX_AUTO_VERSIONS)
                    const autoVersions = list.filter(v => v.type === 'auto');
                    if (autoVersions.length > MAX_AUTO_VERSIONS) {
                        const toRemove = autoVersions.slice(0, autoVersions.length - MAX_AUTO_VERSIONS);
                        state.versions[projectId] = list.filter(v => !toRemove.includes(v));
                    }

                    // Trim total (keep last MAX_VERSIONS)
                    if (state.versions[projectId]!.length > MAX_VERSIONS) {
                        state.versions[projectId] = state.versions[projectId]!.slice(-MAX_VERSIONS);
                    }
                });
            },

            saveVersion: (projectId, name, snapshot) => {
                const id = genId();
                set(state => {
                    if (!state.versions[projectId]) state.versions[projectId] = [];
                    state.versions[projectId]!.push({
                        id,
                        projectId,
                        name,
                        snapshot,
                        sizeBytes: new Blob([snapshot]).size,
                        createdAt: new Date().toISOString(),
                        type: 'manual',
                    });

                    if (state.versions[projectId]!.length > MAX_VERSIONS) {
                        state.versions[projectId] = state.versions[projectId]!.slice(-MAX_VERSIONS);
                    }
                });
                return id;
            },

            getVersions: (projectId) =>
                (get().versions[projectId] ?? []).slice().reverse(), // newest first

            getVersion: (projectId, versionId) =>
                get().versions[projectId]?.find(v => v.id === versionId),

            deleteVersion: (projectId, versionId) => {
                set(state => {
                    if (!state.versions[projectId]) return;
                    state.versions[projectId] = state.versions[projectId]!.filter(v => v.id !== versionId);
                });
            },

            getLatest: (projectId) => {
                const list = get().versions[projectId];
                if (!list || list.length === 0) return undefined;
                return list[list.length - 1];
            },

            compareSizes: (projectId, v1Id, v2Id) => {
                const v1 = get().getVersion(projectId, v1Id);
                const v2 = get().getVersion(projectId, v2Id);
                if (!v1 || !v2) return null;
                const diff = v2.sizeBytes - v1.sizeBytes;
                const percentage = v1.sizeBytes > 0 ? (diff / v1.sizeBytes) * 100 : 0;
                return { diff, percentage };
            },
        })),
        { name: 'ace-versions' },
    ),
);
