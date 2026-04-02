// ─────────────────────────────────────────────────
// dashboardExecutor.test.ts — Dashboard tool router
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('./executors/projectExecutor', () => ({
    executeProjectTool: vi.fn().mockReturnValue(null),
}));
vi.mock('./executors/designExecutor', () => ({
    executeDesignTool: vi.fn().mockReturnValue(null),
}));

import { executeDashboardTool } from './dashboardExecutor';
import { executeProjectTool } from './executors/projectExecutor';
import { executeDesignTool } from './executors/designExecutor';

describe('executeDashboardTool', () => {
    it('returns unknown tool error for unrecognized tools', () => {
        const r = executeDashboardTool('nonexistent_tool', {});
        expect(r.success).toBe(false);
        expect(r.message).toContain('Unknown dashboard tool');
    });

    it('routes to project executor first', () => {
        vi.mocked(executeProjectTool).mockReturnValueOnce({ success: true, message: 'created' });
        const r = executeDashboardTool('create_project', { name: 'Test' });
        expect(r.success).toBe(true);
        expect(executeProjectTool).toHaveBeenCalledWith('create_project', { name: 'Test' }, undefined);
    });

    it('falls through to design executor if project returns null', () => {
        vi.mocked(executeProjectTool).mockReturnValueOnce(null);
        vi.mocked(executeDesignTool).mockReturnValueOnce({ success: true, message: 'styled' });
        const r = executeDashboardTool('set_color', { color: '#fff' });
        expect(r.success).toBe(true);
        expect(executeDesignTool).toHaveBeenCalled();
    });

    it('passes navigate function to project executor', () => {
        const nav = vi.fn();
        executeDashboardTool('go_page', {}, nav);
        expect(executeProjectTool).toHaveBeenCalledWith('go_page', {}, nav);
    });

    it('catches errors and returns failure', () => {
        vi.mocked(executeProjectTool).mockImplementation(() => { throw new Error('boom'); });
        const r = executeDashboardTool('bad_tool', {});
        expect(r.success).toBe(false);
        expect(r.message).toContain('Error');
    });
});
