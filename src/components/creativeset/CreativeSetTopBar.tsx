// ─────────────────────────────────────────────────
// CreativeSetTopBar – Top navigation bar
// ─────────────────────────────────────────────────
import { useNavigate } from 'react-router-dom';

interface Props {
    setName: string;
    variantCount: number;
    onPublish?: () => void;
}

export function CreativeSetTopBar({ setName, variantCount, onPublish }: Props) {
    const navigate = useNavigate();

    return (
        <header className="cs-topbar">
            <div className="cs-topbar-left">
                <button className="cs-topbar-back" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                </button>
                <div className="cs-topbar-info">
                    <span className="cs-topbar-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg></span>
                    <span className="cs-topbar-name">{setName}</span>
                </div>
                <div className="cs-topbar-filters">
                    <select className="cs-topbar-select">
                        <option>All sizes</option>
                    </select>
                    <select className="cs-topbar-select">
                        <option>English</option>
                    </select>
                </div>
            </div>
            <div className="cs-topbar-right">
                <button className="cs-topbar-btn ghost" title="Notifications"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></button>
                <div className="cs-topbar-avatar">YA</div>
                <button className="cs-topbar-btn outline">
                    VIEW CAMPAIGNS ({variantCount})
                </button>
                <button className="cs-topbar-btn outline">
                    CONTENT & STYLING
                </button>
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
                        PUBLISH
                    </button>
                )}
                <button className="cs-topbar-btn icon" onClick={() => navigate('/dashboard')} title="Close">x</button>
            </div>
        </header>
    );
}
