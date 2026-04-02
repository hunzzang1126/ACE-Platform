// ─────────────────────────────────────────────────
// socialAccountService.test.ts — Social account tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
};

vi.mock('@/services/supabaseClient', () => ({
    getSupabase: vi.fn().mockImplementation(() => mockSupabase),
}));

import {
    getConnectedAccounts, getAccountForPlatform,
    disconnectAccount, saveConnectedAccount,
    getMetaOAuthUrl, getGoogleAdsOAuthUrl,
    handleMetaCallback, handleGoogleAdsCallback,
} from './socialAccountService';

describe('socialAccountService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    });

    describe('getConnectedAccounts', () => {
        it('should return empty when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            expect(await getConnectedAccounts()).toEqual([]);
        });

        it('should return empty when no user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
            expect(await getConnectedAccounts()).toEqual([]);
        });

        it('should map DB rows to SocialAccount', async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: [{ id: 'sa-1', user_id: 'user-1', platform: 'instagram', account_name: '@test' }],
                    error: null,
                }),
            };
            mockSupabase.from.mockReturnValue(mockChain);

            const accounts = await getConnectedAccounts();
            expect(accounts).toHaveLength(1);
            expect(accounts[0].platform).toBe('instagram');
            expect(accounts[0].accountName).toBe('@test');
        });

        it('should return empty on error', async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } }),
            };
            mockSupabase.from.mockReturnValue(mockChain);
            expect(await getConnectedAccounts()).toEqual([]);
        });
    });

    describe('disconnectAccount', () => {
        it('should return false when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            expect(await disconnectAccount('sa-1')).toBe(false);
        });

        it('should delete and return true', async () => {
            const mockChain = {
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            };
            mockSupabase.from.mockReturnValue(mockChain);
            expect(await disconnectAccount('sa-1')).toBe(true);
        });
    });

    describe('saveConnectedAccount', () => {
        it('should return null when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            expect(await saveConnectedAccount({
                userId: 'u-1', platform: 'instagram', platformUserId: 'ig-1',
                accountName: 'test',
            } as any)).toBeNull();
        });
    });

    describe('OAuth URLs', () => {
        it('getMetaOAuthUrl returns string', () => {
            const url = getMetaOAuthUrl();
            // Returns empty if no VITE_META_APP_ID, or a FB URL if set
            expect(typeof url).toBe('string');
        });

        it('getGoogleAdsOAuthUrl returns string', () => {
            const url = getGoogleAdsOAuthUrl();
            expect(typeof url).toBe('string');
        });
    });

    describe('OAuth callbacks', () => {
        it('handleMetaCallback returns null when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            expect(await handleMetaCallback('code')).toBeNull();
        });

        it('handleGoogleAdsCallback returns null when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            expect(await handleGoogleAdsCallback('code')).toBeNull();
        });

        it('handleMetaCallback returns null when no user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
            expect(await handleMetaCallback('code')).toBeNull();
        });

        it('handleGoogleAdsCallback returns null when no user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
            expect(await handleGoogleAdsCallback('code')).toBeNull();
        });
    });
});
