// ─────────────────────────────────────────────────
// usePlanLimits — Plan enforcement + usage tracking
// ─────────────────────────────────────────────────
// Central hook for checking plan limits and recording usage.
// All feature gates should call this hook.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDesignStore } from '@/stores/designStore';
import { getSupabase } from '@/services/supabaseClient';
import {
    type PlanTier,
    type ExportFormat,
    type UsageData,
    PLAN_LIMITS,
    isUnlimited,
} from '@/schema/planTypes';

// ── Current month string ─────────────────────────
function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Hook ─────────────────────────────────────────

export function usePlanLimits() {
    const user = useAuthStore(s => s.user);
    const role = useAuthStore(s => s.role);
    // ★ Admin override: admins get full enterprise access regardless of subscription
    const plan: PlanTier = role === 'admin' ? 'enterprise' : ((user?.plan as PlanTier) ?? 'starter');
    const limits = PLAN_LIMITS[plan];

    const [usage, setUsage] = useState<UsageData>({
        month: getCurrentMonth(),
        aiGenerationsUsed: 0,
        creativeSetsCount: 0,
    });

    const [loading, setLoading] = useState(false);

    // Count creative sets from designStore
    const allSetsCount = useDesignStore(s => Object.keys(s.allCreativeSets).length);

    // ── Load usage from Supabase ──
    useEffect(() => {
        if (!user?.id) return;
        const month = getCurrentMonth();

        setUsage(prev => ({ ...prev, month, creativeSetsCount: allSetsCount }));

        const sb = getSupabase();
        if (!sb) return;

        (async () => {
            const { data } = await sb
                .from('usage_tracking')
                .select('ai_generations_used, exports_used')
                .eq('user_id', user.id)
                .eq('month', month)
                .maybeSingle();

            if (data) {
                setUsage(prev => ({
                    ...prev,
                    aiGenerationsUsed: data.ai_generations_used ?? 0,
                }));
            }
        })();
    }, [user?.id, allSetsCount]);

    // ── Check: can create a new creative set? ──
    const canCreateSet = useCallback((): boolean => {
        if (isUnlimited(limits.maxCreativeSets)) return true;
        return allSetsCount < limits.maxCreativeSets;
    }, [limits.maxCreativeSets, allSetsCount]);

    // ── Check: can use AI generation? ──
    const canUseAI = useCallback((): boolean => {
        return usage.aiGenerationsUsed < limits.aiGenerationsPerMonth;
    }, [usage.aiGenerationsUsed, limits.aiGenerationsPerMonth]);

    // ── Check: can export in this format? ──
    const canExportFormat = useCallback((format: ExportFormat): boolean => {
        return limits.allowedExports.includes(format);
    }, [limits.allowedExports]);

    // ── Check: can add more variants to a set? ──
    const canAddVariant = useCallback((currentVariantCount: number): boolean => {
        if (isUnlimited(limits.maxVariantsPerSet)) return true;
        return currentVariantCount < limits.maxVariantsPerSet;
    }, [limits.maxVariantsPerSet]);

    // ── Record AI usage (increment counter) ──
    const recordAIUsage = useCallback(async (count = 1): Promise<boolean> => {
        if (usage.aiGenerationsUsed + count > limits.aiGenerationsPerMonth) {
            return false; // Would exceed limit
        }

        // Optimistic update
        setUsage(prev => ({
            ...prev,
            aiGenerationsUsed: prev.aiGenerationsUsed + count,
        }));

        // Persist to Supabase
        const sb = getSupabase();
        if (sb && user?.id) {
            try {
                await sb.rpc('increment_ai_usage', {
                    p_user_id: user.id,
                    p_count: count,
                });
            } catch (err) {
                console.error('[usePlanLimits] Failed to record AI usage:', err);
            }
        }

        return true;
    }, [usage.aiGenerationsUsed, limits.aiGenerationsPerMonth, user?.id]);

    // ── Remaining counts ──
    const remainingAI = Math.max(0, limits.aiGenerationsPerMonth - usage.aiGenerationsUsed);
    const remainingSets = isUnlimited(limits.maxCreativeSets)
        ? -1
        : Math.max(0, limits.maxCreativeSets - allSetsCount);

    // ── Usage percentage for progress bars ──
    const aiUsagePercent = limits.aiGenerationsPerMonth > 0
        ? Math.min(100, Math.round((usage.aiGenerationsUsed / limits.aiGenerationsPerMonth) * 100))
        : 0;

    return {
        // Current plan info
        plan,
        planName: plan.charAt(0).toUpperCase() + plan.slice(1),
        limits,

        // Usage data
        usage,
        loading,

        // Checks
        canCreateSet,
        canUseAI,
        canExportFormat,
        canAddVariant,

        // Actions
        recordAIUsage,

        // Computed
        remainingAI,
        remainingSets,
        aiUsagePercent,

        // Convenience
        isStarter: plan === 'starter',
        isPro: plan === 'pro',
        isEnterprise: plan === 'enterprise',
    };
}
