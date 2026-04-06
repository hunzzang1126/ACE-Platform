// ─────────────────────────────────────────────────
// SettingsAccount — Email, Plan, Sign Out
// ─────────────────────────────────────────────────

import type { User } from '@/stores/authStore';
import type { UserPrefs } from '@/stores/userPrefs';
import { Section } from './settingsShared';

interface Props {
    user: User | null;
    prefs: UserPrefs;
    onSignOut: () => void;
}

const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};

export function SettingsAccount({ user, prefs, onSignOut }: Props) {
    return (
        <>
            <Section title="Account Details">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div style={rowStyle}>
                        <span style={{ color: '#86868b', fontSize: 13 }}>Email</span>
                        <span style={{ color: '#c8c8cc', fontSize: 13 }}>{user?.email ?? '-'}</span>
                    </div>
                    <div style={rowStyle}>
                        <span style={{ color: '#86868b', fontSize: 13 }}>Plan</span>
                        <span style={{
                            fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                            background: user?.plan === 'starter' ? 'rgba(255,255,255,0.06)' : 'rgba(13,153,255,0.12)',
                            color: user?.plan === 'starter' ? '#86868b' : '#0d99ff',
                            textTransform: 'capitalize',
                        }}>
                            {user?.plan ?? 'starter'}
                        </span>
                    </div>
                    <div style={rowStyle}>
                        <span style={{ color: '#86868b', fontSize: 13 }}>Designs created</span>
                        <span style={{ color: '#c8c8cc', fontSize: 13 }}>{prefs.stats.totalDesigns}</span>
                    </div>
                </div>
            </Section>

            <button
                onClick={onSignOut}
                style={{
                    width: '100%', padding: '10px 16px', marginTop: 8,
                    borderRadius: 10, background: 'rgba(255, 59, 48, 0.08)',
                    border: '1px solid rgba(255, 59, 48, 0.15)',
                    color: '#ff6b6b', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                }}
            >
                Sign Out
            </button>
        </>
    );
}
