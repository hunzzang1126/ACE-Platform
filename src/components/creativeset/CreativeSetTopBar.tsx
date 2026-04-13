// ─────────────────────────────────────────────────
// CreativeSetTopBar – Top navigation bar
// ─────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '@/components/editor/AuthModal';
import { useAppI18n } from '@/i18n';

interface Props {
    setName: string;
    onPublish?: () => void;
}

export function CreativeSetTopBar({ setName, onPublish }: Props) {
    const navigate = useNavigate();
    const [showAccount, setShowAccount] = useState(false);
    const { t } = useAppI18n();

    return (
        <>
            <header className="cs-topbar">
                <div className="cs-topbar-left">
                    <button className="cs-topbar-back" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                    </button>
                    <div className="cs-topbar-info">
                        <span className="cs-topbar-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg></span>
                        <span className="cs-topbar-name">{setName}</span>
                    </div>
                </div>
                <div className="cs-topbar-right">
                    <div className="cs-topbar-avatar" onClick={() => setShowAccount(true)} style={{ cursor: 'pointer' }}>YA</div>
                    {onPublish && (
                        <button
                            className="cs-topbar-btn"
                            onClick={onPublish}
                            style={{
                                background: 'linear-gradient(135deg, #0d99ff, #0077cc)',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 600,
                                padding: '6px 16px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 11,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="12" y1="19" x2="12" y2="5" />
                                <polyline points="5 12 12 5 19 12" />
                            </svg>
                            {t('size.publish')}
                        </button>
                    )}
                    <button className="cs-topbar-btn icon" onClick={() => navigate('/dashboard')} title="Close">x</button>
                </div>
            </header>
            {showAccount && <AuthModal onClose={() => setShowAccount(false)} />}
        </>
    );
}
