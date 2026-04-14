// ─────────────────────────────────────────────────
// DashboardEmptyState — Premium first-run experience
// ─────────────────────────────────────────────────
// Shows 3 quick-start cards: Blank Canvas, AI Generate, Templates.
// Brand palette: Indigo → Mint gradient accents.
// ─────────────────────────────────────────────────

import { useAppI18n } from '@/i18n';

interface DashboardEmptyStateProps {
    onNewProject: () => void;
    onGoTemplates: () => void;
}

export function DashboardEmptyState({ onNewProject, onGoTemplates }: DashboardEmptyStateProps) {
    const { t } = useAppI18n();

    const cardBase: React.CSSProperties = {
        width: 180, padding: '20px 16px', borderRadius: 14,
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
    };

    const hoverIn = (borderColor: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.borderColor = borderColor;
        e.currentTarget.style.transform = 'translateY(-2px)';
    };
    const hoverOut = (borderColor: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.borderColor = borderColor;
        e.currentTarget.style.transform = 'translateY(0)';
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
        }}>
            {/* Hero icon */}
            <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(45,212,191,0.06))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                {t('dash.noProjectsYet')}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, maxWidth: 340, lineHeight: 1.5 }}>
                {t('dash.emptyStateDesc')}
            </p>

            {/* Quick-start cards */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Blank canvas */}
                <button onClick={onNewProject} style={{
                    ...cardBase, background: 'var(--bg-surface)', border: '1px solid var(--border)',
                }} onMouseEnter={hoverIn('#6366F1')} onMouseLeave={hoverOut('var(--border)')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#6366F1" strokeWidth="1.5"><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t('dash.blankCanvas')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{t('dash.blankCanvasHint')}</div>
                </button>

                {/* AI Generate */}
                <button onClick={onNewProject} style={{
                    ...cardBase,
                    background: 'linear-gradient(145deg, rgba(99,102,241,0.04), rgba(45,212,191,0.03))',
                    border: '1px solid rgba(99,102,241,0.15)',
                }} onMouseEnter={hoverIn('#2DD4BF')} onMouseLeave={hoverOut('rgba(99,102,241,0.15)')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(45,212,191,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2DD4BF" strokeWidth="1.5"><path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z" /></svg>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t('dash.aiGenerate')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{t('dash.aiGenerateHint')}</div>
                </button>

                {/* From Template */}
                <button onClick={onGoTemplates} style={{
                    ...cardBase, background: 'var(--bg-surface)', border: '1px solid var(--border)',
                }} onMouseEnter={hoverIn('#818cf8')} onMouseLeave={hoverOut('var(--border)')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(129,140,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#818cf8" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t('dash.fromTemplate')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{t('dash.fromTemplateHint')}</div>
                </button>
            </div>
        </div>
    );
}
