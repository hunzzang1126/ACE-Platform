// ─────────────────────────────────────────────────
// dynamicActionSandbox.test.ts — Security tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { scanForViolations, executeSandboxed, getBlockedPatternList } from './dynamicActionSandbox';

const mockContext = {
    designStore: { creativeSet: { name: 'Test' } },
    useDesignStore: { getState: () => ({ creativeSet: { name: 'Test' } }) },
    useProjectStore: { getState: () => ({}) },
    uuid: () => 'test-uuid-123',
};

describe('dynamicActionSandbox', () => {
    describe('scanForViolations', () => {
        it('should block eval()', () => {
            const result = scanForViolations('eval("alert(1)")');
            expect(result).not.toBeNull();
            expect(result!.reason).toContain('eval');
        });

        it('should block fetch()', () => {
            const result = scanForViolations('fetch("https://evil.com")');
            expect(result).not.toBeNull();
            expect(result!.reason).toContain('fetch');
        });

        it('should block new Function()', () => {
            const result = scanForViolations('new Function("return 1")');
            expect(result).not.toBeNull();
        });

        it('should block document.cookie', () => {
            const result = scanForViolations('const c = document.cookie');
            expect(result).not.toBeNull();
        });

        it('should block localStorage.setItem', () => {
            const result = scanForViolations('localStorage.setItem("key", "val")');
            expect(result).not.toBeNull();
        });

        it('should block dynamic import', () => {
            const result = scanForViolations('import("./malicious")');
            expect(result).not.toBeNull();
        });

        it('should block innerHTML mutation', () => {
            const result = scanForViolations('el.innerHTML = "<script>bad</script>"');
            expect(result).not.toBeNull();
        });

        it('should allow safe store operations', () => {
            const safe = 'useDesignStore.getState().updateMasterElement(1, { color: "#ff0000" })';
            expect(scanForViolations(safe)).toBeNull();
        });

        it('should allow setState calls', () => {
            const safe = 'useDesignStore.setState(s => { s.creativeSet.name = "New" })';
            expect(scanForViolations(safe)).toBeNull();
        });

        it('should allow localStorage.getItem (read-only)', () => {
            const safe = 'const v = localStorage.getItem("key")';
            expect(scanForViolations(safe)).toBeNull();
        });
    });

    describe('executeSandboxed', () => {
        it('should execute safe code successfully', async () => {
            const result = await executeSandboxed('const x = 1 + 1;', mockContext);
            expect(result.success).toBe(true);
        });

        it('should block dangerous code before execution', async () => {
            const result = await executeSandboxed('fetch("https://evil.com")', mockContext);
            expect(result.success).toBe(false);
            expect(result.blocked).toBeDefined();
        });

        it('should catch runtime errors', async () => {
            const result = await executeSandboxed('throw new Error("boom")', mockContext);
            expect(result.success).toBe(false);
            expect(result.error).toBe('boom');
        });

        it('should provide access to store context', async () => {
            const result = await executeSandboxed(
                'const name = designStore.creativeSet.name; if (name !== "Test") throw new Error("wrong")',
                mockContext,
            );
            expect(result.success).toBe(true);
        });

        it('should handle code with undefined return', async () => {
            // Sync infinite loops can't be timed out (blocks thread).
            // This tests that normal completion works correctly.
            const result = await executeSandboxed(
                'const x = 42;',
                mockContext,
                100,
            );
            expect(result.success).toBe(true);
        });
    });

    describe('getBlockedPatternList', () => {
        it('should return all blocked patterns', () => {
            const list = getBlockedPatternList();
            expect(list.length).toBeGreaterThan(10);
            expect(list.some(p => p.includes('eval'))).toBe(true);
            expect(list.some(p => p.includes('fetch'))).toBe(true);
        });
    });
});
