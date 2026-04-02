// ─────────────────────────────────────────────────
// publishService.test.ts — Publish pipeline tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    storage: { from: vi.fn() },
};

vi.mock('@/services/supabaseClient', () => ({
    getSupabase: vi.fn().mockImplementation(() => mockSupabase),
}));

import { getPublishHistory, getRecentPublishes, publishVariant } from './publishService';

describe('publishService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    });

    describe('getPublishHistory', () => {
        it('should return empty when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            const result = await getPublishHistory('cs-1');
            expect(result).toEqual([]);
        });

        it('should return empty when no user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
            const result = await getPublishHistory('cs-1');
            expect(result).toEqual([]);
        });

        it('should query and map records', async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: [{
                        id: 'pub-1', user_id: 'user-1', creative_set_id: 'cs-1',
                        variant_id: 'v-1', variant_label: '300x250', platform: 'instagram',
                        status: 'published', image_url: 'https://img.com/test.png',
                        image_width: 300, image_height: 250,
                    }],
                    error: null,
                }),
            };
            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getPublishHistory('cs-1');
            expect(result).toHaveLength(1);
            expect(result[0].platform).toBe('instagram');
            expect(result[0].variantLabel).toBe('300x250');
        });

        it('should return empty on query error', async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            };
            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getPublishHistory('cs-1');
            expect(result).toEqual([]);
        });
    });

    describe('getRecentPublishes', () => {
        it('should return empty when no user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
            const result = await getRecentPublishes();
            expect(result).toEqual([]);
        });

        it('should respect limit param', async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
            mockSupabase.from.mockReturnValue(mockChain);

            await getRecentPublishes(5);
            expect(mockChain.limit).toHaveBeenCalledWith(5);
        });
    });

    describe('publishVariant', () => {
        it('should return null when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            const result = await publishVariant({
                creativeSetId: 'cs-1', variantId: 'v-1', variantLabel: '300x250',
                platform: 'instagram', socialAccountId: 'sa-1',
                imageDataUrl: 'data:image/png;base64,abc', width: 300, height: 250,
            });
            expect(result).toBeNull();
        });
    });
});
