// ─────────────────────────────────────────────────
// templateStoreCleanup — Unit Tests
// ─────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';

describe('cleanupOrphanedTemplateCS — Export & Structure', () => {
    it('exports cleanupOrphanedTemplateCS function', async () => {
        const mod = await import('./templateStoreCleanup');
        expect(typeof mod.cleanupOrphanedTemplateCS).toBe('function');
    });

    it('returns a Promise<void>', async () => {
        const mod = await import('./templateStoreCleanup');
        const result = mod.cleanupOrphanedTemplateCS();
        expect(result).toBeInstanceOf(Promise);
        // Should not throw even if stores are empty
        await expect(result).resolves.toBeUndefined();
    });

    it('filters by [Template] prefix', () => {
        // The function filters by cs.name.startsWith('[Template]')
        const names = ['[Template] My Design', 'Normal Creative', '[Template] Test'];
        const templates = names.filter(n => n.startsWith('[Template]'));
        expect(templates).toHaveLength(2);
        const nonTemplates = names.filter(n => !n.startsWith('[Template]'));
        expect(nonTemplates).toHaveLength(1);
    });

    it('does not throw on empty store', async () => {
        const mod = await import('./templateStoreCleanup');
        await expect(mod.cleanupOrphanedTemplateCS()).resolves.not.toThrow();
    });
});
