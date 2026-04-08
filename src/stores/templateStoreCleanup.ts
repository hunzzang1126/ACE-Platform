// ─────────────────────────────────────────────────
// templateStoreCleanup — Orphan cleanup for template editing
// ─────────────────────────────────────────────────

/**
 * Clean up orphaned "[Template] X" creative sets left behind
 * if the app crashed or refreshed mid-template-edit.
 * Uses dynamic import() to avoid cross-store deadlock.
 */
export async function cleanupOrphanedTemplateCS(): Promise<void> {
    try {
        const { useDesignStore } = await import('@/stores/designStore');
        const { useProjectStore } = await import('@/stores/projectStore');
        const allCS = useDesignStore.getState().getAllCreativeSets();
        for (const cs of allCS) {
            if (cs.name.startsWith('[Template]')) {
                useDesignStore.getState().deleteCreativeSet(cs.id);
                useProjectStore.setState((s: any) => {
                    s.creativeSets = s.creativeSets.filter((x: any) => x.id !== cs.id);
                });
            }
        }
    } catch (e) {
        console.warn('[templateStore] Orphan cleanup failed:', e);
    }
}
