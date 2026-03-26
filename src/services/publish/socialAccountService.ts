// ─────────────────────────────────────────────────
// Social Account Service — manages OAuth connections
// ─────────────────────────────────────────────────
// Handles connecting/disconnecting social accounts,
// storing tokens in Supabase, and token refresh.
// ─────────────────────────────────────────────────

import { supabase } from '@/services/supabaseClient';
import type { SocialAccount, PublishPlatform } from './publishTypes';

// ── Fetch connected accounts ──
export async function getConnectedAccounts(): Promise<SocialAccount[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('user_social_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('connected_at', { ascending: false });

    if (error) {
        console.error('[SocialAccounts] Fetch error:', error);
        return [];
    }

    return (data || []).map(mapDbToAccount);
}

// ── Get account for a specific platform ──
export async function getAccountForPlatform(platform: PublishPlatform): Promise<SocialAccount | null> {
    const accounts = await getConnectedAccounts();
    return accounts.find(a => a.platform === platform) || null;
}

// ── Disconnect an account ──
export async function disconnectAccount(accountId: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_social_accounts')
        .delete()
        .eq('id', accountId);

    if (error) {
        console.error('[SocialAccounts] Disconnect error:', error);
        return false;
    }
    return true;
}

// ── Save account after OAuth ──
export async function saveConnectedAccount(account: Omit<SocialAccount, 'id' | 'connectedAt'>): Promise<SocialAccount | null> {
    const { data, error } = await supabase
        .from('user_social_accounts')
        .upsert({
            user_id: account.userId,
            platform: account.platform,
            platform_user_id: account.platformUserId,
            account_name: account.accountName,
            account_avatar: account.accountAvatar,
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
            token_expires_at: account.tokenExpiresAt,
            scopes: account.scopes,
        }, {
            onConflict: 'user_id,platform,platform_user_id',
        })
        .select()
        .single();

    if (error) {
        console.error('[SocialAccounts] Save error:', error);
        return null;
    }

    return mapDbToAccount(data);
}

// ── Meta OAuth URL ──
export function getMetaOAuthUrl(): string {
    const appId = import.meta.env.VITE_META_APP_ID;
    if (!appId) {
        console.error('[OAuth] VITE_META_APP_ID not set');
        return '';
    }
    const redirectUri = `${window.location.origin}/auth/callback/meta`;
    const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_show_list',
    ].join(',');
    
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
}

// ── Google Ads OAuth URL ──
export function getGoogleAdsOAuthUrl(): string {
    const clientId = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID;
    if (!clientId) {
        console.error('[OAuth] VITE_GOOGLE_ADS_CLIENT_ID not set');
        return '';
    }
    const redirectUri = `${window.location.origin}/auth/callback/google-ads`;
    const scopes = 'https://www.googleapis.com/auth/adwords';
    
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&access_type=offline&prompt=consent`;
}

// ── Handle Meta OAuth callback ──
export async function handleMetaCallback(code: string): Promise<SocialAccount | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Exchange code for token via Edge Function (keeps app secret server-side)
    const { data, error } = await supabase.functions.invoke('meta-oauth-callback', {
        body: {
            code,
            redirectUri: `${window.location.origin}/auth/callback/meta`,
        },
    });

    if (error || !data) {
        console.error('[OAuth] Meta callback error:', error);
        return null;
    }

    // Save the account
    return saveConnectedAccount({
        userId: user.id,
        platform: 'instagram',
        platformUserId: data.instagram_user_id,
        accountName: data.instagram_username,
        accountAvatar: data.profile_picture_url,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: data.token_expires_at,
        scopes: data.scopes,
    });
}

// ── Handle Google Ads OAuth callback ──
export async function handleGoogleAdsCallback(code: string): Promise<SocialAccount | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.functions.invoke('google-ads-oauth-callback', {
        body: {
            code,
            redirectUri: `${window.location.origin}/auth/callback/google-ads`,
        },
    });

    if (error || !data) {
        console.error('[OAuth] Google Ads callback error:', error);
        return null;
    }

    return saveConnectedAccount({
        userId: user.id,
        platform: 'google_ads',
        platformUserId: data.customer_id,
        accountName: data.account_name || `Account ${data.customer_id}`,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: data.token_expires_at,
        scopes: ['adwords'],
    });
}

// ── DB row → SocialAccount mapper ──
function mapDbToAccount(row: any): SocialAccount {
    return {
        id: row.id,
        userId: row.user_id,
        platform: row.platform,
        platformUserId: row.platform_user_id,
        accountName: row.account_name,
        accountAvatar: row.account_avatar,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        tokenExpiresAt: row.token_expires_at,
        scopes: row.scopes,
        connectedAt: row.connected_at,
    };
}
