// ─────────────────────────────────────────────────
// usePlanLimits — Plan enforcement + token-based usage tracking
// ─────────────────────────────────────────────────
// Central hook for checking plan limits and recording AI token usage.
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
    // ★ Admin override: admins get dedicated unlimited tier
    const plan: PlanTier = role === 'admin' ? 'admin' : ((user?.plan as PlanTier) ?? 'starter');
    const limits = PLAN_LIMITS[plan];

    const [usage, setUsage] = useState<UsageData>({
        month: getCurrentMonth(),
        aiTokensUsed: 0,
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
            try {
                setLoading(true);
                const { data, error } = await sb
                    .from('usage_tracking')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('month', month)
                    .maybeSingle();

                if (error) {
                    console.warn('[usePlanLimits] usage_tracking query failed:', error.message);
                    return;
                }

                if (data) {
                    const used = data.ai_generations_used ?? 0;
                    console.log(`[usePlanLimits] Loaded usage for ${month}: ${used} AI generations used`);
                    setUsage(prev => ({
                        ...prev,
                        aiTokensUsed: used,
                    }));
                } else {
                    console.log(`[usePlanLimits] No usage row for ${month} — fresh month`);
                }
            } catch (e) {
                console.warn('[usePlanLimits] usage_tracking query exception:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.id, allSetsCount]);

    // ── Check: can create a new creative set? ──
    const canCreateSet = useCallback((): boolean => {
        if (isUnlimited(limits.maxCreativeSets)) return true;
        return allSetsCount < limits.maxCreativeSets;
    }, [limits.maxCreativeSets, allSetsCount]);

    // ── Check: can use AI? (token budget remaining) ──
    const canUseAI = useCallback((): boolean => {
        return usage.aiTokensUsed < limits.aiTokensPerMonth;
    }, [usage.aiTokensUsed, limits.aiTokensPerMonth]);

    // ── Check: can export in this format? ──
    const canExportFormat = useCallback((format: ExportFormat): boolean => {
        return limits.allowedExports.includes(format);
    }, [limits.allowedExports]);

    // ── Check: can add more variants to a set? ──
    const canAddVariant = useCallback((currentVariantCount: number): boolean => {
        if (isUnlimited(limits.maxVariantsPerSet)) return true;
        return currentVariantCount < limits.maxVariantsPerSet;
    }, [limits.maxVariantsPerSet]);

    // ── Record AI token usage (increment counter) ──
    const recordAIUsage = useCallback(async (tokenCount: number): Promise<boolean> => {
        if (usage.aiTokensUsed + tokenCount > limits.aiTokensPerMonth) {
            return false; // Would exceed limit
        }

        // Optimistic update
        setUsage(prev => ({
            ...prev,
            aiTokensUsed: prev.aiTokensUsed + tokenCount,
        }));

        // Persist to Supabase — explicit SELECT → INSERT or UPDATE
        const sb = getSupabase();
        if (sb && user?.id) {
            const month = getCurrentMonth();
            try {
                const { data: existing, error: readErr } = await sb
                    .from('usage_tracking')
                    .select('id, ai_generations_used')
                    .eq('user_id', user.id)
                    .eq('month', month)
                    .maybeSingle();

                if (readErr) {
                    console.error('[usePlanLimits] Read usage failed:', readErr.message);
                    return true; // Still allow AI use, just tracking failed
                }

                if (existing) {
                    // Row exists → UPDATE
                    const newUsed = (existing.ai_generations_used ?? 0) + tokenCount;
                    const { error: updateErr } = await sb
                        .from('usage_tracking')
                        .update({
                            ai_generations_used: newUsed,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existing.id);

                    if (updateErr) {
                        console.error('[usePlanLimits] UPDATE usage failed:', updateErr.message);
                    } else {
                        console.log(`[usePlanLimits] AI usage updated: ${newUsed} (+${tokenCount})`);
                    }
                } else {
                    // No row → INSERT
                    const { error: insertErr } = await sb
                        .from('usage_tracking')
                        .insert({
                            user_id: user.id,
                            month,
                            ai_generations_used: tokenCount,
                            exports_used: 0,
                        });

                    if (insertErr) {
                        console.error('[usePlanLimits] INSERT usage failed:', insertErr.message);
                    } else {
                        console.log(`[usePlanLimits] AI usage created: ${tokenCount} for ${month}`);
                    }
                }
            } catch (err) {
                console.error('[usePlanLimits] AI usage tracking exception:', err);
            }
        }

        return true;
    }, [usage.aiTokensUsed, limits.aiTokensPerMonth, user?.id]);

    // ── Remaining token budget ──
    const remainingTokens = Math.max(0, limits.aiTokensPerMonth - usage.aiTokensUsed);
    const remainingSets = isUnlimited(limits.maxCreativeSets)
        ? -1
        : Math.max(0, limits.maxCreativeSets - allSetsCount);

    // ── Usage percentage for progress bars ──
    const aiUsagePercent = limits.aiTokensPerMonth > 0
        ? Math.min(100, Math.round((usage.aiTokensUsed / limits.aiTokensPerMonth) * 100))
        : 0;

    return {
        // Current plan info
        plan,
        planName: plan === 'admin' ? 'Admin' : plan.charAt(0).toUpperCase() + plan.slice(1),
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
        remainingTokens,
        remainingSets,
        aiUsagePercent,

        // Convenience
        isStarter: plan === 'starter',
        isCreator: plan === 'creator',
        isPro: plan === 'pro',
        isEnterprise: plan === 'enterprise',
        isAdmin: plan === 'admin',
    };
}
