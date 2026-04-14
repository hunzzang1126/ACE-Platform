// ─────────────────────────────────────────────────
// ResultPreviewCard — Inline preview after AI design completion
// ─────────────────────────────────────────────────
// Shows a success card with summary text and action chip.
// Brand palette: Mint accent for success state.
// ─────────────────────────────────────────────────

import { useAppI18n } from '@/i18n';

interface ResultPreviewCardProps {
    summary: string;
    elementCount?: number;
    durationSec?: number;
}

export function ResultPreviewCard({ summary, elementCount, durationSec }: ResultPreviewCardProps) {
    const { t } = useAppI18n();

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

            {/* Stats chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            </div>
        </div>
    );
}
