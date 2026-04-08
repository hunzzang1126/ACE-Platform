// ─────────────────────────────────────────────────
// cloudSyncProjects.test.ts — Error-checking delete + pull/push
// ─────────────────────────────────────────────────
// Covers:
// - deleteProjectPermanently throws on Supabase error
// - deleteCreativeSetCloud throws on Supabase error
// - Both no-op gracefully when Supabase is unavailable
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase ──
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockSB = {
    from: vi.fn(() => ({
        delete: () => {
            mockDelete();
            return { eq: mockEq };
        },
    })),
};

const { mockGetSupabase } = vi.hoisted(() => ({
    mockGetSupabase: vi.fn(() => mockSB),
}));

vi.mock('./supabaseClient', () => ({
    getSupabase: mockGetSupabase,
}));

import { deleteProjectPermanently, deleteCreativeSetCloud } from './cloudSyncProjects';

beforeEach(() => {
    vi.clearAllMocks();
    mockGetSupabase.mockReturnValue(mockSB);
});

// ═════════════════════════════════════════════════
// deleteProjectPermanently
// ═════════════════════════════════════════════════

describe('★ REGRESSION: deleteProjectPermanently — reliable deletion', () => {

    it('should call supabase.from("projects").delete().eq(id)', async () => {
        mockEq.mockResolvedValue({ error: null });
        await deleteProjectPermanently('proj-123');
        expect(mockSB.from).toHaveBeenCalledWith('projects');
        expect(mockEq).toHaveBeenCalledWith('id', 'proj-123');
    });

    it('should throw when Supabase returns an error', async () => {
        mockEq.mockResolvedValue({ error: { message: 'RLS policy violation' } });
        await expect(deleteProjectPermanently('proj-bad'))
            .rejects.toThrow('[cloudSync] deleteProject failed: RLS policy violation');
    });

    it('should no-op when Supabase is unavailable', async () => {
        mockGetSupabase.mockReturnValue(null as any);
        await expect(deleteProjectPermanently('proj-123')).resolves.toBeUndefined();
        expect(mockSB.from).not.toHaveBeenCalled();
    });
});

// ═════════════════════════════════════════════════
// deleteCreativeSetCloud
// ═════════════════════════════════════════════════

describe('★ REGRESSION: deleteCreativeSetCloud — reliable deletion', () => {

    it('should call supabase.from("creative_sets").delete().eq(id)', async () => {
        mockEq.mockResolvedValue({ error: null });
        await deleteCreativeSetCloud('cs-456');
        expect(mockSB.from).toHaveBeenCalledWith('creative_sets');
        expect(mockEq).toHaveBeenCalledWith('id', 'cs-456');
    });

    it('should throw when Supabase returns an error', async () => {
        mockEq.mockResolvedValue({ error: { message: 'Network timeout' } });
        await expect(deleteCreativeSetCloud('cs-bad'))
            .rejects.toThrow('[cloudSync] deleteCreativeSet failed: Network timeout');
    });

    it('should no-op when Supabase is unavailable', async () => {
        mockGetSupabase.mockReturnValue(null as any);
        await expect(deleteCreativeSetCloud('cs-456')).resolves.toBeUndefined();
        expect(mockSB.from).not.toHaveBeenCalled();
    });
});
