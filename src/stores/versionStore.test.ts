// ─────────────────────────────────────────────────
// versionStore.test — Version history tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useVersionStore } from './versionStore';

describe('useVersionStore', () => {
    beforeEach(() => {
        useVersionStore.setState({ versions: {} });
    });

    it('auto-saves a version', () => {
        useVersionStore.getState().autoSave('p1', '{"test": true}');
        expect(useVersionStore.getState().getVersions('p1').length).toBe(1);
    });

    it('skips duplicate auto-save', () => {
        useVersionStore.getState().autoSave('p1', '{"same": true}');
        useVersionStore.getState().autoSave('p1', '{"same": true}');
        expect(useVersionStore.getState().getVersions('p1').length).toBe(1);
    });

    it('saves manual version', () => {
        const id = useVersionStore.getState().saveVersion('p1', 'Before review', '{"v1": true}');
        expect(id).toBeTruthy();
        const v = useVersionStore.getState().getVersion('p1', id);
        expect(v!.name).toBe('Before review');
        expect(v!.type).toBe('manual');
    });

    it('returns versions newest first', () => {
        useVersionStore.getState().autoSave('p1', '{"a": 1}');
        useVersionStore.getState().autoSave('p1', '{"b": 2}');
        const versions = useVersionStore.getState().getVersions('p1');
        expect(versions[0]!.snapshot).toBe('{"b": 2}');
    });

    it('deletes a version', () => {
        const id = useVersionStore.getState().saveVersion('p1', 'Test', '{}');
        useVersionStore.getState().deleteVersion('p1', id);
        expect(useVersionStore.getState().getVersions('p1').length).toBe(0);
    });

    it('gets latest version', () => {
        useVersionStore.getState().autoSave('p1', '{"old": true}');
        useVersionStore.getState().autoSave('p1', '{"new": true}');
        const latest = useVersionStore.getState().getLatest('p1');
        expect(latest!.snapshot).toBe('{"new": true}');
    });

    it('limits auto versions to 20', () => {
        for (let i = 0; i < 25; i++) {
            useVersionStore.getState().autoSave('p1', `{"v": ${i}}`);
        }
        const autoVersions = useVersionStore.getState().getVersions('p1').filter(v => v.type === 'auto');
        expect(autoVersions.length).toBeLessThanOrEqual(20);
    });

    it('tracks size in bytes', () => {
        useVersionStore.getState().autoSave('p1', '{"data": true}');
        const v = useVersionStore.getState().getVersions('p1')[0]!;
        expect(v.sizeBytes).toBeGreaterThan(0);
    });

    it('compares sizes', () => {
        const id1 = useVersionStore.getState().saveVersion('p1', 'v1', '{"a":1}');
        const id2 = useVersionStore.getState().saveVersion('p1', 'v2', '{"a":1,"b":2,"c":3}');
        const result = useVersionStore.getState().compareSizes('p1', id1, id2);
        expect(result).not.toBeNull();
        expect(result!.diff).toBeGreaterThan(0);
    });

    it('returns empty for unknown project', () => {
        expect(useVersionStore.getState().getVersions('unknown').length).toBe(0);
    });
});
