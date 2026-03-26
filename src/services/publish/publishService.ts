// ─────────────────────────────────────────────────
// Publish Service — orchestrates publishing to platforms
// ─────────────────────────────────────────────────

import { supabase } from '@/services/supabaseClient';
import type { PublishPlatform, PublishRecord } from './publishTypes';

// ── Fetch publish history for a creative set ──
export async function getPublishHistory(creativeSetId: string): Promise<PublishRecord[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('publish_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('creative_set_id', creativeSetId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Publish] History fetch error:', error);
        return [];
    }

    return (data || []).map(mapDbToRecord);
}

// ── Fetch all recent publishes (for Activity tab) ──
export async function getRecentPublishes(limit = 20): Promise<PublishRecord[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('publish_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[Publish] Recent fetch error:', error);
        return [];
    }

    return (data || []).map(mapDbToRecord);
}

// ── Publish a single variant to a platform ──
export async function publishVariant(params: {
    creativeSetId: string;
    variantId: string;
    variantLabel: string;
    platform: PublishPlatform;
    socialAccountId: string;
    imageDataUrl: string;
    width: number;
    height: number;
    caption?: string;
    hashtags?: string[];
    headlines?: string[];
    scheduledAt?: string;
}): Promise<PublishRecord | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Upload image to Supabase Storage (public bucket for Meta API)
    const imageUrl = await uploadImageToStorage(params.imageDataUrl, user.id, params.variantId);
    if (!imageUrl) {
        console.error('[Publish] Image upload failed');
        return null;
    }

    // 2. Create publish record (pending)
    const { data: record, error: insertError } = await supabase
        .from('publish_history')
        .insert({
            user_id: user.id,
            creative_set_id: params.creativeSetId,
            variant_id: params.variantId,
            variant_label: params.variantLabel,
            platform: params.platform,
            social_account_id: params.socialAccountId,
            status: params.scheduledAt ? 'scheduled' : 'publishing',
            scheduled_at: params.scheduledAt,
            caption: params.caption,
            hashtags: params.hashtags,
            headlines: params.headlines,
            image_url: imageUrl,
            image_width: params.width,
            image_height: params.height,
        })
        .select()
        .single();

    if (insertError || !record) {
        console.error('[Publish] Insert error:', insertError);
        return null;
    }

    // 3. If not scheduled, publish immediately via Edge Function
    if (!params.scheduledAt) {
        try {
            const { data: result, error: fnError } = await supabase.functions.invoke(
                `publish-${params.platform}`, {
                    body: {
                        publishId: record.id,
                        socialAccountId: params.socialAccountId,
                        imageUrl,
                        caption: params.caption,
                        hashtags: params.hashtags,
                        headlines: params.headlines,
                    },
                }
            );

            if (fnError) throw fnError;

            // Update record with platform post ID
            await supabase
                .from('publish_history')
                .update({
                    status: 'published',
                    platform_post_id: result?.post_id,
                    published_at: new Date().toISOString(),
                })
                .eq('id', record.id);

            return mapDbToRecord({ ...record, status: 'published', platform_post_id: result?.post_id });
        } catch (err) {
            console.error('[Publish] Edge function error:', err);
            await supabase
                .from('publish_history')
                .update({
                    status: 'failed',
                    error_message: err instanceof Error ? err.message : 'Unknown error',
                })
                .eq('id', record.id);

            return mapDbToRecord({ ...record, status: 'failed' });
        }
    }

    return mapDbToRecord(record);
}

// ── Upload image to Supabase Storage ──
async function uploadImageToStorage(dataUrl: string, userId: string, variantId: string): Promise<string | null> {
    try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        const fileName = `publish/${userId}/${variantId}_${Date.now()}.png`;

        const { error } = await supabase.storage
            .from('creative-assets')
            .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: true,
            });

        if (error) {
            console.error('[Storage] Upload error:', error);
            return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('creative-assets')
            .getPublicUrl(fileName);

        return urlData?.publicUrl || null;
    } catch (err) {
        console.error('[Storage] Upload error:', err);
        return null;
    }
}

// ── DB row → PublishRecord mapper ──
function mapDbToRecord(row: any): PublishRecord {
    return {
        id: row.id,
        userId: row.user_id,
        creativeSetId: row.creative_set_id,
        variantId: row.variant_id,
        variantLabel: row.variant_label,
        platform: row.platform,
        platformPostId: row.platform_post_id,
        socialAccountId: row.social_account_id,
        status: row.status,
        scheduledAt: row.scheduled_at,
        publishedAt: row.published_at,
        caption: row.caption,
        hashtags: row.hashtags,
        headlines: row.headlines,
        imageUrl: row.image_url,
        imageWidth: row.image_width,
        imageHeight: row.image_height,
        errorMessage: row.error_message,
        createdAt: row.created_at,
    };
}
