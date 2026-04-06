// ─────────────────────────────────────────────────
// SettingsConnections — Social/Ad account integrations
// ─────────────────────────────────────────────────

import { useState } from 'react';
import type { SocialAccount } from '@/services/publish/publishTypes';
import { Section, descStyle } from './settingsShared';

interface Props {
    accounts: SocialAccount[];
    loading: boolean;
    onConnect: (platform: string) => void;
    onDisconnect: (id: string) => void;
}

const igIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg>';
const fbIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
const googleIcon = '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';

const PLATFORMS = [
    { platform: 'instagram', label: 'Instagram', icon: igIcon },
    { platform: 'facebook', label: 'Facebook', icon: fbIcon },
    { platform: 'google_ads', label: 'Google Ads', icon: googleIcon },
] as const;

export function SettingsConnections({ accounts, loading, onConnect, onDisconnect }: Props) {
    return (
        <Section title="Connected Accounts">
            <p style={descStyle}>
                Link your ad and social accounts to publish directly from ACE
            </p>
            {loading ? (
                <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>Loading...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PLATFORMS.map(({ platform, label, icon }) => (
                        <IntegrationRow
                            key={platform}
                            label={label}
                            icon={icon}
                            account={accounts.find(a => a.platform === platform)}
                            onConnect={() => onConnect(platform)}
                            onDisconnect={onDisconnect}
                        />
                    ))}
                </div>
            )}
        </Section>
    );
}

function IntegrationRow({ label, icon, account, onConnect, onDisconnect }: {
    label: string; icon: string; account?: SocialAccount;
    onConnect: () => void; onDisconnect: (id: string) => void;
}) {
    const [disconnecting, setDisconnecting] = useState(false);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, width: 24, textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: icon }} />
                <div>
                    <div style={{ fontSize: 13, color: '#e5e5e7', fontWeight: 500 }}>{label}</div>
                    {account ? (
                        <div style={{ fontSize: 11, color: '#34c759' }}>{account.accountName || 'Connected'}</div>
                    ) : (
                        <div style={{ fontSize: 11, color: '#666' }}>Not connected</div>
                    )}
                </div>
            </div>
            {account ? (
                <button
                    onClick={async () => { setDisconnecting(true); await onDisconnect(account.id); setDisconnecting(false); }}
                    disabled={disconnecting}
                    style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)', color: '#ff6b6b', cursor: 'pointer' }}
                >
                    {disconnecting ? '...' : 'Disconnect'}
                </button>
            ) : (
                <button
                    onClick={onConnect}
                    style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(13,153,255,0.1)', border: '1px solid rgba(13,153,255,0.2)', color: '#0d99ff', cursor: 'pointer' }}
                >
                    Connect
                </button>
            )}
        </div>
    );
}
