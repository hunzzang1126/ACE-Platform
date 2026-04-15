// ─────────────────────────────────────────────────
// DashboardEmptyState — Clean single-CTA first-run
// ─────────────────────────────────────────────────

import { useAppI18n } from '@/i18n';

interface Props {
    onNewProject: () => void;
}

export function DashboardEmptyState({ onNewProject }: Props) {
    const { t } = useAppI18n();

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '80px 24px', textAlign: 'center',
        }}>
            <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(45,212,191,0.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                {t('dash.noProjectsYet')}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, maxWidth: 320, lineHeight: 1.6 }}>
                {t('dash.emptyStateDescSimple')}
            </p>
            <button
                onClick={onNewProject}
                style={{
                    height: 44, padding: '0 28px',
                    background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(99,102,241,0.25)',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(99,102,241,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.25)'; }}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
                </svg>
                {t('dash.createFirstProject')}
            </button>
        </div>
    );
}
