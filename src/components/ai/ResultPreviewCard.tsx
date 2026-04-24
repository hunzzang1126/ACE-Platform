// ─────────────────────────────────────────────────
// ResultPreviewCard — Inline preview after AI design completion
// ─────────────────────────────────────────────────
// Shows a success card with summary text, stats, and feedback buttons.
// Feedback persists to AI memory for cross-session learning.
// Brand palette: Mint accent for success state.
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useAppI18n } from '@/i18n';

interface ResultPreviewCardProps {
    summary: string;
    elementCount?: number;
    durationSec?: number;
    /** If last tool was execute_dynamic_action, pass the tool name */
    lastToolName?: string;
    /** The JS code pattern from the last dynamic action (for skill promotion) */
    lastCodePattern?: string;
}

type FeedbackState = 'none' | 'liked' | 'disliked';

// ── Inline SVG paths (no emoji) ──
const THUMB_PATH = 'M5 9V14H3C2.45 14 2 13.55 2 13V10C2 9.45 2.45 9 3 9H5ZM5 9L8 2C8.53 2 9.04 2.21 9.41 2.59C9.79 2.96 10 3.47 10 4V6H13.17C13.42 6 13.67 6.05 13.89 6.16C14.11 6.27 14.3 6.42 14.44 6.61C14.59 6.8 14.69 7.03 14.73 7.27C14.77 7.51 14.75 7.75 14.67 7.98L12.93 13C12.82 13.32 12.61 13.6 12.33 13.79C12.05 13.99 11.72 14.08 11.39 14.07H5';

function FeedbackBtn({ type, active, dimmed, onClick, title }: {
    type: 'up' | 'down'; active: boolean; dimmed: boolean;
    onClick: () => void; title: string;
}) {
    const isUp = type === 'up';
    const accentColor = isUp ? '#2DD4BF' : '#f85149';
    const strokeColor = active ? accentColor : '#94a3b8';

    return (
        <button
            onClick={onClick}
            disabled={active || dimmed}
            title={title}
            style={{
                width: 26, height: 26, borderRadius: 6,
                border: active ? `1px solid ${accentColor}` : '1px solid rgba(0,0,0,0.08)',
                background: active ? `${accentColor}14` : 'rgba(0,0,0,0.02)',
                cursor: active || dimmed ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
                opacity: dimmed ? 0.3 : 1,
            }}
        >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
                stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={isUp ? undefined : { transform: 'scaleY(-1)' }}
            >
                <path d={THUMB_PATH} />
            </svg>
        </button>
    );
}

export function ResultPreviewCard({ summary, elementCount, durationSec, lastToolName, lastCodePattern }: ResultPreviewCardProps) {
    const { t } = useAppI18n();
    const [feedback, setFeedback] = useState<FeedbackState>('none');
    const [skillPrompt, setSkillPrompt] = useState<'hidden' | 'asking' | 'saved'>('hidden');

    const isDynamicAction = lastToolName === 'execute_dynamic_action' && !!lastCodePattern;

    const handleFeedback = useCallback(async (type: 'liked' | 'disliked') => {
        if (feedback !== 'none') return;
        setFeedback(type);
        try {
            const { recordFeedback } = await import('@/services/aiMemoryService');
            await recordFeedback(type);
            console.info(`[Feedback] Design ${type}`);
        } catch (err) {
            console.warn('[Feedback] Failed to save:', err);
        }
        // If liked a dynamic action, offer to save as skill
        if (type === 'liked' && isDynamicAction) {
            setSkillPrompt('asking');
        }
    }, [feedback, isDynamicAction]);

    const handleSaveSkill = useCallback(async () => {
        if (!lastCodePattern) return;
        try {
            const { promoteToSkill } = await import('@/ai/skillRegistry');
            const name = summary.length > 40 ? summary.slice(0, 40) + '...' : summary;
            await promoteToSkill(name, summary, 'User-promoted dynamic action', [summary.slice(0, 60)], lastCodePattern);
            setSkillPrompt('saved');
            console.info('[Feedback] Dynamic action promoted to learned skill');
        } catch (err) {
            console.warn('[Feedback] Skill promotion failed:', err);
        }
    }, [summary, lastCodePattern]);

    return (
        <div style={{
            margin: '6px 10px', padding: '12px 14px',
            background: 'linear-gradient(145deg, rgba(45,212,191,0.06), rgba(99,102,241,0.03))',
            border: '1px solid rgba(45,212,191,0.15)',
            borderRadius: 12, transition: 'all 0.3s ease',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                    width: 20, height: 20, borderRadius: 6,
                    background: 'linear-gradient(135deg, #2DD4BF, #6366F1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontWeight: 700,
                }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="3,8 7,12 13,4" />
                    </svg>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0f766e' }}>
                    {t('ai.designComplete') || 'Design Complete'}
                </span>
                {durationSec !== undefined && (
                    <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                        {durationSec}s
                    </span>
                )}
            </div>

            {/* Summary */}
            <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, marginBottom: 8 }}>
                {summary}
            </div>

            {/* Stats + Feedback Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {elementCount !== undefined && elementCount > 0 && (
                    <span style={{
                        fontSize: 10, fontWeight: 500, color: '#2DD4BF',
                        background: 'rgba(45,212,191,0.08)',
                        border: '1px solid rgba(45,212,191,0.12)',
                        padding: '2px 8px', borderRadius: 4,
                    }}>
                        {elementCount} {t('ai.elementsCreated') || 'elements'}
                    </span>
                )}

                {/* Feedback buttons — right-aligned */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <FeedbackBtn type="up" active={feedback === 'liked'} dimmed={feedback === 'disliked'}
                        onClick={() => handleFeedback('liked')} title={t('ai.feedbackLike') || 'Good result'} />
                    <FeedbackBtn type="down" active={feedback === 'disliked'} dimmed={feedback === 'liked'}
                        onClick={() => handleFeedback('disliked')} title={t('ai.feedbackDislike') || 'Needs improvement'} />
                </div>
            </div>

            {/* Feedback confirmation */}
            {feedback !== 'none' && skillPrompt !== 'asking' && (
                <div style={{
                    marginTop: 6, fontSize: 10, color: '#94a3b8',
                    fontStyle: 'italic', textAlign: 'right',
                }}>
                    {skillPrompt === 'saved'
                        ? (t('ai.skillSaved') || 'Saved as a reusable skill for future use.')
                        : feedback === 'liked'
                        ? (t('ai.feedbackThanks') || 'Thanks! This improves future designs.')
                        : (t('ai.feedbackNoted') || 'Noted. We will improve next time.')
                    }
                </div>
            )}

            {/* Skill promotion prompt */}
            {skillPrompt === 'asking' && (
                <div style={{
                    marginTop: 8, padding: '8px 10px',
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 8, fontSize: 11,
                }}>
                    <div style={{ color: '#334155', marginBottom: 6 }}>
                        {t('ai.saveAsSkill') || 'Save this action as a reusable skill?'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={handleSaveSkill} style={{
                            fontSize: 10, padding: '3px 10px', borderRadius: 4,
                            background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                            color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                        }}>
                            {t('common.save') || 'Save'}
                        </button>
                        <button onClick={() => setSkillPrompt('hidden')} style={{
                            fontSize: 10, padding: '3px 10px', borderRadius: 4,
                            background: 'rgba(0,0,0,0.04)', color: '#64748b',
                            border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer',
                        }}>
                            {t('common.skip') || 'Skip'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
